/**
 * Phase 0: send the jobs an admin picked to every active subscriber.
 *
 *   npm run send:manual -- <jobId> [<jobId> ...]            # dry run: print the plan
 *   npm run send:manual -- <jobId> ... --send                # actually send
 *   npm run send:manual -- <jobId> ... --only me@example.com --send   # test send to one address
 *
 * Options: --date YYYY-MM-DD (send_date, default today in Asia/Seoul)
 *
 * Order per user (spec §9): render → send with idempotency key
 * `digest-{user_id}-{send_date}` → on success write matches + digest_sends('sent');
 * on failure digest_sends('failed') so a rerun on the same day retries.
 */
import { parseArgs } from "node:util";
import { z } from "zod";
import { createServiceClient, type ServiceClient } from "../lib/supabase/service";
import { appEnv, emailEnv, linkEnv } from "../lib/env";
import { seoulDate, isIsoDate } from "../lib/time";
import { planManualDigest, summarizePlan, type DigestStatus, type Recipient } from "../lib/digest/plan";
import { composeDigestEmail, DIGEST_JOB_COLUMNS, type DigestJob } from "../lib/digest/compose";
import { sendEmail } from "../lib/email/send";
import { SEND_INTERVAL_MS } from "../lib/email/constants";

const PAGE = 1000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function parseCli() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      send: { type: "boolean", default: false },
      only: { type: "string" },
      date: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help || positionals.length === 0) {
    console.log("Usage: npm run send:manual -- <jobId> [<jobId> ...] [--send] [--only email] [--date YYYY-MM-DD]");
    process.exit(values.help ? 0 : 1);
  }
  const ids = z.array(z.uuid()).safeParse(positionals);
  if (!ids.success) fail(`Job ids must be UUIDs: ${positionals.join(" ")}`);
  if (values.date && !isIsoDate(values.date)) fail(`--date must be YYYY-MM-DD: ${values.date}`);
  if (values.only && !z.email().safeParse(values.only).success) fail(`--only must be an email: ${values.only}`);
  return {
    jobIds: [...new Set(ids.data)],
    send: values.send,
    only: values.only?.toLowerCase(),
    sendDate: values.date ?? seoulDate(),
  };
}

async function loadJobs(db: ServiceClient, ids: string[]): Promise<DigestJob[]> {
  const { data, error } = await db
    .from("jobs")
    .select(`${DIGEST_JOB_COLUMNS}, review_state, korea_eligible, requires_credential`)
    .in("id", ids);
  if (error) fail(`Loading jobs failed: ${error.message}`);

  const byId = new Map(data.map((j) => [j.id, j]));
  const problems: string[] = [];
  for (const id of ids) {
    const j = byId.get(id);
    if (!j) problems.push(`${id}: not found`);
    else if (j.review_state !== "approved") problems.push(`${id}: review_state is ${j.review_state}`);
    else if (j.status === "closed") problems.push(`${id}: closed`);
    else if (j.korea_eligible !== true) problems.push(`${id}: korea_eligible is ${j.korea_eligible}`);
    else if (j.requires_credential) problems.push(`${id}: requires a credential`);
  }
  if (problems.length) fail(`These jobs can't be sent:\n  ${problems.join("\n  ")}`);

  // Keep the admin's order.
  return ids.map((id) => {
    const j = byId.get(id)!;
    return {
      id: j.id,
      company: j.company,
      title: j.title,
      summary_ko: j.summary_ko,
      status: j.status,
      pay_min: j.pay_min,
      pay_max: j.pay_max,
      pay_currency: j.pay_currency,
      pay_unit: j.pay_unit,
      hours_per_week_min: j.hours_per_week_min,
    };
  });
}

async function loadRecipients(db: ServiceClient, only?: string): Promise<Recipient[]> {
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
    if (error) fail(`Loading recipients failed: ${error.message}`);
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

/** All of today's digest_sends rows (small: at most one per subscriber). */
async function loadTodayStatus(db: ServiceClient, sendDate: string) {
  const status = new Map<string, DigestStatus>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("digest_sends")
      .select("user_id, status")
      .eq("send_date", sendDate)
      .order("user_id")
      .range(from, from + PAGE - 1);
    if (error) fail(`Loading digest_sends failed: ${error.message}`);
    for (const row of data) status.set(row.user_id, row.status);
    if (data.length < PAGE) break;
  }
  return status;
}

