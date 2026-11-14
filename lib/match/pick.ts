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

/**
 * (제안값) How many of the best rule-ranked jobs the model chooses from. Kept
 * small: given 12, the model (2026-11-14 dry run) put a 9th-ranked "founding
 * engineer" job first over seven better video fits, so the rules decide which
 * jobs are in play and the model only chooses among the strongest and writes.
 */
export const PICK_POOL = 6;
export const REASON_MAX = 90;
export const TODAY_MAX = 80;
export const SUBJECT_MAX = 40;
const PICK_ATTEMPTS = 2;

export type PickJob = FitJob & { company: string; engagement?: string | null };

export type PickResult = {
  jobIds: string[];
  notes: Record<string, PickNote & { score: number }>;
  subject: string | null;
  method: "llm" | "rules";
};

const PickWire = z.object({
  picks: z.array(z.object({ id: z.string(), reason_ko: z.string(), today_ko: z.string() })),
  subject_ko: z.string(),
});

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

export function pickMessage(profile: Profile, pool: Ranked<PickJob>[], now: Date): string {
  const lines = pool.map((r, i) => {
    const j = r.job;
    const chip = j.category && j.category !== "other" ? CATEGORY_CHIP_KO[j.category as keyof typeof CATEGORY_CHIP_KO] : null;
    const facts = [
      `보수: ${formatPay(j) ?? "원문에서 확인"}`,
      `주당 시간: ${j.hours_per_week_min ? `${j.hours_per_week_min}시간부터` : "정보 없음"}`,
      `작업 언어: ${j.languages.map(languageNameKo).join(", ") || "정보 없음"}`,
      `영어: ${j.english_level ? ENGLISH_LEVEL_LABELS_KO[j.english_level] : "언급 없음"}`,
      `지원 방식: ${isBiddingGig(j.url) ? "견적 입찰(경쟁)" : "플랫폼에서 지원"}`,
      `올라온 지: ${ageLabel(j.first_seen_at, now)}`,
    ].join(" · ");
    const overlap = [...r.hits.map((h) => `${h.label}(‘${clean(h.trigger, 30)}’)`), ...r.tools].join(", ");
    return [
      `[c${i + 1}] ${clean(j.title_ko || j.title, 80)} (원제: ${clean(j.title, 100)}) · ${clean(j.company, 40)}${chip ? ` · ${chip}` : ""}`,
      `- 요약: ${j.summary_ko.map((s) => clean(s, 120)).join(" / ")}`,
      `- ${facts}`,
      `- 프로필과 겹치는 점(규칙 판정): ${overlap || "없음"}`,
    ].join("\n");
  });
  return `<profile>\n${JSON.stringify(profileForModel(profile), null, 1)}\n</profile>\n\n<candidates>\n${lines.join("\n\n")}\n</candidates>`;
}

function trimTo(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

export type ParsedPick = { picks: { index: number; reason: string; today: string }[]; subject: string | null };

/** Strict read of the model's answer against this pool (unknown or repeated ids dropped). */
export function parsePick(text: string, poolSize: number, size: number): ParsedPick | null {
  const json = text.trim().replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "");
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  const r = PickWire.safeParse(raw);
  if (!r.success) return null;
  const seen = new Set<number>();
  const picks: ParsedPick["picks"] = [];
  for (const p of r.data.picks) {
    const m = /^c(\d+)$/.exec(p.id.trim());
    const index = m ? Number(m[1]) - 1 : -1;
    if (index < 0 || index >= poolSize || seen.has(index)) continue;
    const reason = trimTo(p.reason_ko, REASON_MAX);
    const today = trimTo(p.today_ko, TODAY_MAX);
    if (!reason || !today) continue;
    seen.add(index);
    picks.push({ index, reason, today });
    if (picks.length === size) break;
  }
  if (picks.length === 0) return null;
  const subject = trimTo(r.data.subject_ko, SUBJECT_MAX);
  return { picks, subject: subject || null };
}

/** Subject line when the model didn't write one. */
export function ruleSubject(profile: Profile, count: number): string {
  const focus = profile.fields[0]?.split(/[·(,]/)[0]?.trim();
  return focus ? trimTo(`${focus}에 맞춘 오늘의 일감 ${count}개`, SUBJECT_MAX) : `오늘의 일감 ${count}개`;
}

export async function choosePicks(
  ranked: Ranked<PickJob>[],
  profile: Profile,
  opts: { size: number; now?: Date; client?: MessagesClient | null; model?: string | null; log?: (line: string) => void },
): Promise<PickResult> {
  const now = opts.now ?? new Date();
  const pool = ranked.slice(0, PICK_POOL);
  const empty: PickResult = { jobIds: [], notes: {}, subject: null, method: "rules" };
  if (pool.length === 0) return empty;

  let parsed: ParsedPick | null = null;
  if (opts.client && opts.model) {
    for (let attempt = 1; attempt <= PICK_ATTEMPTS && !parsed; attempt++) {
      try {
        const message = await opts.client.messages.create({
          model: opts.model,
          max_tokens: 1500,
          system: digestPickPrompt(),
          messages: [{ role: "user", content: pickMessage(profile, pool, now) }],
          output_config: { format: zodOutputFormat(PickWire) },
        });
        parsed = parsePick(firstText(message), pool.length, opts.size);
        if (!parsed) opts.log?.(`    ! pick: invalid model output (attempt ${attempt})`);
      } catch (e) {
        opts.log?.(`    ! pick: ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`);
        if (isServiceFailure(e)) break; // the SDK already retried; rules take over
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
  return {
    jobIds: chosen.map((c) => c.r.job.id),
    notes: Object.fromEntries(chosen.map((c) => [c.r.job.id, { ...c.note, score: c.r.score }])),
    subject: parsed?.subject ?? ruleSubject(profile, chosen.length),
    method: parsed ? "llm" : "rules",
  };
}
