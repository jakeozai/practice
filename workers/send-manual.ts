/**
 * Phase 0: send the jobs an admin picked to every active subscriber.
 *
 *   npm run send:manual -- <jobId> [<jobId> ...]            # dry run: print the plan
 *   npm run send:manual -- <jobId> ... --send                # actually send
 *   npm run send:manual -- <jobId> ... --only me@example.com --send   # test send to one address
 *
 * Options: --date YYYY-MM-DD (send_date, default today in Asia/Seoul)
 *
 * Same sending rules as the daily job (lib/workers/digest.ts), with the job
 * list fixed to the admin's pick and order.
 */
import { parseArgs } from "node:util";
import { z } from "zod";
import { createServiceClient, type ServiceClient } from "../lib/supabase/service";
import { appEnv } from "../lib/env";
import { seoulDate, isIsoDate } from "../lib/time";
import { DIGEST_JOB_COLUMNS, type DigestJob } from "../lib/digest/compose";
import { sendDigest } from "../lib/workers/digest";

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
  const { data, error } = await db.from("jobs").select(`${DIGEST_JOB_COLUMNS}, review_state, korea_eligible`).in("id", ids);
  if (error) fail(`Loading jobs failed: ${error.message}`);

  const byId = new Map(data.map((j) => [j.id, j]));
  const problems: string[] = [];
  for (const id of ids) {
    const j = byId.get(id);
    if (!j) problems.push(`${id}: not found`);
    else if (j.review_state !== "approved") problems.push(`${id}: review_state is ${j.review_state}`);
    else if (j.status === "closed") problems.push(`${id}: closed`);
    else if (j.korea_eligible !== true) problems.push(`${id}: korea_eligible is ${j.korea_eligible}`);
  }
  if (problems.length) fail(`These jobs can't be sent:\n  ${problems.join("\n  ")}`);

  // Keep the admin's order.
  return ids.map((id) => {
    const j = byId.get(id)!;
    return {
      id: j.id,
      company: j.company,
      title: j.title,
      title_ko: j.title_ko,
      url: j.url,
      summary_ko: j.summary_ko,
      status: j.status,
      category: j.category,
      languages: j.languages,
      english_level: j.english_level,
      engagement: j.engagement,
      pay_min: j.pay_min,
      pay_max: j.pay_max,
      pay_currency: j.pay_currency,
      pay_unit: j.pay_unit,
      hours_per_week_min: j.hours_per_week_min,
    };
  });
}

async function main() {
  const args = parseCli();
  if (args.jobIds.length > appEnv().DIGEST_SIZE) fail(`Pick at most ${appEnv().DIGEST_SIZE} jobs (DIGEST_SIZE).`);

  const db = createServiceClient();
  const jobs = await loadJobs(db, args.jobIds);
  jobs.forEach((j, i) => console.log(`  ${i + 1}. ${j.company} — ${j.title} [${j.status}]`));

  const result = await sendDigest(db, {
    log: console.log,
    sendDate: args.sendDate,
    dryRun: !args.send,
    only: args.only,
    jobs,
  });
  if (args.only && result.recipients === 0) fail(`No active subscriber with email ${args.only}.`);
  if (!args.send) console.log("\nDry run. Add --send to send.");
  if (result.failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
