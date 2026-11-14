/**
 * Who gets which jobs today. Pure logic, shared by the Phase 0 manual sender
 * and (later) send-digest.ts.
 *
 * Rules (CLAUDE.md rule 9, spec §9):
 * - one mail per user per send_date: `sent`/`skipped` rows in digest_sends are final,
 *   `failed` rows are retried
 * - never resend a job the user already got (matches PK)
 * - nothing left to send → record `skipped`
 */
export type DigestStatus = "sent" | "failed" | "skipped";

export type Recipient = { user_id: string; email: string };

export type PlanItem =
  | { kind: "send"; recipient: Recipient; jobIds: string[] }
  | { kind: "skip_empty"; recipient: Recipient }
  | { kind: "already_done"; recipient: Recipient; status: "sent" | "skipped" };

export function planManualDigest(input: {
  recipients: Recipient[];
  /** Jobs in the order they should appear. */
  jobIds: string[];
  /** digest_sends.status for today, by user_id. */
  todayStatus: Map<string, DigestStatus>;
  /** `${user_id}:${job_id}` pairs already in matches. */
  alreadyMatched: Set<string>;
  maxJobs: number;
  /**
   * Personal picks (lib/workers/picks.ts) by user_id; they replace the shared
   * list for that person. An empty list means nothing fits them today: no
   * filler from the shared list (2026-11-14: only jobs that fit the profile).
   */
  perRecipient?: Map<string, string[]>;
}): PlanItem[] {
  const { recipients, jobIds, todayStatus, alreadyMatched, maxJobs, perRecipient } = input;
  const seen = new Set<string>();
  const plan: PlanItem[] = [];

  for (const recipient of recipients) {
    if (seen.has(recipient.user_id)) continue;
    seen.add(recipient.user_id);

    const status = todayStatus.get(recipient.user_id);
    if (status === "sent" || status === "skipped") {
      plan.push({ kind: "already_done", recipient, status });
      continue;
    }

    const own = perRecipient?.get(recipient.user_id);
    const remaining = [...new Set(own ?? jobIds)]
      .filter((id) => !alreadyMatched.has(`${recipient.user_id}:${id}`))
      .slice(0, maxJobs);

    plan.push(remaining.length ? { kind: "send", recipient, jobIds: remaining } : { kind: "skip_empty", recipient });
  }
  return plan;
}

export function summarizePlan(plan: PlanItem[]) {
  return {
    send: plan.filter((p) => p.kind === "send").length,
    skipEmpty: plan.filter((p) => p.kind === "skip_empty").length,
    alreadyDone: plan.filter((p) => p.kind === "already_done").length,
  };
}

/**
 * (제안값, 2026-11-12) Phase 1 mails the same jobs to every subscriber, and they
 * all read Korean: work in Korean first, then English-only work, then other
 * languages. Language never removes a job (spec §0); it only orders them.
 */
export function languageTier(languages: string[]): number {
  if (languages.includes("ko")) return 2;
  if (languages.every((l) => l === "en")) return 1;
  return 0;
}

/** Stable: within a tier the incoming order (newest, then best paid) is kept. */
export function rankForEveryone<T extends { languages: string[] }>(jobs: T[]): T[] {
  return [...jobs].sort((a, b) => languageTier(b.languages) - languageTier(a.languages));
}

/**
 * The line at the top of the mail: how much was looked at to pick these few.
 * Null (the mail keeps its plain intro) when the numbers would read oddly, e.g.
 * nothing new came in or fewer new jobs passed than the mail carries.
 */
export function curationLine(
  stats: { newPostings: number; koreaJobs: number } | null | undefined,
  picked: number,
  personal = false,
): string | null {
  const which = personal ? `내 AI가 분석한 프로필에 딱 맞는 ${picked}개` : `${picked}개`;
  if (!stats || picked <= 0 || stats.newPostings <= 0 || stats.koreaJobs < picked) {
    return personal && picked > 0 ? `내 AI가 분석한 프로필에 딱 맞는 일감 ${picked}개를 골랐어요.` : null;
  }
  const n = (x: number) => x.toLocaleString("ko-KR");
  return `지난 하루 새로 올라온 공고 ${n(stats.newPostings)}개 중 한국에서 할 수 있는 단기 일감 ${n(stats.koreaJobs)}개, 그중 ${which}를 골랐어요.`;
}
