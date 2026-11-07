/**
 * Validation for /admin/jobs/new (Phase 0 manual registration).
 * Input is FormData-shaped (all strings); output is a jobs insert.
 */
import { z } from "zod";
import { createHash } from "node:crypto";
import { normalizeTitle } from "./format";
import type { Database } from "../supabase/database.types";

type JobInsert = Database["public"]["Tables"]["jobs"]["Insert"];

const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(blankToNull, z.enum(values).nullable().default(null));

const optionalNumber = (min: number, max: number) =>
  z.preprocess(
    (v) => (blankToNull(v) === null || v === undefined ? null : Number(v)),
    z.number({ error: "숫자로 입력해 주세요." }).min(min).max(max).nullable(),
  );

export const SUMMARY_LINE_MAX = 60;

export const ManualJobSchema = z
  .object({
    company: z.string().trim().min(1, "회사를 입력해 주세요.").max(100),
    title: z.string().trim().min(1, "제목을 입력해 주세요.").max(200),
    url: z
      .string()
      .trim()
      .pipe(z.url({ protocol: /^https?$/, error: "http(s) 원문 주소를 입력해 주세요." })),
    summary_ko: z
      .string()
      .transform((s) =>
        s
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
      )
      .pipe(
        z
          .array(z.string().max(SUMMARY_LINE_MAX, `요약은 줄마다 ${SUMMARY_LINE_MAX}자 이내로 써 주세요.`))
          .min(1, "한국어 요약을 1~3줄 써 주세요.")
          .max(3, "요약은 3줄까지예요."),
      ),
    category: optionalEnum(["language", "domain", "labeling", "other"] as const),
    languages: z
      .string()
      .default("")
      .transform((s) => [
        ...new Set(
          s
            .split(/[,\s]+/)
            .map((x) => x.trim().toLowerCase())
            .filter(Boolean),
        ),
      ])
      .pipe(z.array(z.string().regex(/^[a-z]{2}$/, "언어는 ko, en 같은 두 글자 코드로 써 주세요.")).max(5)),
    requires_credential: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
    korea_eligible: z.preprocess(
      (v) => (v === "true" ? true : v === "false" ? false : null),
      z.boolean().nullable(),
    ),
    eligibility_note: z.preprocess(blankToNull, z.string().trim().max(200).nullable().default(null)),
    pay_min: optionalNumber(0, 100_000),
    pay_max: optionalNumber(0, 100_000),
    pay_currency: z.preprocess(
      blankToNull,
      z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{3}$/, "통화는 USD 같은 세 글자 코드로 써 주세요.")
        .nullable()
        .default(null),
    ),
    pay_unit: optionalEnum(["hour", "task", "project", "month"] as const),
    hours_per_week_min: optionalNumber(1, 80).refine((n) => n === null || Number.isInteger(n), "정수로 입력해 주세요."),
    english_level: optionalEnum(["none", "reading", "conversational", "business", "native"] as const),
    status: z.enum(["open", "pool", "unknown"]).default("open"),
  })
  .refine((j) => j.pay_min === null || j.pay_max === null || j.pay_min <= j.pay_max, {
    path: ["pay_max"],
    error: "최대 보수가 최소 보수보다 작아요.",
  });

export type ManualJobInput = z.output<typeof ManualJobSchema>;

export function toJobInsert(j: ManualJobInput, rawPostingId: string, now: Date): JobInsert {
  const hasPay = j.pay_min !== null || j.pay_max !== null;
  return {
    raw_posting_id: rawPostingId,
    company: j.company,
    title: j.title,
    title_normalized: normalizeTitle(j.title),
    url: j.url,
    summary_ko: j.summary_ko,
    category: j.category,
    languages: j.languages,
    requires_credential: j.requires_credential,
    korea_eligible: j.korea_eligible,
    eligibility_note: j.eligibility_note,
    pay_min: j.pay_min,
    pay_max: j.pay_max,
    pay_currency: hasPay ? (j.pay_currency ?? "USD") : null,
    pay_unit: hasPay ? j.pay_unit : null,
    hours_per_week_min: j.hours_per_week_min,
    english_level: j.english_level,
    status: j.status,
    // Entered and checked by an admin, so it is approved on creation.
    review_state: "approved",
    reviewed_at: now.toISOString(),
    first_seen_at: now.toISOString(),
    last_seen_at: now.toISOString(),
  };
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/**
 * raw_postings row for a manual job. No body is stored. external_id is the URL
 * hash so the same URL can't be registered twice; processed_hash = body_hash
 * keeps process-postings.ts from picking it up.
 */
export function manualRawPosting(j: ManualJobInput, sourceId: string) {
  const bodyHash = sha256(`manual:${j.url}`);
  return {
    source_id: sourceId,
    external_id: sha256(j.url),
    url: j.url,
    title: j.title,
    location_raw: j.eligibility_note,
    body: null,
    body_hash: bodyHash,
    processed_hash: bodyHash,
  };
}
