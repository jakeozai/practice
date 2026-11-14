/**
 * Prepare each subscriber's three jobs for a send date (2026-11-14 user
 * decision: every mail follows the person's own AI analysis strictly).
 *
 * Per subscriber with a profile: open jobs they haven't been sent → rules
 * (lib/match/fit.ts) rule out what doesn't fit and rank the rest → the model
 * picks three from the top and writes a reason and a first step for each
 * (lib/match/pick.ts) → digest_picks. Subscribers without a profile keep the
 * shared order (lib/workers/digest.ts).
 *
 * Runs in the 05:30–05:50 KST processing runs (/api/cron/process) and again
 * at the start of the 06:00 send for anyone still missing. A stored pick is
 * reused unless the profile changed after it, or one of its jobs closed or was
 * already sent. Model calls share the Gateway rate limit (lib/llm/pace.ts);
 * past `llmDeadline` the rest are picked by rules alone, so nobody waits.
 */
import type { ServiceClient } from "../supabase/service";
import { ProfileSchema, type Profile } from "../profile/parse";
import { createAnthropic, fastModelConfig } from "../llm/client";
import type { MessagesClient } from "../llm/extractJob";
import { createPacer, llmRequestsPerMinute, pacedClient, type Pacer } from "../llm/pace";
import { buildSignals, exclusionSummary, rankForProfile, type ProfileSignals, type Ranked } from "../match/fit";
import { choosePicks, PICK_POOL, STRETCH_POOL, type PickKind, type PickResult } from "../match/pick";
import { rankStretch, stretchPool, type StretchRanked } from "../match/stretch";
import type { Persona } from "../match/personas";
import { loadCandidatePool, type DigestJob } from "../digest/candidates";
import { chunks, pastDeadline, type RunOptions } from "./run";
import type { Json } from "../supabase/database.types";

const PAGE = 1000;
/** (제안값, 2026-11-14 user decision) "AI로 도전해 볼 일감" per mail, after the profile fits. */
export const STRETCH_SIZE = 2;

/** ANTHROPIC_MODEL_PICK (Gateway ID, e.g. google/gemini-2.5-flash) for picks; else the extraction model. */
export function pickModel(fastModel: string | null | undefined, env: string | undefined = process.env.ANTHROPIC_MODEL_PICK): string | null {
  return env?.trim() || fastModel || null;
}
/** Don't start a model call this close to `llmDeadline`. */
const LLM_MARGIN_MS = 30_000;

export type StoredPick = { jobIds: string[]; notes: PickResult["notes"]; subject: string | null; method: "llm" | "rules"; createdAt: string };

export type PickDetail = {
  user_id: string;
  method: "llm" | "rules";
  subject: string | null;
  picks: { id: string; kind: PickKind; title: string; title_ko: string | null; company: string; url: string; score: number; reason: string; today: string }[];
  /** Dry runs: the rule ranking the model chose from, and why the rest were left out. */
  top?: { title: string; score: number; hits: string[] }[];
  stretchTop?: { title: string; score: number; kind: string }[];
  excluded?: Record<string, number>;
  candidates?: number;
};

export type PicksResult = { users: number; kept: number; llm: number; rules: number; empty: number; skipped: number; details: PickDetail[] };

export async function loadSentJobIds(db: ServiceClient, userIds: string[]): Promise<Map<string, Set<string>>> {
  const sent = new Map<string, Set<string>>(userIds.map((u) => [u, new Set<string>()]));
  for (const ids of chunks(userIds, 100)) {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db
        .from("matches")
        .select("user_id, job_id")
        .in("user_id", ids)
        .order("user_id")
        .order("job_id")
        .range(from, from + PAGE - 1);
      if (error) throw new Error(`load matches: ${error.message}`);
      for (const m of data) sent.get(m.user_id)?.add(m.job_id);
      if (data.length < PAGE) break;
    }
  }
  return sent;
}

export async function loadStoredPicks(db: ServiceClient, sendDate: string, userIds: string[]): Promise<Map<string, StoredPick>> {
  const out = new Map<string, StoredPick>();
  for (const ids of chunks(userIds, 100)) {
    const { data, error } = await db.from("digest_picks").select("user_id, job_ids, notes, subject, method, created_at").eq("send_date", sendDate).in("user_id", ids);
    if (error) throw new Error(`load digest_picks: ${error.message}`);
    for (const row of data) {
      out.set(row.user_id, {
        jobIds: row.job_ids,
        notes: (row.notes ?? {}) as PickResult["notes"],
        subject: row.subject,
        method: row.method,
        createdAt: row.created_at,
      });
    }
  }
  return out;
}

