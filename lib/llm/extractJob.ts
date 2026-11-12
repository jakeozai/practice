/**
 * One LLM call per posting: structured extraction + Korean summary (spec §8
 * step 2, CLAUDE.md rules 3, 4, 10). The posting is data inside <posting>
 * tags; the response is validated with zod, retried once, then given up on.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { SCAM_SIGNALS } from "../scam";

/** permanent = open-ended staff hiring, which 덕잡 doesn't send (short-term work only). */
export const ENGAGEMENTS = ["freelance", "contract", "part_time", "permanent"] as const;
import { firstText } from "./client";

export const POSTING_BODY_MAX_CHARS = 12_000;
/** Summary line limit. The prompt asks for 60; a little slack avoids needless review-queue fallbacks. */
export const SUMMARY_LINE_MAX = 80;
/** Korean title limit (jobs.title_ko check allows 60). */
export const TITLE_KO_MAX = 40;

const nullableNumber = z.number().nullable();

/** Structural schema sent to the API as the output format. */
const JobExtractWire = z.object({
  company: z.string(),
  title: z.string(),
  title_ko: z.string(),
  category: z.enum(["language", "domain", "labeling", "other"]),
  languages: z.array(z.string()),
  location_raw: z.string().nullable(),
  korea_eligible: z.boolean().nullable(),
  requires_credential: z.boolean(),
  pay_min: nullableNumber,
  pay_max: nullableNumber,
  pay_currency: z.string().nullable(),
  pay_unit: z.enum(["hour", "task", "project", "month"]).nullable(),
  hours_per_week_min: nullableNumber,
  english_level: z.enum(["none", "reading", "conversational", "business", "native"]).nullable(),
  is_talent_pool: z.boolean(),
  ai_related: z.boolean(),
  engagement: z.enum(ENGAGEMENTS),
  scam_signals: z.array(z.enum(SCAM_SIGNALS)),
  summary_ko: z.array(z.string()),
});

/** What we accept after the call (CLAUDE.md rule 4). */
export const JobExtractSchema = JobExtractWire.extend({
  company: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  /** The prompt asks for 25 characters; the DB allows 60. */
  title_ko: z.string().trim().min(1).max(TITLE_KO_MAX),
  languages: z
    .array(z.string().trim().toLowerCase())
    .transform((ls) => [...new Set(ls.filter((l) => /^[a-z]{2}$/.test(l)))].slice(0, 5)),
  location_raw: z.string().trim().max(300).nullable(),
  pay_min: z.number().min(0).max(100_000).nullable(),
  pay_max: z.number().min(0).max(100_000).nullable(),
  pay_currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/)
    .nullable(),
  hours_per_week_min: z.number().int().min(1).max(80).nullable(),
  summary_ko: z.array(z.string().trim().min(1).max(SUMMARY_LINE_MAX)).length(3),
}).refine((j) => j.pay_min === null || j.pay_max === null || j.pay_min <= j.pay_max, { path: ["pay_max"] });

export type JobExtract = z.output<typeof JobExtractSchema>;

export type PostingInput = { title: string | null; location_raw: string | null; body: string | null };

/** User message per spec §8. A literal closing tag inside the posting can't end the data block. */
export function postingMessage(p: PostingInput): string {
  const clean = (s: string | null) => (s ?? "").replace(/<\/?posting>/gi, (t) => t.replace("posting", "posting​"));
  return `<posting>\n제목: ${clean(p.title)}\n지역: ${clean(p.location_raw) || "(없음)"}\n본문:\n${clean(p.body).slice(0, POSTING_BODY_MAX_CHARS)}\n</posting>`;
}

let cachedPrompt: string | null = null;
export function jobExtractPrompt(): string {
  cachedPrompt ??= readFileSync(join(process.cwd(), "prompts", "job-extract.md"), "utf8");
  return cachedPrompt;
}

/** Strict parse of the model's text output. */
export function parseExtraction(text: string): { ok: true; data: JobExtract } | { ok: false; error: string } {
  const json = text
    .trim()
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```\s*$/, "");
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: "not JSON" };
  }
  const r = JobExtractSchema.safeParse(raw);
  return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error.issues.map((i) => i.path.join(".")).join(",") };
}

/** Minimal surface of the Anthropic client we use (so tests can pass a fake). */
export type MessagesClient = {
  messages: { create: (params: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text?: string }> }> };
};

export const EXTRACT_ATTEMPTS = 2; // 1 call + 1 retry (CLAUDE.md rule 4)

/**
 * True when the call failed because the model service can't be used right now
 * (auth, plan, quota, rate limit, outage, network) rather than because of this
 * posting. Such postings stay unprocessed for the next run (spec §8) instead of
 * landing in the review queue without a summary. 400/422 are about the request,
 * so they count as this posting's failure.
 */
export function isServiceFailure(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const status = (e as { status?: unknown }).status;
  if (typeof status === "number") return status !== 400 && status !== 422;
  return e.name === "APIConnectionError" || e.name === "APIConnectionTimeoutError";
}

export async function extractJob(
  client: MessagesClient,
  model: string,
  posting: PostingInput,
): Promise<
  { ok: true; data: JobExtract; calls: number } | { ok: false; error: string; calls: number; unavailable: boolean }
> {
  let lastError = "";
  for (let attempt = 1; attempt <= EXTRACT_ATTEMPTS; attempt++) {
    try {
      const message = await client.messages.create({
        model,
        max_tokens: 1500,
        system: jobExtractPrompt(),
        messages: [{ role: "user", content: postingMessage(posting) }],
        output_config: { format: zodOutputFormat(JobExtractWire) },
      });
      const parsed = parseExtraction(firstText(message));
      if (parsed.ok) return { ok: true, data: parsed.data, calls: attempt };
      lastError = `invalid output (${parsed.error})`;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      // The SDK already retried 429/5xx; another attempt won't help, and the posting isn't at fault.
      if (isServiceFailure(e)) return { ok: false, error: lastError, calls: attempt, unavailable: true };
    }
  }
  return { ok: false, error: lastError, calls: EXTRACT_ATTEMPTS, unavailable: false };
}
