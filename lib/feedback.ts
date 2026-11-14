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