type Subscriber = { user_id: string; profile: Profile; updatedAt: string };

async function loadSubscribers(db: ServiceClient, onlyUser?: string): Promise<{ subs: Subscriber[]; skipped: number }> {
  const subs: Subscriber[] = [];
  let skipped = 0;
  for (let from = 0; ; from += PAGE) {
    let q = db
      .from("profiles")
      .select("user_id, profile_json, updated_at")
      .eq("digest_status", "active")
      .not("profile_json", "is", null)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (onlyUser) q = q.eq("user_id", onlyUser);
    const { data, error } = await q;
    if (error) throw new Error(`load profiles: ${error.message}`);
    for (const row of data) {
      const p = ProfileSchema.safeParse(row.profile_json);
      if (p.success) subs.push({ user_id: row.user_id, profile: p.data, updatedAt: row.updated_at });
      else skipped++;
    }
    if (data.length < PAGE) return { subs, skipped };
  }
}

type ModelContext = { client: MessagesClient | null; model: string | null; fallbackModel: string | null; log: (line: string) => void };

/** One person's mail: rule ranking → stretch ranking → the model's (or the rules') choice. */
async function pickFor(
  profile: Profile,
  jobs: DigestJob[],
  opts: { size: number; stretchSize: number; now: Date; ctx: ModelContext },
): Promise<{ pick: PickResult; signals: ProfileSignals; ranked: Ranked<DigestJob>[]; stretchRanked: StretchRanked<DigestJob>[] }> {
  const signals = buildSignals(profile);
  const ranked = rankForProfile(jobs, signals, opts.now);
  const stretchRanked = rankStretch(jobs, signals, opts.now, new Set(ranked.slice(0, PICK_POOL).map((r) => r.job.id)));
  const pick = await choosePicks(ranked, profile, {
    size: opts.size,
    stretch: stretchPool(stretchRanked, STRETCH_POOL),
    stretchSize: opts.stretchSize,
    now: opts.now,
    client: opts.ctx.client,
    model: opts.ctx.model,
    fallbackModel: opts.ctx.fallbackModel,
    log: opts.ctx.log,
  });
  return { pick, signals, ranked, stretchRanked };
}

function detailOf(
  user_id: string,
  r: Awaited<ReturnType<typeof pickFor>>,
  jobs: DigestJob[],
  now: Date,
  dryRun: boolean,
): PickDetail {
  const byId = new Map<string, DigestJob>(jobs.map((j) => [j.id, j]));
  return {
    user_id,
    method: r.pick.method,
    subject: r.pick.subject,
    picks: r.pick.jobIds.map((id) => {
      const j = byId.get(id)!;
      const note = r.pick.notes[id];
      return { id, kind: note.kind, title: j.title, title_ko: j.title_ko, company: j.company, url: j.url, score: note.score, reason: note.reason, today: note.today };
    }),
    ...(dryRun
      ? {
          candidates: r.ranked.length,
          top: r.ranked.slice(0, 15).map((x) => ({ title: x.job.title_ko || x.job.title, score: x.score, hits: [...x.hits.map((h) => (h.section === "keywords" ? `검색어:${h.trigger}` : h.label)), ...x.tools] })),
          stretchTop: r.stretchRanked.slice(0, 12).map((x) => ({ title: x.job.title_ko || x.job.title, score: x.score, kind: x.kindLabel })),
          excluded: exclusionSummary(jobs, r.signals, now),
        }
      : {}),
  };
}

/** A stored pick still holds: made after the last profile change, every job still open and not yet sent. */
export function pickStillValid(stored: StoredPick | undefined, profileUpdatedAt: string, open: Set<string>, sent: Set<string>): boolean {
  if (!stored || stored.jobIds.length === 0) return false;
  if (new Date(stored.createdAt).getTime() < new Date(profileUpdatedAt).getTime()) return false;
  return stored.jobIds.every((id) => open.has(id) && !sent.has(id));
}

