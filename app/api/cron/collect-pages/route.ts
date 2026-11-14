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
 * Page sites only (Mercor, OpenTrain, OneForma), a few extra times each
 * evening (Supabase pg_cron, migration 0012). One run fetches ~250 new pages
 * per site (≥1 s apart), and OpenTrain alone lists ~1,600, so the daily
 * /api/cron/collect run can't drain it. API boards and Freelancer.com are left
 * to the daily run (Freelancer data is a cache refreshed once a day).
 */
export async function GET(request: Request) {
  await connection(); // request-time only, never prerendered
  const db = createAdminClient();
  if (!(await isCronRequest(request, db))) return NextResponse.json({ ok: false }, { status: 401 });
  const { lines, log } = cronLogger();
  const collected = await collectSources(db, {
    log,
    userAgent: botUserAgent(appEnv().APP_URL),
    deadline: Date.now() + BUDGET_MS,
    pagesOnly: true,
  });
  return NextResponse.json({ ok: true, collected, log: lines.slice(-60) });
}