async function loadMatched(db: ServiceClient, jobIds: string[]) {
  const pairs = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("matches")
      .select("user_id, job_id")
      .in("job_id", jobIds)
      .order("user_id")
      .range(from, from + PAGE - 1);
    if (error) fail(`Loading matches failed: ${error.message}`);
    for (const row of data) pairs.add(`${row.user_id}:${row.job_id}`);
    if (data.length < PAGE) break;
  }
  return pairs;
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

async function recordStatus(db: ServiceClient, userId: string, sendDate: string, status: "failed" | "skipped", error?: string) {
  const { error: dbErr } = await db.from("digest_sends").upsert(
    { user_id: userId, send_date: sendDate, status, job_count: 0, error: error?.slice(0, 1000) ?? null },
    { onConflict: "user_id,send_date" },
  );
  if (dbErr) console.error(`  ! could not record ${status} for ${userId}: ${dbErr.message}`);
}

async function main() {
  const args = parseCli();
  const { APP_URL, DIGEST_SIZE } = appEnv();
  const { EMAIL_LINK_SECRET } = linkEnv();
  if (args.jobIds.length > DIGEST_SIZE) fail(`Pick at most ${DIGEST_SIZE} jobs (DIGEST_SIZE).`);
  if (args.send) emailEnv(); // fail before the loop, not once per recipient

  const db = createServiceClient();
  const jobs = await loadJobs(db, args.jobIds);
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const recipients = await loadRecipients(db, args.only);
  if (args.only && recipients.length === 0) fail(`No active subscriber with email ${args.only}.`);

  const plan = planManualDigest({
    recipients,
    jobIds: args.jobIds,
    todayStatus: await loadTodayStatus(db, args.sendDate),
    alreadyMatched: await loadMatched(db, args.jobIds),
    maxJobs: DIGEST_SIZE,
  });
  const summary = summarizePlan(plan);

  console.log(`send_date ${args.sendDate} (Asia/Seoul)`);
  console.log("Jobs:");
  jobs.forEach((j, i) => console.log(`  ${i + 1}. ${j.company} — ${j.title} [${j.status}]`));
  console.log(
    `Active subscribers: ${recipients.length} → send ${summary.send}, nothing new ${summary.skipEmpty}, already done today ${summary.alreadyDone}`,
  );

  if (!args.send) {
    console.log("\nDry run. Add --send to send.");
    return;
  }

  let sent = 0;
  let failed = 0;
  for (const item of plan) {
    const { recipient } = item;
    if (item.kind === "already_done") continue;
    if (item.kind === "skip_empty") {
      await recordStatus(db, recipient.user_id, args.sendDate, "skipped");
      continue;
    }

    let messageId: string;
    try {
      const mail = await composeDigestEmail({
        recipient,
        jobs: item.jobIds.map((id) => jobById.get(id)!),
        sendDate: args.sendDate,
        appUrl: APP_URL,
        linkSecret: EMAIL_LINK_SECRET,
      });
      ({ id: messageId } = await sendEmail(mail));
    } catch (e) {
      failed++;
      const message = e instanceof Error ? e.message : String(e);
      console.error(`  ✖ ${recipient.email}: ${message}`);
      await recordStatus(db, recipient.user_id, args.sendDate, "failed", message);
      await sleep(SEND_INTERVAL_MS);
      continue;
    }

    try {
      await recordSent(db, recipient.user_id, args.sendDate, item.jobIds, messageId);
      sent++;
      console.log(`  ✔ ${recipient.email} (${item.jobIds.length})`);
    } catch (e) {
      // Do not mark as failed: the mail went out. A rerun replays the same
      // idempotency key and payload, so Resend will not send it twice.
      failed++;
      console.error(`  ! ${recipient.email}: ${e instanceof Error ? e.message : e}`);
    }
    await sleep(SEND_INTERVAL_MS);
  }

  console.log(`\nDone: sent ${sent}, failed ${failed}, skipped ${summary.skipEmpty}.`);
  if (failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
