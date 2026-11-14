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
 */
import type { ServiceClient } from "../supabase/service";
import { appEnv, emailEnv, linkEnv } from "../env";
import { planManualDigest, summarizePlan, type DigestStatus, type Recipient } from "../digest/plan";
import { composeDigestEmail } from "../digest/compose";
import { profileNudge } from "../digest/nudge";
import { loadCandidateJobs, loadCurationStats, type DigestJob } from "../digest/candidates";
import { sendEmail } from "../email/send";
import { SEND_INTERVAL_MS } from "../email/constants";
import { pastDeadline, sleep, type RunOptions } from "./run";
import { loadSentJobIds, loadStoredPicks, preparePicks, type StoredPick } from "./picks";

const PAGE = 1000;
/** Leave time to record the last send before the function limit. */
const DEADLINE_MARGIN_MS = 20_000;
/** (제안값) Model picks at send time stop this long before the deadline; later ones use rules. */
const PICKS_LLM_RESERVE_MS = 150_000;

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

/** `${user_id}:${job_id}` for everything these subscribers were ever sent (looked up by user, not by job). */
export async function loadMatched(db: ServiceClient, userIds: string[]): Promise<Set<string>> {
  const pairs = new Set<string>();
  if (userIds.length === 0) return pairs;
  for (const [userId, jobIds] of await loadSentJobIds(db, userIds)) {
    for (const jobId of jobIds) pairs.add(`${userId}:${jobId}`);
  }
  return pairs;
}

async function recordSent(db: ServiceClient, userId: string, sendDate: string, jobIds: string[], messageId: string, pick?: StoredPick) {
  const { error: mErr } = await db.from("matches").upsert(
    jobIds.map((job_id, i) => ({
      user_id: userId,
      job_id,
      send_date: sendDate,
      rank: i + 1,
      score: pick?.notes[job_id]?.score ?? 0,
      reason_ko: pick?.notes[job_id]?.reason ?? null,
    })),
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
  const todayStatus = await loadDayStatus(db, opts.sendDate);

  // Personal picks for everyone still to be mailed today (a hand-picked list skips this).
  const picks = new Map<string, StoredPick>();
  const perRecipient = new Map<string, string[]>();
  const pending = recipients.filter((r) => !["sent", "skipped"].includes(todayStatus.get(r.user_id) ?? ""));
  if (!opts.jobs && pending.length > 0) {
    try {
      const llmDeadline = opts.deadline === undefined ? undefined : Math.min(opts.deadline - PICKS_LLM_RESERVE_MS, Date.now() + PICKS_LLM_RESERVE_MS);
      const prep = await preparePicks(db, {
        log: opts.log,
        deadline: opts.deadline === undefined ? undefined : opts.deadline - 60_000,
        llmDeadline,
        sendDate: opts.sendDate,
        size: DIGEST_SIZE,
        onlyUser: opts.only ? pending[0]?.user_id : undefined,
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
    alreadyMatched: await loadMatched(db, pending.map((r) => r.user_id)),
    maxJobs: DIGEST_SIZE,
    perRecipient,
  });
  const summary = summarizePlan(plan);
  opts.log(
    `send_date ${opts.sendDate}: ${jobs.length} candidate jobs, ${recipients.length} active subscribers (${perRecipient.size} personal) → ` +
      `send ${summary.send}, nothing new ${summary.skipEmpty}, already done today ${summary.alreadyDone}`,
  );

  const result: DigestResult = { recipients: recipients.length, sent: 0, failed: 0, skipped: 0, alreadyDone: summary.alreadyDone, notReached: 0 };
  if (opts.dryRun) return result;

  // When each recipient last saved a profile, for the reminder box.
  const toSend = plan.filter((p) => p.kind === "send").map((p) => p.recipient.user_id);
  const importedAt = new Map<string, string | null>();
  for (let i = 0; i < toSend.length; i += 200) {
    // 200 ids per request keeps the query URL short.
    const { data, error } = await db.from("profiles").select("user_id, profile_imported_at").in("user_id", toSend.slice(i, i + 200));
    if (error) opts.log(`  ! profile dates not loaded (${error.message}); no reminder box`);
    for (const r of data ?? []) importedAt.set(r.user_id, r.profile_imported_at);
  }

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
      const pick = picks.get(recipient.user_id);
      const mail = await composeDigestEmail({
        recipient,
        jobs: item.jobIds.map((id) => jobById.get(id)!),
        reasons: pick ? new Map(item.jobIds.flatMap((id) => (pick.notes[id] ? [[id, pick.notes[id].reason] as const] : []))) : undefined,
        todays: pick ? new Map(item.jobIds.flatMap((id) => (pick.notes[id] ? [[id, pick.notes[id].today] as const] : []))) : undefined,
        subject: pick?.subject ?? null,
        stretchIds: pick ? new Set(item.jobIds.filter((id) => pick.notes[id]?.kind === "stretch")) : undefined,
        stats,
        nudge: importedAt.has(recipient.user_id) ? profileNudge(importedAt.get(recipient.user_id), opts.sendDate) : null,
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
      await recordSent(db, recipient.user_id, opts.sendDate, item.jobIds, messageId, picks.get(recipient.user_id));
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
