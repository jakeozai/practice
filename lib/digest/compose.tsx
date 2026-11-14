/**
 * Builds one user's daily mail: signed links, rendered HTML/text, headers.
 * Deterministic for a given (user, send_date, jobs) so a rerun after a crash
 * produces the same payload and Resend's idempotency key dedupes it.
 */
import { render } from "@react-email/components";
import DailyFive, { dailyFiveSubject, type DailyFiveJob } from "../../emails/DailyFive";
import { CATEGORY_CHIP_KO, compactPay, isBiddingGig, jobFacts, statusBadge } from "../jobs/format";
import { mailAssets } from "../../emails/theme";
import { signLink } from "../links";
import type { ProfileNudge } from "./nudge";
import { koreanMonthDay, koreanWeekday, seoulDayStartUtc } from "../time";
import { BRAND, contactEmail } from "../brand";
import { unsubscribeHeaders, type OutgoingEmail } from "../email/send";
import { curationLine } from "./plan";
import type { CurationStats } from "./candidates";

// The job shape and columns live in candidates.ts (no React Email there); re-exported for callers.
export { DIGEST_JOB_COLUMNS, type DigestJob } from "./candidates";
import type { DigestJob } from "./candidates";

// Lives with the other display helpers (no React there); re-exported for existing callers.
export { isBiddingGig } from "../jobs/format";

/** One mail card. The posting text never appears, only our Korean summary and structured fields (CLAUDE.md rule 1). */
export function digestCard(job: DigestJob, detailUrl: string, reason: string | null = null, today: string | null = null, stretch = false): DailyFiveJob {
  const korean = job.title_ko?.trim() || null;
  return {
    id: job.id,
    headline: korean ?? job.title,
    company: job.company,
    originalTitle: korean ? job.title : null,
    summary: job.summary_ko,
    badge: statusBadge(job.status),
    category: job.category && job.category !== "other" ? CATEGORY_CHIP_KO[job.category] : null,
    facts: isBiddingGig(job.url) ? [...jobFacts(job), { label: "지원", value: "견적 입찰 (경쟁)" }] : jobFacts(job),
    pay: compactPay(job),
    reason,
    today,
    stretch,
    detailUrl,
  };
}

export function digestIdempotencyKey(userId: string, sendDate: string): string {
  return `digest-${userId}-${sendDate}`;
}

export async function composeDigestEmail(input: {
  recipient: { user_id: string; email: string };
  jobs: DigestJob[];
  /** Per-job recommendation line (personal picks). */
  reasons?: Map<string, string>;
  /** Per-job first step for today (personal picks). */
  todays?: Map<string, string>;
  /** Personal subject line (personal picks); the date is appended. */
  subject?: string | null;
  /** Jobs shown under "AI로 도전해 볼 일감" (personal picks), after the profile fits. */
  stretchIds?: Set<string>;
  /** Day's numbers for the top line (null: plain intro). */
  stats?: CurationStats | null;
  /** Profile reminder box (lib/digest/nudge.ts). */
  nudge?: ProfileNudge;
  sendDate: string;
  appUrl: string;
  linkSecret: string;
}): Promise<OutgoingEmail> {
  const { recipient, jobs, reasons, todays, subject, stretchIds, stats, nudge, sendDate, appUrl, linkSecret } = input;
  const stretchCount = jobs.filter((j) => stretchIds?.has(j.id)).length;
  const personal = Boolean(reasons?.size);
  // Issue time pinned to the send date keeps the payload identical on reruns.
  const issuedAt = seoulDayStartUtc(sendDate);
  const uid = recipient.user_id;

  const unsubscribeUrl = `${appUrl}/api/email/unsubscribe?t=${signLink({ uid, purpose: "unsub" }, linkSecret, issuedAt)}`;

  const cards: DailyFiveJob[] = jobs.map((job) => ({
    ...digestCard(
      job,
      `${appUrl}/r/${signLink({ uid, purpose: "click", jobId: job.id }, linkSecret, issuedAt)}`,
      reasons?.get(job.id) ?? null,
      todays?.get(job.id) ?? null,
      stretchIds?.has(job.id) ?? false,
    ),
    // Opens a confirmation page; its buttons POST (CLAUDE.md rule 8).
    feedbackUrl: `${appUrl}/feedback?t=${signLink({ uid, purpose: "feedback", jobId: job.id }, linkSecret, issuedAt)}`,
  }));

  const dateLabel = koreanMonthDay(sendDate);
  const element = (
    <DailyFive
      brand={BRAND.name}
      dateLabel={dateLabel}
      dayLabel={`${dateLabel} ${koreanWeekday(sendDate)}`}
      curation={curationLine(stats, cards.length - stretchCount, personal, stretchCount)}
      personal={personal}
      jobs={cards}
      recipientEmail={recipient.email}
      logoUrl={mailAssets(appUrl).wordmarkUrl}
      iconUrl={mailAssets(appUrl).iconUrl}
      banners={{ dawn: mailAssets(appUrl).dawnUrl, golden: mailAssets(appUrl).goldenUrl, blueHour: mailAssets(appUrl).blueHourUrl }}
      fontUrl={mailAssets(appUrl).fontUrl}
      appUrl={appUrl}
      profileUrl={`${appUrl}/onboarding`}
      unsubscribeUrl={unsubscribeUrl}
      privacyUrl={`${appUrl}/privacy`}
      contactEmail={contactEmail()}
      profileNudge={nudge ?? null}
    />
  );

  return {
    to: recipient.email,
    subject: subject ? `${subject} · ${dateLabel}` : dailyFiveSubject(cards.length, dateLabel),
    html: await render(element),
    text: await render(element, { plainText: true }),
    headers: unsubscribeHeaders(unsubscribeUrl),
    idempotencyKey: digestIdempotencyKey(uid, sendDate),
  };
}
