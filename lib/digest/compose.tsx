/**
 * Builds one user's daily mail: signed links, rendered HTML/text, headers.
 * Deterministic for a given (user, send_date, jobs) so a rerun after a crash
 * produces the same payload and Resend's idempotency key dedupes it.
 */
import { render } from "@react-email/components";
import DailyFive, { dailyFiveSubject, type DailyFiveJob } from "../../emails/DailyFive";
import { formatConditions, statusBadge } from "../jobs/format";
import { signLink } from "../links";
import { koreanMonthDay, seoulDayStartUtc } from "../time";
import { BRAND, contactEmail } from "../brand";
import { unsubscribeHeaders, type OutgoingEmail } from "../email/send";
import type { Tables } from "../supabase/database.types";

export type DigestJob = Pick<
  Tables<"jobs">,
  | "id"
  | "company"
  | "title"
  | "summary_ko"
  | "status"
  | "pay_min"
  | "pay_max"
  | "pay_currency"
  | "pay_unit"
  | "hours_per_week_min"
>;

export const DIGEST_JOB_COLUMNS =
  "id, company, title, summary_ko, status, pay_min, pay_max, pay_currency, pay_unit, hours_per_week_min" as const;

export function digestIdempotencyKey(userId: string, sendDate: string): string {
  return `digest-${userId}-${sendDate}`;
}

export async function composeDigestEmail(input: {
  recipient: { user_id: string; email: string };
  jobs: DigestJob[];
  /** Per-job recommendation line (Phase 2). */
  reasons?: Map<string, string>;
  sendDate: string;
  appUrl: string;
  linkSecret: string;
}): Promise<OutgoingEmail> {
  const { recipient, jobs, reasons, sendDate, appUrl, linkSecret } = input;
  // Issue time pinned to the send date keeps the payload identical on reruns.
  const issuedAt = seoulDayStartUtc(sendDate);
  const uid = recipient.user_id;

  const unsubscribeUrl = `${appUrl}/api/email/unsubscribe?t=${signLink({ uid, purpose: "unsub" }, linkSecret, issuedAt)}`;

  const cards: DailyFiveJob[] = jobs.map((job) => ({
    id: job.id,
    company: job.company,
    title: job.title,
    summary: job.summary_ko,
    badge: statusBadge(job.status),
    conditions: formatConditions(job),
    reason: reasons?.get(job.id) ?? null,
    detailUrl: `${appUrl}/r/${signLink({ uid, purpose: "click", jobId: job.id }, linkSecret, issuedAt)}`,
  }));

  const dateLabel = koreanMonthDay(sendDate);
  const element = (
    <DailyFive
      brand={BRAND.name}
      dateLabel={dateLabel}
      jobs={cards}
      recipientEmail={recipient.email}
      logoUrl={`${appUrl}/duck-mail.png`}
      appUrl={appUrl}
      profileUrl={`${appUrl}/onboarding`}
      unsubscribeUrl={unsubscribeUrl}
      privacyUrl={`${appUrl}/privacy`}
      contactEmail={contactEmail()}
    />
  );

  return {
    to: recipient.email,
    subject: dailyFiveSubject(cards.length, dateLabel),
    html: await render(element),
    text: await render(element, { plainText: true }),
    headers: unsubscribeHeaders(unsubscribeUrl),
    idempotencyKey: digestIdempotencyKey(uid, sendDate),
  };
}
