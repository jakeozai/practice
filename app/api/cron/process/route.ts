import { connection, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processPostings } from "@/lib/workers/process";
import { preparePicks } from "@/lib/workers/picks";
import { createPacer, llmRequestsPerMinute } from "@/lib/llm/pace";
import { appEnv } from "@/lib/env";
import { seoulDate, seoulSendTime } from "@/lib/time";
import { cronLogger, isCronRequest } from "@/lib/cron";

/** Vercel function limit for this route (seconds). */
export const maxDuration = 300;
const BUDGET_MS = 285_000;
/** (제안값) The runs this close before the 06:00 KST mail prepare everyone's personal picks first. */
const PICKS_WINDOW_MS = 35 * 60_000;

/**
 * Every 10 minutes from 19:00 to 05:50 KST (Supabase pg_cron, migrations 0008/0009): turn waiting postings
 * into jobs (spec §8). LLM calls are paced to the Gateway rate limit, so the
 * backlog drains over several runs; with nothing waiting a run ends at once.
 *
 * From 05:30 KST each run first prepares the morning's personal picks
 * (lib/workers/picks.ts) for subscribers who don't have them yet, sharing the
 * same rate limiter, then goes back to processing.
 */
export async function GET(request: Request) {
  await connection(); // request-time only, never prerendered
  const db = createAdminClient();
  if (!(await isCronRequest(request, db))) return NextResponse.json({ ok: false }, { status: 401 });
  const { lines, log } = cronLogger();
  const deadline = Date.now() + BUDGET_MS;
  const pacer = createPacer(llmRequestsPerMinute());

  let picks = null;
  const sendDate = seoulDate();
  const untilSend = seoulSendTime(sendDate).getTime() - Date.now();
  if (untilSend > 0 && untilSend <= PICKS_WINDOW_MS) {
    try {
      picks = await preparePicks(db, { log, deadline, pacer, sendDate, size: appEnv().DIGEST_SIZE });
    } catch (e) {
      log(`  ! picks failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  const processed = await processPostings(db, { log, deadline, pacer });
  return NextResponse.json({
    ok: true,
    processed,
    picks: picks && { users: picks.users, llm: picks.llm, rules: picks.rules, kept: picks.kept, empty: picks.empty },
    log: lines.slice(-40),
  });
}
