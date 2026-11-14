/**
 * The final three for one person (2026-11-14 user decision): the model reads
 * the profile their own AI wrote and the top of the rule ranking
 * (lib/match/fit.ts), picks the three they'd most want to do today, and writes
 * a reason and a first step for each, plus the subject line.
 *
 * One LLM call per subscriber per day (CLAUDE.md rule 10, revised). Only the
 * validated profile and our Korean summaries go to the model, never posting
 * text or the pasted AI answer (rules 1–3). Output is zod-checked; picks the
 * model doesn't make, or any failure, fall back to the rule order and
 * rule-written notes, so a mail always goes out.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { Profile } from "../profile/parse";
import { CATEGORY_CHIP_KO, ENGLISH_LEVEL_LABELS_KO, formatPay, isBiddingGig } from "../jobs/format";
import { languageNameKo } from "../jobs/language";
import { firstText } from "../llm/client";
import { isServiceFailure, type MessagesClient } from "../llm/extractJob";
import { ruleNote, type FitJob, type PickNote, type Ranked } from "./fit";
import type { StretchRanked } from "./stretch";

/**
 * (제안값) How many of the best rule-ranked jobs the model chooses from. Kept
 * small: given 12, the model (2026-11-14 dry run) put a 9th-ranked "founding
 * engineer" job first over seven better video fits, so the rules decide which
 * jobs are in play and the model only chooses among the strongest and writes.
 */
export const PICK_POOL = 6;
/** (제안값) How many AI-stretch candidates (lib/match/stretch.ts) the model chooses from. */
export const STRETCH_POOL = 6;
export const REASON_MAX = 90;
export const TODAY_MAX = 80;
export const SUBJECT_MAX = 40;
const PICK_ATTEMPTS = 2;
/**
 * Room for the answer after any reasoning the model does first: Gemini 2.5
 * Flash thinks before answering and ran out of a 1,500-token cap (2026-11-14).
 */
export const PICK_MAX_TOKENS = 8000;

export type PickJob = FitJob & { company: string; engagement?: string | null };

export type PickKind = "core" | "stretch";

export type PickResult = {
  /** Profile fits first, then AI stretches. */
  jobIds: string[];
  notes: Record<string, PickNote & { score: number; kind: PickKind }>;
  subject: string | null;
  method: "llm" | "rules";
};

const PickItem = z.object({ id: z.string(), reason_ko: z.string(), today_ko: z.string() });
/** Sent to the API as the output format. */
const PickWire = z.object({ picks: z.array(PickItem), stretch: z.array(PickItem), subject_ko: z.string() });
/** What we accept back (an answer without a stretch list is still usable). */
const PickRead = PickWire.extend({ stretch: z.array(PickItem).optional() });

let cachedPrompt: string | null = null;
export function digestPickPrompt(): string {
  cachedPrompt ??= readFileSync(join(process.cwd(), "prompts", "digest-pick.md"), "utf8");
  return cachedPrompt;
}

