/**
 * Daily mail (spec §9, Phase 1: the same jobs for everyone, minus what each
 * person already got). Called by workers/send-digest.ts (CLI) and
 * /api/cron/digest.
 *
 * Candidate jobs: approved, open to Korea residents, not permanent staff
 * hiring, not closed — newest first, then the highest pay, then Korean-language
 * work moved ahead (rankForEveryone).
 * Order per user: render → send with idempotency key
 * `digest-{user_id}-{send_date}` → on success write matches + digest_sends('sent');
 * on failure digest_sends('failed') so a rerun on the same day retries.
 * `sent`/`skipped` rows are final for the day (CLAUDE.md rule 9).
 */
import type { ServiceClient } from "../supabase/service";
import { appEnv, emailEnv, linkEnv } from "../env";
import { planManualDigest, summarizePlan, type DigestStatus, type Recipient } from "../digest/plan";
import { composeDigestEmail } from "../digest/compose";
import { loadCandidateJobs, loadCurationStats, type DigestJob } from "../digest/candidates";
import { sendEmail } from "../email/send";
import { SEND_INTERVAL_MS } from "../email/constants";
import { pastDeadline, sleep, type RunOptions } from "./run";

const PAGE = 1000;
/** Leave time to record the last send before the function limit. */
const DEADLINE_MARGIN_MS = 20_000;

export async function loadRecipients(db: ServiceClient, only?: string): Promise<Recipient[]> {
  const out: Recipient[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = db
      .from("profiles")
      .select("user_id, email")
      .eq("digest_status", "active")
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (only) q = q.eq("email", only);
    const { data, error } = await q;
    if (error) throw new Error(`load recipients: ${error.message}`);
    out.push(...data);
    if (data.length < PAGE) return out;
  }
}

/** All of the day's digest_sends rows (small: at most one per subscriber). */
export async function loadDayStatus(db: ServiceClient, sendDate: string): Promise<Map<string, DigestStatus>> {
  const status = new Map<string, DigestStatus>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("digest_sends")
      .select("user_id, status")
      .eq("send_date", sendDate)
      .order("user_id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`load digest_sends: ${error.message}`);
    for (const row of data) status.set(row.user_id, row.status);
    if (data.length < PAGE) return status;
  }
}

export async function loadMatched(db: ServiceClient, jobIds: string[]): Promise<Set<string>> {
  const pairs = new Set<string>();
  if (jobIds.length === 0) return pairs;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("matches")
      .select("user_id, job_id")
      .in("job_id", jobIds)
      .order("user_id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`load matches: ${error.message}`);
    for (const row of data) pairs.add(`${row.user_id}:${row.job_id}`);
    if (data.length < PAGE) return pairs;
  }
}

async function recordSent(db: ServiceClient, userId: string, sendDate: string, jobIds: string[], messageId: string) {
  const { error: mErr } = await db.from("matches").upsert(
    jobIds.map((job_id, i) => ({ user_id: userId, job_id, send_date: sendDate, rank: i + 1, score: 0 })),
    { onConflict: "user_id,job_id", ignoreDuplicates: true },
  );
  const { error: dErr } = await db.from("digest_sends").upsert(
    { user_id: userId, send_date: sendDate, status: "sent", job_count: jobIds.length, resend_message_id: messageId, error: null },
    { onConflict: "user_id,send_date" },
  );
  const err = mErr ?? dErr;
  if (err) throw new Error(`Mail was sent (${messageId}) but recording failed: ${err.message}`);
}

async function recordStatus(db: ServiceClient, userId: string, sendDate: string, status: "failed" | "skipped", log: RunOptions["log"], error?: string) {
  const { error: dbErr } = await db.from("digest_sends").upsert(
    { user_id: userId, send_date: sendDate, status, job_count: 0, error: error?.slice(0, 1000) ?? null },
    { onConflict: "user_id,send_date" },
  );
  if (dbErr) log(`  ! could not record ${status} for ${userId}: ${dbErr.message}`);
}

