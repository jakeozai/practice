/**
 * Mail feedback (spec §2.2, §11 /feedback): "관심 없어요" and "신고".
 * The mail link only opens a confirmation page; the page's buttons POST here
 * (CLAUDE.md rule 8: a GET from a mail link never changes state).
 */
import { z } from "zod";

/** Report reasons shown as choices; the key is stored in reports.reason. */
export const REPORT_REASONS = {
  not_in_korea: "한국에서는 지원할 수 없어요",
  closed: "이미 마감됐어요",
  scam: "사기 같아요 (돈 요구, 메신저로만 연락 등)",
  ai_banned: "AI 사용을 금지한 일이에요",
  wrong_info: "요약·보수 정보가 틀려요",
  other: "기타",
} as const;
export type ReportReason = keyof typeof REPORT_REASONS;

export const FeedbackFormSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("not_interested") }),
  z.object({
    action: z.literal("report"),
    reason: z.enum(Object.keys(REPORT_REASONS) as [ReportReason, ...ReportReason[]]),
    note: z.string().trim().max(300).optional().default(""),
  }),
]);
export type FeedbackForm = z.infer<typeof FeedbackFormSchema>;

/** reports.reason (≤500 chars): the reason key, plus the user's note if any. */
export function reportText(form: Extract<FeedbackForm, { action: "report" }>): string {
  return form.note ? `${form.reason}: ${form.note}` : form.reason;
}

/** Form fields → object for the schema (empty strings dropped). */
export function formToObject(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of ["action", "reason", "note"]) {
    const v = form.get(key);
    if (typeof v === "string" && v !== "") out[key] = v;
  }
  return out;
}

/**
 * Rating a whole daily mail (2026-11-16 user decision): three buttons at the end
 * of the mail open /rate with one preselected; the page POSTs to /api/rate with
 * an optional comment. Stored in mail_feedback, one row per mail.
 */
export const MAIL_RATINGS = {
  good: { emoji: "👍", label: "좋아요" },
  soso: { emoji: "😐", label: "쏘쏘" },
  bad: { emoji: "👎", label: "싫어요" },
} as const;
export type MailRating = keyof typeof MAIL_RATINGS;
export const MAIL_RATING_KEYS = Object.keys(MAIL_RATINGS) as [MailRating, ...MailRating[]];

/** (제안값) Longest comment kept (mail_feedback.comment allows 1000). */
export const RATE_COMMENT_MAX = 1000;

export const RateFormSchema = z.object({
  rating: z.enum(MAIL_RATING_KEYS),
  comment: z.string().trim().max(RATE_COMMENT_MAX).optional().default(""),
});

export function isMailRating(v: unknown): v is MailRating {
  return typeof v === "string" && v in MAIL_RATINGS;
}
