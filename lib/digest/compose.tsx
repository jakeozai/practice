/**
 * Builds one user's daily mail: signed links, rendered HTML/text, headers.
 * Deterministic for a given (user, send_date, jobs) so a rerun after a crash
 * produces the same payload and Resend's idempotency key dedupes it.
 */
import { render } from "@react-email/components";
import DailyFive, { dailyFiveSubject, type DailyFiveJob } from "../../emails/DailyFive";
import { CATEGORY_CHIP_KO, jobFacts, statusBadge } from "../jobs/format";
import { signLink } from "../links";
import { koreanMonthDay, koreanWeekday, seoulDayStartUtc } from "../time";
import { BRAND, contactEmail } from "../brand";
import { unsubscribeHeaders, type OutgoingEmail } from "../email/send";
import { curationLine } from "./plan";
import type { CurationStats } from "./candidates";

// The job shape and columns live in candidates.ts (no React Email there); re-exported for callers.
export { DIGEST_JOB_COLUMNS, type DigestJob } from "./candidates";
import type { DigestJob } from "./candidates";

/** One mail card. The posting text never appears, only our Korean summary and structured fields (CLAUDE.md rule 1). */
export function digestCard(job: DigestJob, detailUrl: string, reason: string | null = null): DailyFiveJob {
  const korean = job.title_ko?.trim() || null;
  return {
    id: job.id,
    headline: korean ?? job.title,
    company: job.company,
    originalTitle: korean ? job.title : null,
    summary: job.summary_ko,
    badge: statusBadge(job.status),
    category: job.category && job.category !== "other" ? CATEGORY_CHIP_KO[job.category] : null,
    facts: jobFacts(job),
    reason,
    detailUrl,
  };
}

export function digestIdempotencyKey(userId: string, sendDate: string): string {
  return `digest-${userId}-${sendDate}`;
}

export async function composeDigestEmail(input: {
  recipient: { user_id: string; email: string };
  jobs: DigestJob[];
  /** Per-job recommendation line (Phase 2). */
  reasons?: Map<string, string>;
  /** Day's numbers for the top line (null: plain intro). */
  stats?: CurationStats | null;
  sendDate: string;
  appUrl: string;
  linkSecret: string;
}): Promise<OutgoingEmail> {
  const { recipient, jobs, reasons, stats, sendDate, appUrl, linkSecret } = input;
  // Issue time pinned to the send date keeps the payload identical on reruns.
  const issuedAt = seoulDayStartUtc(sendDate);
  const uid = recipient.user_id;

  const unsubscribeUrl = `${appUrl}/api/email/unsubscribe?t=${signLink({ uid, purpose: "unsub" }, linkSecret, issuedAt)}`;

  const cards: DailyFiveJob[] = jobs.map((job) =>
    digestCard(
      job,
      `${appUrl}/r/${signLink({ uid, purpose: "click", jobId: job.id }, linkSecret, issuedAt)}`,
      reasons?.get(job.id) ?? null,
    ),
  );

  const dateLabel = koreanMonthDay(sendDate);
  const element = (
    <DailyFive
      brand={BRAND.name}
      dateLabel={dateLabel}
      dayLabel={`${dateLabel} ${koreanWeekday(sendDate)}`}
      curation={curationLine(stats, cards.length)}
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