export async function preparePicks(
  db: ServiceClient,
  opts: RunOptions & {
    sendDate: string;
    /** Profile fits per mail. */
    size: number;
    /** AI stretches per mail (default STRETCH_SIZE; 0 turns them off). */
    stretchSize?: number;
    /** Model calls only before this (epoch ms); later subscribers get rule picks. Default: `deadline`. */
    llmDeadline?: number;
    pacer?: Pacer;
    onlyUser?: string;
    /** Compute and report, store nothing. */
    dryRun?: boolean;
    /** Recompute even when a stored pick still holds. */
    force?: boolean;
    now?: Date;
  },
): Promise<PicksResult> {
  const now = opts.now ?? new Date();
  const result: PicksResult = { users: 0, kept: 0, llm: 0, rules: 0, empty: 0, skipped: 0, details: [] };
  const { subs, skipped } = await loadSubscribers(db, opts.onlyUser);
  result.users = subs.length;
  result.skipped = skipped;
  if (subs.length === 0) return result;

  const pool = await loadCandidatePool(db);
  const open = new Set(pool.map((j) => j.id));
  const userIds = subs.map((s) => s.user_id);
  const [sentBy, stored] = await Promise.all([loadSentJobIds(db, userIds), loadStoredPicks(db, opts.sendDate, userIds)]);

  const llm = await fastModelConfig();
  const pacer = opts.pacer ?? createPacer(llmRequestsPerMinute());
  const client: MessagesClient | null = llm ? pacedClient(createAnthropic(llm) as unknown as MessagesClient, pacer) : null;
  const llmDeadline = opts.llmDeadline ?? opts.deadline;

  for (const sub of subs) {
    if (pastDeadline(opts.deadline, 5_000)) break;
    const sent = sentBy.get(sub.user_id) ?? new Set<string>();
    if (!opts.force && !opts.dryRun && pickStillValid(stored.get(sub.user_id), sub.updatedAt, open, sent)) {
      result.kept++;
      continue;
    }

    const fresh = pool.filter((j) => !sent.has(j.id));
    const modelOk = client && llm && (llmDeadline === undefined || pacer.nextSlotAt() < llmDeadline - LLM_MARGIN_MS);
    const r = await pickFor(sub.profile, fresh, {
      size: opts.size,
      stretchSize: opts.stretchSize ?? STRETCH_SIZE,
      now,
      // Choosing and writing for one person a day earns a stronger model than per-posting extraction.
      ctx: { client: modelOk ? client : null, model: pickModel(llm?.model), fallbackModel: llm?.model ?? null, log: opts.log },
    });
    const pick = r.pick;

    if (pick.jobIds.length === 0) result.empty++;
    else result[pick.method]++;

    if (!opts.dryRun && pick.jobIds.length > 0) {
      const { error } = await db.from("digest_picks").upsert(
        {
          user_id: sub.user_id,
          send_date: opts.sendDate,
          job_ids: pick.jobIds,
          notes: pick.notes as unknown as Json,
          subject: pick.subject,
          method: pick.method,
          created_at: new Date().toISOString(),
        },
        { onConflict: "user_id,send_date" },
      );
      if (error) throw new Error(`save digest_picks: ${error.message}`);
    }

    result.details.push(detailOf(sub.user_id, r, fresh, now, Boolean(opts.dryRun)));
  }

  opts.log(
    `picks ${opts.sendDate}: ${result.users} subscribers with a profile → model ${result.llm}, rules ${result.rules}, kept ${result.kept}, nothing fits ${result.empty}` +
      (result.skipped ? `, unreadable profile ${result.skipped}` : "") +
      (opts.dryRun ? " (dry run, nothing stored)" : ""),
  );
  return result;
}

/**
 * Dry run for made-up subscribers of different kinds (lib/match/personas.ts)
 * against today's open jobs: what each would get, with the same rules, model
 * and prompt as real subscribers. Nothing is stored or sent.
 */
export async function previewPersonas(
  db: ServiceClient,
  personas: Persona[],
  opts: { log: (line: string) => void; size: number; stretchSize?: number; now?: Date },
): Promise<(PickDetail & { label: string })[]> {
  const now = opts.now ?? new Date();
  const pool = await loadCandidatePool(db);
  const llm = await fastModelConfig();
  const client: MessagesClient | null = llm ? pacedClient(createAnthropic(llm) as unknown as MessagesClient, createPacer(llmRequestsPerMinute())) : null;
  const ctx: ModelContext = { client, model: pickModel(llm?.model), fallbackModel: llm?.model ?? null, log: opts.log };
  return Promise.all(
    personas.map(async (p) => {
      const r = await pickFor(p.profile, pool, { size: opts.size, stretchSize: opts.stretchSize ?? STRETCH_SIZE, now, ctx });
      return { ...detailOf(`persona:${p.id}`, r, pool, now, true), label: p.label };
    }),
  );
}