/** Candidate text is data: no tags, no line noise. */
function clean(s: string | null | undefined, max = 160): string {
  return (s ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

function ageLabel(firstSeenAt: string, now: Date): string {
  const h = Math.max(0, Math.round((now.getTime() - new Date(firstSeenAt).getTime()) / 3_600_000));
  return h < 24 ? `${h}시간 전` : `${Math.round(h / 24)}일 전`;
}

/** What the model sees: the validated profile only (never the pasted AI answer). */
export function profileForModel(p: Profile) {
  return {
    fields: p.fields,
    notes_ko: p.notes_ko,
    domain_expertise: p.domain_expertise,
    skills: p.skills,
    experience_summary_ko: p.experience_summary_ko,
    avoid: p.avoid,
    languages: p.languages,
    weekly_hours: p.weekly_hours,
    preferred_time: p.preferred_time,
    min_hourly_usd: p.min_hourly_usd,
  };
}

function jobLines(id: string, j: PickJob, now: Date, extra: string): string {
  const chip = j.category && j.category !== "other" ? CATEGORY_CHIP_KO[j.category as keyof typeof CATEGORY_CHIP_KO] : null;
  const facts = [
    `보수: ${formatPay(j) ?? "원문에서 확인"}`,
    `주당 시간: ${j.hours_per_week_min ? `${j.hours_per_week_min}시간부터` : "정보 없음"}`,
    `작업 언어: ${j.languages.map(languageNameKo).join(", ") || "정보 없음"}`,
    `영어: ${j.english_level ? ENGLISH_LEVEL_LABELS_KO[j.english_level] : "언급 없음"}`,
    `지원 방식: ${isBiddingGig(j.url) ? "견적 입찰(경쟁)" : "플랫폼에서 지원"}`,
    `올라온 지: ${ageLabel(j.first_seen_at, now)}`,
  ].join(" · ");
  return [
    `[${id}] ${clean(j.title_ko || j.title, 80)} (원제: ${clean(j.title, 100)}) · ${clean(j.company, 40)}${chip ? ` · ${chip}` : ""}`,
    `- 요약: ${j.summary_ko.map((s) => clean(s, 120)).join(" / ")}`,
    `- ${facts}`,
    extra,
  ].join("\n");
}

export function pickMessage(profile: Profile, pool: Ranked<PickJob>[], now: Date, stretch: StretchRanked<PickJob>[] = []): string {
  const lines = pool.map((r, i) => {
    const overlap = [...r.hits.map((h) => `${h.label}(‘${clean(h.trigger, 30)}’)`), ...r.tools].join(", ");
    return jobLines(`c${i + 1}`, r.job, now, `- 프로필과 겹치는 점(규칙 판정): ${overlap || "없음"}`);
  });
  const stretchLines = stretch.map((r, i) => jobLines(`s${i + 1}`, r.job, now, `- 종류: ${r.kindLabel} · AI로 하는 방법(제안): ${r.aiHow}`));
  return (
    `<profile>\n${JSON.stringify(profileForModel(profile), null, 1)}\n</profile>\n\n<candidates>\n${lines.join("\n\n")}\n</candidates>` +
    `\n\n<stretch_candidates>\n${stretchLines.join("\n\n") || "(없음)"}\n</stretch_candidates>`
  );
}

/** Collapse spaces; past `max`, cut at the last word boundary so a mail never shows half a word. */
function trimTo(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,\s]+$/, "")}…`;
}

/** Money in a "today" line is either repeated from the card or wrong (2026-11-14: one job's budget copied onto another). */
const MONEY = /\$\s?\d|\d[\d,.]*\s?(?:USD|INR|EUR|GBP|AUD|CAD|NZD|달러|원|루피|유로)|(?:USD|INR|EUR|GBP|AUD|CAD|NZD)\s?\d/i;

type ParsedItem = { index: number; reason: string; today: string };
export type ParsedPick = { picks: ParsedItem[]; stretch: ParsedItem[]; subject: string | null };

/** Valid, unique ids of one list ("c1", "s2"…) in the model's order; a first step that names a sum is dropped. */
function readItems(items: z.infer<typeof PickItem>[], prefix: string, poolSize: number, size: number): ParsedItem[] {
  const seen = new Set<number>();
  const out: ParsedItem[] = [];
  for (const p of items) {
    const m = new RegExp(`^${prefix}(\\d+)$`).exec(p.id.trim());
    const index = m ? Number(m[1]) - 1 : -1;
    if (index < 0 || index >= poolSize || seen.has(index)) continue;
    const reason = trimTo(p.reason_ko, REASON_MAX);
    const today = trimTo(p.today_ko, TODAY_MAX);
    if (!reason || !today || MONEY.test(today)) continue;
    seen.add(index);
    out.push({ index, reason, today });
    if (out.length === size) break;
  }
  return out;
}

/** Strict read of the model's answer against these pools (unknown or repeated ids dropped). */
export function parsePick(text: string, poolSize: number, size: number, stretchPoolSize = 0, stretchSize = 0): ParsedPick | null {
  const json = text.trim().replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "");
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  const r = PickRead.safeParse(raw);
  if (!r.success) return null;
  const picks = readItems(r.data.picks, "c", poolSize, size);
  const stretch = readItems(r.data.stretch ?? [], "s", stretchPoolSize, stretchSize);
  if (picks.length === 0 && stretch.length === 0) return null;
  const subject = trimTo(r.data.subject_ko, SUBJECT_MAX);
  return { picks, stretch, subject: subject || null };
}

/** Reason and first step for a stretch the model didn't write. */
export function ruleStretchNote(r: StretchRanked<PickJob>): PickNote {
  return {
    reason: trimTo(`${r.kindLabel}: ${r.aiHow}로 도전해 볼 만해요`, REASON_MAX),
    today: isBiddingGig(r.job.url) ? "오늘 1시간: AI로 시안 1개를 만들어 첨부하고 견적 입찰해요" : "오늘 1시간: AI로 샘플 1개를 만들어 지원서에 붙여 제출해요",
  };
}

/** Subject line when the model didn't write one. */
export function ruleSubject(profile: Profile, count: number): string {
  const focus = profile.fields[0]?.split(/[·(,]/)[0]?.trim();
  return focus ? trimTo(`${focus}에 맞춘 오늘의 일감 ${count}개`, SUBJECT_MAX) : `오늘의 일감 ${count}개`;
}

export async function choosePicks(
  ranked: Ranked<PickJob>[],
  profile: Profile,
  opts: {
    size: number;
    now?: Date;
    client?: MessagesClient | null;
    model?: string | null;
    /** Tried when `model` can't be used (e.g. not on this Gateway plan). */
    fallbackModel?: string | null;
    /** AI-stretch candidates, best first (lib/match/stretch.ts, already pooled). */
    stretch?: StretchRanked<PickJob>[];
    stretchSize?: number;
    log?: (line: string) => void;
  },
): Promise<PickResult> {
  const now = opts.now ?? new Date();
  const pool = ranked.slice(0, PICK_POOL);
  const stretchSize = opts.stretchSize ?? 0;
  const sPool = stretchSize > 0 ? (opts.stretch ?? []).slice(0, STRETCH_POOL) : [];
  const empty: PickResult = { jobIds: [], notes: {}, subject: null, method: "rules" };
  if (pool.length === 0) return empty;

  let parsed: ParsedPick | null = null;
  const models = [...new Set([opts.model, opts.fallbackModel].filter((m): m is string => Boolean(m)))];
  for (const model of opts.client ? models : []) {
    if (parsed) break;
    for (let attempt = 1; attempt <= PICK_ATTEMPTS && !parsed; attempt++) {
      try {
        const message = await opts.client!.messages.create({
          model,
          max_tokens: PICK_MAX_TOKENS,
          system: digestPickPrompt(),
          messages: [{ role: "user", content: pickMessage(profile, pool, now, sPool) }],
          output_config: { format: zodOutputFormat(PickWire) },
        });
        const text = firstText(message);
        parsed = parsePick(text, pool.length, opts.size, sPool.length, stretchSize);
        if (!parsed) {
          const stop = (message as { stop_reason?: string }).stop_reason ?? "?";
          opts.log?.(`    ! pick (${model}): invalid model output (attempt ${attempt}, stop ${stop}, ${text.length} chars): ${text.slice(0, 160)}`);
        }
      } catch (e) {
        opts.log?.(`    ! pick (${model}): ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`);
        if (isServiceFailure(e)) break; // the SDK already retried; the next model or the rules take over
      }
    }
  }

  const chosen: { r: Ranked<PickJob>; note: PickNote }[] = (parsed?.picks ?? []).map((p) => ({
    r: pool[p.index],
    note: { reason: p.reason, today: p.today },
  }));
  // Fill what the model left out with the rule order, so the mail still has `size` jobs that fit.
  for (const r of pool) {
    if (chosen.length >= opts.size) break;
    if (!chosen.some((c) => c.r.job.id === r.job.id)) chosen.push({ r, note: ruleNote(r, profile, now) });
  }

  // Strongest fit first: the profile's field order, as scored by the rules.
  chosen.sort((a, b) => b.r.score - a.r.score);

  const stretched: { r: StretchRanked<PickJob>; note: PickNote }[] = (parsed?.stretch ?? []).map((p) => ({
    r: sPool[p.index],
    note: { reason: p.reason, today: p.today },
  }));
  for (const r of sPool) {
    if (stretched.length >= stretchSize) break;
    if (!stretched.some((c) => c.r.job.id === r.job.id)) stretched.push({ r, note: ruleStretchNote(r) });
  }
  stretched.sort((a, b) => b.r.score - a.r.score);

  return {
    jobIds: [...chosen.map((c) => c.r.job.id), ...stretched.map((c) => c.r.job.id)],
    notes: Object.fromEntries([
      ...chosen.map((c) => [c.r.job.id, { ...c.note, score: c.r.score, kind: "core" as const }]),
      ...stretched.map((c) => [c.r.job.id, { ...c.note, score: c.r.score, kind: "stretch" as const }]),
    ]),
    subject: parsed?.subject ?? ruleSubject(profile, chosen.length),
    method: parsed && parsed.picks.length > 0 ? "llm" : "rules",
  };
}
