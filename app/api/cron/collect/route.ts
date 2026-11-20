import { connection, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { appEnv } from "@/lib/env";
import { botUserAgent } from "@/lib/sources/http";
import { collectSources } from "@/lib/workers/collect";
import { cronLogger, isCronRequest } from "@/lib/cron";

/** Vercel function limit for this route (seconds). */
export const maxDuration = 300;
const BUDGET_MS = 285_000;

/**
 * Daily around 19:00 KST (vercel.json): fetch every source (spec §7). Turning
 * new postings into jobs is /api/cron/process, which runs every 10 minutes and
 * paces its LLM calls; doing it here too would double the call rate.
 * `?only=<source name or endpoint>` collects one source (e.g. a source added
 * after the day's run), leaving the once-a-day boards alone.
 */
export async function GET(request: Request) {
  await connection(); // request-time only, never prerendered
  const db = createAdminClient();
  if (!(await isCronRequest(request, db))) return NextResponse.json({ ok: false }, { status: 401 });
  const { lines, log } = cronLogger();
  const only = new URL(request.url).searchParams.get("only")?.trim() || undefined;
  const collected = await collectSources(db, {
    log,
    only,
    userAgent: botUserAgent(appEnv().APP_URL),
    deadline: Date.now() + BUDGET_MS,
  });
  return NextResponse.json({ ok: true, collected, log: lines.slice(-60) });
}
