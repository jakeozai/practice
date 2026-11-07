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
}): PlanItem[] {
  const { recipients, jobIds, todayStatus, alreadyMatched, maxJobs } = input;
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

    const remaining = [...new Set(jobIds)]
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
