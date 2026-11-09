import { NextResponse } from "next/server";
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

/** Daily at 19:00 KST (vercel.json): collect postings, then turn new ones into jobs (spec §7, §8). */
export async function GET(request: Request) {
  if (!isCronRequest(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const started = Date.now();
  const { lines, log } = cronLogger();
  const db = createAdminClient();

  const collected = await collectSources(db, {
    log,
    userAgent: botUserAgent(appEnv().APP_URL),
    deadline: started + COLLECT_BUDGET_MS,
  });
  const processed = await processPostings(db, { log, deadline: started + TOTAL_BUDGET_MS });
  return NextResponse.json({ ok: true, collected, processed, log: lines.slice(-60) });
}
