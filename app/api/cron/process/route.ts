import { connection, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processPostings } from "@/lib/workers/process";
import { cronLogger, isCronRequest } from "@/lib/cron";

/** Vercel function limit for this route (seconds). */
export const maxDuration = 300;
const BUDGET_MS = 285_000;

/**
 * Every 10 minutes from 19:00 to 05:50 KST (Supabase pg_cron, migrations 0008/0009): turn waiting postings
 * into jobs (spec §8). LLM calls are paced to the Gateway rate limit, so the
 * backlog drains over several runs; with nothing waiting a run ends at once.
 */
export async function GET(request: Request) {
  await connection(); // request-time only, never prerendered
  const db = createAdminClient();
  if (!(await isCronRequest(request, db))) return NextResponse.json({ ok: false }, { status: 401 });
  const { lines, log } = cronLogger();
  const processed = await processPostings(db, { log, deadline: Date.now() + BUDGET_MS });
  return NextResponse.json({ ok: true, processed, log: lines.slice(-40) });
}
