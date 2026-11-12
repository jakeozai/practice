import { connection, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { appEnv } from "@/lib/env";
import { botUserAgent } from "@/lib/sources/http";
import { collectSources } from "@/lib/workers/collect";
import { processPostings } from "@/lib/workers/process";
import { cronLogger, isCronRequest } from "@/lib/cron";

/** Vercel function limit for this route (seconds). */
export const maxDuration = 300;
/** Collection gets the first part of the budget, processing the rest. */
const COLLECT_BUDGET_MS = 150_000;
const TOTAL_BUDGET_MS = 285_000;

/** Daily around 19:00 KST (vercel.json): collect postings, then turn new ones into jobs (spec §7, §8). */
export async function GET(request: Request) {
  await connection(); // request-time only, never prerendered
  const started = Date.now();
  const db = createAdminClient();
  if (!(await isCronRequest(request, db))) return NextResponse.json({ ok: false }, { status: 401 });
  const { lines, log } = cronLogger();

  const collected = await collectSources(db, {
    log,
    userAgent: botUserAgent(appEnv().APP_URL),
    deadline: started + COLLECT_BUDGET_MS,
  });
  const processed = await processPostings(db, { log, deadline: started + TOTAL_BUDGET_MS });
  return NextResponse.json({ ok: true, collected, processed, log: lines.slice(-60) });
}