export type DigestResult = { recipients: number; sent: number; failed: number; skipped: number; alreadyDone: number; notReached: number };

/**
 * Send one day's mail. `jobs` fixes the job list (Phase 0 manual pick);
 * otherwise the newest approved jobs are used.
 */
export async function sendDigest(
  db: ServiceClient,
  opts: RunOptions & { sendDate: string; dryRun?: boolean; only?: string; jobs?: DigestJob[] },
): Promise<DigestResult> {
  const { APP_URL, DIGEST_SIZE } = appEnv();
  const { EMAIL_LINK_SECRET } = linkEnv();
  if (!opts.dryRun) emailEnv(); // fail before the loop, not once per recipient

  const jobs = opts.jobs ?? (await loadCandidateJobs(db));
  // The top-line numbers describe the automatic pick, not a hand-picked (Phase 0) list.
  const stats = opts.jobs ? null : await loadCurationStats(db, opts.sendDate).catch((e) => {
    opts.log(`  ! curation stats unavailable (${e instanceof Error ? e.message : e}); plain intro`);
    return null;
  });
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const recipients = await loadRecipients(db, opts.only);
  const plan = planManualDigest({
    recipients,
    jobIds: jobs.map((j) => j.id),
    todayStatus: await loadDayStatus(db, opts.sendDate),
    alreadyMatched: await loadMatched(db, jobs.map((j) => j.id)),
    maxJobs: DIGEST_SIZE,
  });
  const summary = summarizePlan(plan);
  opts.log(
    `send_date ${opts.sendDate}: ${jobs.length} candidate jobs, ${recipients.length} active subscribers → ` +
      `send ${summary.send}, nothing new ${summary.skipEmpty}, already done today ${summary.alreadyDone}`,
  );

  const result: DigestResult = { recipients: recipients.length, sent: 0, failed: 0, skipped: 0, alreadyDone: summary.alreadyDone, notReached: 0 };
  if (opts.dryRun) return result;

  for (const [index, item] of plan.entries()) {
    const { recipient } = item;
    if (item.kind === "already_done") continue;
    if (item.kind === "skip_empty") {
      await recordStatus(db, recipient.user_id, opts.sendDate, "skipped", opts.log);
      result.skipped++;
      continue;
    }
    if (pastDeadline(opts.deadline, DEADLINE_MARGIN_MS)) {
      // Nothing is recorded for them, so the next run on the same day picks them up.
      result.notReached = plan.slice(index).filter((p) => p.kind === "send").length;
      opts.log(`  ! out of time: ${result.notReached} subscribers left for a rerun today`);
      break;
    }

    let messageId: string;
    try {
      const mail = await composeDigestEmail({
        recipient,
        jobs: item.jobIds.map((id) => jobById.get(id)!),
        stats,
        sendDate: opts.sendDate,
        appUrl: APP_URL,
        linkSecret: EMAIL_LINK_SECRET,
      });
      ({ id: messageId } = await sendEmail(mail));
    } catch (e) {
      result.failed++;
      const message = e instanceof Error ? e.message : String(e);
      opts.log(`  ✖ ${recipient.user_id}: ${message}`);
      await recordStatus(db, recipient.user_id, opts.sendDate, "failed", opts.log, message);
      await sleep(SEND_INTERVAL_MS);
      continue;
    }

    try {
      await recordSent(db, recipient.user_id, opts.sendDate, item.jobIds, messageId);
      result.sent++;
    } catch (e) {
      // Do not mark as failed: the mail went out. A rerun replays the same
      // idempotency key and payload, so Resend will not send it twice.
      result.failed++;
      opts.log(`  ! ${recipient.user_id}: ${e instanceof Error ? e.message : e}`);
    }
    await sleep(SEND_INTERVAL_MS);
  }

  opts.log(`Done: sent ${result.sent}, failed ${result.failed}, skipped ${result.skipped}, already done ${result.alreadyDone}.`);
  return result;
}
