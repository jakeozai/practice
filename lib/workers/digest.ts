/**
 * Daily mail (spec §9). Called by workers/send-digest.ts (CLI) and
 * /api/cron/digest.
 *
 * Subscribers with an AI profile get their own three (2026-11-14): picks
 * prepared from the profile by lib/workers/picks.ts (stored in digest_picks,
 * made here for anyone still missing), with a reason and a first step per
 * job and their own subject line. Nothing fits → no mail that day, never
 * filler. Subscribers without a profile get the shared list.
 *
 * Shared list: approved, open to Korea residents, not permanent staff
 * hiring, not closed — newest first, then the highest pay, then Korean-language
 * work moved ahead (rankForEveryone).
 * Order per user: render → send with idempotency key
 * `digest-{user_id}-{send_date}` → on success write matches + digest_sends('sent');
 * on failure digest_sends('failed') so a rerun on the same day retries.
 * `sent`/`skipped` rows are final for the day (CLAUDE.md rule 9).
 *
 * Throughput (2026-11-20): several mails are in flight at once, started no
 * faster than the mail service allows (lib/email/rate.ts: Resend 8/s, SES 10/s
 * by default), so one run reaches about 2,000 subscribers instead of about 250.
 * Whoever a run doesn't reach has no digest_sends row; pg_cron calls again every
 * 5 minutes until 06:30 KST while anyone is left (migration 0024). A lease
 * (claim_digest_run) keeps two runs from mailing the same day at once.
 */
import { randomUUID } from "node:crypto";
import type { ServiceClient } from "../supabase/service";
import { appEnv, emailEnv, linkEnv } from "../env";
import { planManualDigest, summarizePlan, type DigestStatus, type PlanItem, type Recipient } from "../digest/plan";
import { composeDigestEmail } from "../digest/compose";
import { profileNudge } from "../digest/nudge";
import { loadCandidateJobs, loadCurationStats, type DigestJob } from "../digest/candidates";
import { sendEmail } from "../email/send";
import { createRateGate, sendConcurrency, sendsPerSecond } from "../email/rate";
import { chunks, forEachConcurrent, pastDeadline, type RunOptions } from "./run";
import { loadSentJobIds, loadStoredPicks, preparePicks, STRETCH_SIZE, type StoredPick } from "./picks";

const PAGE = 1000;
/** Leave time to record the last send before the function limit. */
const DEADLINE_MARGIN_MS = 20_000;
/** (제안값) Model picks at send time stop this long before the deadline; later ones use rules. */
const PICKS_LLM_RESERVE_MS = 150_000;
/** A run without a deadline (the CLI) holds the day's lease at most this long. */
const CLI_LEASE_SECONDS = 1800;
/** Lease beyond the run's own deadline: Vercel stops the function by then for sure. */
const LEASE_SLACK_SECONDS = 30;
const DONE: ReadonlySet<string> = new Set(["sent", "skipped"]);

type DigestRecipient = Recipient & { profile_imported_at: string | null };

export async function loadRecipients(db: ServiceClient, only?: string): Promise<DigestRecipient[]> {
  const out: DigestRecipient[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = db
      .from("profiles")
      // profile_imported_at: when they last saved a profile, for the reminder box.
      .select("user_id, email, profile_imported_at")
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

/** `${user_id}:${job_id}` for the candidate jobs these subscribers were already sent. */
export async function loadMatched(db: ServiceClient, userIds: string[], candidateIds: string[]): Promise<Set<string>> {
  const pairs = new Set<string>();
  if (userIds.length === 0) return pairs;
  for (const [userId, jobIds] of await loadSentJobIds(db, userIds, candidateIds)) {
    for (const jobId of jobIds) pairs.add(`${userId}:${jobId}`);
  }
  return pairs;
}

async function recordSent(db: ServiceClient, userId: string, sendDate: string, jobIds: string[], messageId: string, pick?: StoredPick) {
  const { data: inserted, error: mErr } = await db
    .from("matches")
    .upsert(
      jobIds.map((job_id, i) => ({
        user_id: userId,
        job_id,
        send_date: sendDate,
        rank: i + 1,
        score: pick?.notes[job_id]?.score ?? 0,
        reason_ko: pick?.notes[job_id]?.reason ?? null,
      })),
      { onConflict: "user_id,job_id", ignoreDuplicates: true },
    )
    .select("job_id");
  // Reaction data (0020, 2026-11-17): count each job once per person who got it, by how it was sent.
  // Anonymous per-job numbers; a failure here never fails the send.
  const fresh = (inserted ?? []).map((r) => r.job_id);
  if (!mErr && fresh.length) {
    const kinds = fresh.map((id) => pick?.notes[id]?.kind ?? "shared");
    const { error } = await db.rpc("record_job_sends", { p_job_ids: fresh, p_kinds: kinds, p_send_date: sendDate });
    if (error) console.error("record_job_sends failed", error.message);
  }
  const { error: dErr } = await db.from("digest_sends").upsert(
    { user_id: userId, send_date: sendDate, status: "sent", job_count: jobIds.length, resend_message_id: messageId, error: null },
    { onConflict: "user_id,send_date" },
  );
  const err = mErr ?? dErr;
  if (err) throw new Error(`Mail was sent (${messageId}) but recording failed: ${err.message}`);
}

/** Nothing new for these people today: one write for all of them. */
async function recordSkipped(db: ServiceClient, userIds: string[], sendDate: string, log: RunOptions["log"]): Promise<number> {
  let n = 0;
  for (const ids of chunks(userIds, 500)) {
    const { error } = await db
      .from("digest_sends")
      .upsert(ids.map((user_id) => ({ user_id, send_date: sendDate, status: "skipped" as const, job_count: 0, error: null })), { onConflict: "user_id,send_date" });
    if (error) log(`  ! could not record skipped for ${ids.length} subscribers: ${error.message}`);
    else n += ids.length;
  }
  return n;
}

async function recordStatus(db: ServiceClient, userId: string, sendDate: string, status: "failed" | "skipped", log: RunOptions["log"], error?: string) {
  const { error: dbErr } = await db.from("digest_sends").upsert(
    { user_id: userId, send_date: sendDate, status, job_count: 0, error: error?.slice(0, 1000) ?? null },
    { onConflict: "user_id,send_date" },
  );
  if (dbErr) log(`  ! could not record ${status} for ${userId}: ${dbErr.message}`);
}

export type DigestResult = {
  recipients: number;
  sent: number;
  failed: number;
  skipped: number;
  alreadyDone: number;
  /** Left without a row for the next run today (out of time). */
  notReached: number;
  /** Another run held today's lease, so this one sent nothing. */
  busy?: boolean;
};

/** One run at a time per send date. A failed check never blocks the morning mail: it goes on without the lease. */
async function claimDay(db: ServiceClient, sendDate: string, seconds: number, log: RunOptions["log"]): Promise<{ holder: string | null; busy: boolean }> {
  const holder = randomUUID();
  const { data, error } = await db.rpc("claim_digest_run", { p_send_date: sendDate, p_holder: holder, p_seconds: seconds });
  if (error) {
    log(`  ! run lease unavailable (${error.message}); sending without it`);
    return { holder: null, busy: false };
  }
  return data ? { holder, busy: false } : { holder: null, busy: true };
}

async function releaseDay(db: ServiceClient, sendDate: string, holder: string, log: RunOptions["log"]) {
  const { error } = await db.rpc("release_digest_run", { p_send_date: sendDate, p_holder: holder });
  if (error) log(`  ! run lease not released (${error.message}); it expires on its own`);
}

/**
 * Send one day's mail. `jobs` fixes the job list (Phase 0 manual pick);
 * otherwise the newest approved jobs are used.
 */
export async function sendDigest(
  db: ServiceClient,
  opts: RunOptions & { sendDate: string; dryRun?: boolean; only?: string; jobs?: DigestJob[] },
): Promise<DigestResult> {
  if (opts.dryRun) return runDigest(db, opts);
  // Claim the day before reading who is still due, so a run that just finished is fully counted.
  const seconds = opts.deadline === undefined ? CLI_LEASE_SECONDS : Math.ceil((opts.deadline - Date.now()) / 1000) + LEASE_SLACK_SECONDS;
  const lease = await claimDay(db, opts.sendDate, Math.max(60, seconds), opts.log);
  if (lease.busy) {
    opts.log(`send_date ${opts.sendDate}: another run is sending today's mail; leaving it to that run.`);
    return { recipients: 0, sent: 0, failed: 0, skipped: 0, alreadyDone: 0, notReached: 0, busy: true };
  }
  try {
    return await runDigest(db, opts);
  } finally {
    if (lease.holder) await releaseDay(db, opts.sendDate, lease.holder, opts.log);
  }
}

async function runDigest(
  db: ServiceClient,
  opts: RunOptions & { sendDate: string; dryRun?: boolean; only?: string; jobs?: DigestJob[] },
): Promise<DigestResult> {
  const started = Date.now();
  const { APP_URL, DIGEST_SIZE } = appEnv();
  const { EMAIL_LINK_SECRET } = linkEnv();
  const mailEnv = opts.dryRun ? null : emailEnv(); // fail before the loop, not once per recipient

  const recipients = await loadRecipients(db, opts.only);
  const todayStatus = await loadDayStatus(db, opts.sendDate);
  const pending = recipients.filter((r) => !DONE.has(todayStatus.get(r.user_id) ?? ""));
  const result: DigestResult = { recipients: recipients.length, sent: 0, failed: 0, skipped: 0, alreadyDone: recipients.length - pending.length, notReached: 0 };
  if (pending.length === 0) {
    // The follow-up calls after 06:00 end here once everyone is done.
    opts.log(`send_date ${opts.sendDate}: all ${recipients.length} active subscribers are done for today.`);
    return result;
  }

  const jobs = opts.jobs ?? (await loadCandidateJobs(db));
  // The top-line numbers describe the automatic pick, not a hand-picked (Phase 0) list.
  const stats = opts.jobs ? null : await loadCurationStats(db, opts.sendDate).catch((e) => {
    opts.log(`  ! curation stats unavailable (${e instanceof Error ? e.message : e}); plain intro`);
    return null;
  });
  const jobById = new Map(jobs.map((j) => [j.id, j]));

  // Personal picks for everyone still to be mailed today (a hand-picked list skips this).
  const picks = new Map<string, StoredPick>();
  const perRecipient = new Map<string, string[]>();
  if (!opts.jobs) {
    try {
      const llmDeadline = opts.deadline === undefined ? undefined : Math.min(opts.deadline - PICKS_LLM_RESERVE_MS, Date.now() + PICKS_LLM_RESERVE_MS);
      const prep = await preparePicks(db, {
        log: opts.log,
        deadline: opts.deadline === undefined ? undefined : opts.deadline - 60_000,
        llmDeadline,
        sendDate: opts.sendDate,
        size: DIGEST_SIZE,
        onlyUser: opts.only ? pending[0]?.user_id : undefined,
        onlyUsers: pending.map((r) => r.user_id),
        dryRun: opts.dryRun,
      });
      const stored = opts.dryRun
        ? new Map(prep.details.map((d) => [d.user_id, { jobIds: d.picks.map((p) => p.id), notes: Object.fromEntries(d.picks.map((p) => [p.id, { reason: p.reason, today: p.today, score: p.score, kind: p.kind }])), subject: d.subject, method: d.method, createdAt: "" } as StoredPick]))
        : await loadStoredPicks(db, opts.sendDate, pending.map((r) => r.user_id));
      for (const [userId, pick] of stored) {
        const ids = pick.jobIds.filter((id) => jobById.has(id));
        picks.set(userId, { ...pick, jobIds: ids });
        perRecipient.set(userId, ids);
      }
      // A profile that fits nothing today gets no mail rather than the shared list.
      for (const d of prep.details) if (d.picks.length === 0) perRecipient.set(d.user_id, []);
    } catch (e) {
      opts.log(`  ! personal picks failed (${e instanceof Error ? e.message : e}); shared list for everyone`);
    }
  }

  const plan = planManualDigest({
    recipients,
    jobIds: jobs.map((j) => j.id),
    todayStatus,
    alreadyMatched: await loadMatched(
      db,
      pending.map((r) => r.user_id),
      jobs.map((j) => j.id),
    ),
    // Everyone gets five (2026-11-14 page: "하루 5개 공고"); a personal list is 3 fits + 2 AI stretches.
    maxJobs: DIGEST_SIZE + STRETCH_SIZE,
    perRecipient,
  });
  const summary = summarizePlan(plan);
  const rate = sendsPerSecond(mailEnv?.EMAIL_TRANSPORT ?? "file", mailEnv?.EMAIL_SENDS_PER_SECOND);
  const concurrency = sendConcurrency(rate);
  opts.log(
    `send_date ${opts.sendDate}: ${jobs.length} candidate jobs, ${recipients.length} active subscribers (${perRecipient.size} personal) → ` +
      `send ${summary.send}, nothing new ${summary.skipEmpty}, already done today ${summary.alreadyDone}` +
      (opts.dryRun ? "" : ` · ${rate}/s, ${concurrency} at once`),
  );
  if (opts.dryRun) return result;

  result.skipped = await recordSkipped(
    db,
    plan.filter((p) => p.kind === "skip_empty").map((p) => p.recipient.user_id),
    opts.sendDate,
    opts.log,
  );

  const importedAt = new Map(recipients.map((r) => [r.user_id, r.profile_imported_at]));
  const gate = createRateGate(rate);
  const sends = plan.filter((p): p is Extract<PlanItem, { kind: "send" }> => p.kind === "send");
  let outOfTime = false;

  async function sendOne(item: Extract<PlanItem, { kind: "send" }>) {
    const { recipient } = item;
    const pick = picks.get(recipient.user_id);
    let messageId: string;
    try {
      // No reason line in the mail (2026-11-16 user decision); the first step for today only when the model wrote it.
      const written = pick?.method === "llm" ? pick : undefined;
      const mail = await composeDigestEmail({
        recipient,
        jobs: item.jobIds.map((id) => jobById.get(id)!),
        personal: Boolean(pick),
        fullCount: DIGEST_SIZE + STRETCH_SIZE,
        todays: written ? new Map(item.jobIds.flatMap((id) => (written.notes[id] ? [[id, written.notes[id].today] as const] : []))) : undefined,
        subject: pick?.subject ?? null,
        stretchIds: pick ? new Set(item.jobIds.filter((id) => pick.notes[id]?.kind === "stretch")) : undefined,
        stats,
        nudge: importedAt.has(recipient.user_id) ? profileNudge(importedAt.get(recipient.user_id), opts.sendDate) : null,
        sendDate: opts.sendDate,
        appUrl: APP_URL,
        linkSecret: EMAIL_LINK_SECRET,
      });
      await gate.take();
      ({ id: messageId } = await sendEmail(mail));
    } catch (e) {
      result.failed++;
      const message = e instanceof Error ? e.message : String(e);
      opts.log(`  ✖ ${recipient.user_id}: ${message}`);
      await recordStatus(db, recipient.user_id, opts.sendDate, "failed", opts.log, message);
      return;
    }

    try {
      await recordSent(db, recipient.user_id, opts.sendDate, item.jobIds, messageId, pick);
      result.sent++;
    } catch (e) {
      // Do not mark as failed: the mail went out. A rerun replays the same
      // idempotency key and payload, so Resend will not send it twice.
      result.failed++;
      opts.log(`  ! ${recipient.user_id}: ${e instanceof Error ? e.message : e}`);
    }
  }

  await forEachConcurrent(sends, concurrency, async (item) => {
    if (outOfTime || pastDeadline(opts.deadline, DEADLINE_MARGIN_MS)) {
      // Nothing is recorded for them, so the next run on the same day picks them up.
      outOfTime = true;
      result.notReached++;
      return;
    }
    await sendOne(item);
  });
  if (result.notReached) opts.log(`  ! out of time: ${result.notReached} subscribers left for the next run today`);

  opts.log(
    `Done: sent ${result.sent}, failed ${result.failed}, skipped ${result.skipped}, already done ${result.alreadyDone}` +
      `${result.notReached ? `, not reached ${result.notReached}` : ""} in ${Math.round((Date.now() - started) / 1000)}s.`,
  );
  return result;
}
