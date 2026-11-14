import { connection, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { previewPersonas } from "@/lib/workers/picks";
import { PERSONAS } from "@/lib/match/personas";
import { appEnv } from "@/lib/env";
import { cronLogger, isCronRequest } from "@/lib/cron";

/** Vercel function limit for this route (seconds). */
export const maxDuration = 300;

/**
 * Operator tool (cron-token protected): what made-up subscribers of different
 * kinds (translator, designer, developer, nurse, …) would get in tomorrow's
 * mail, picked from today's open jobs with the real rules and model. A check
 * that personalization holds for every kind of person, not only the first
 * users. Nothing stored, no mail. Callable through
 * private.call_app_cron('/api/cron/picks-personas') (0015).
 */
export async function GET(request: Request) {
  await connection(); // request-time only, never prerendered
  const db = createAdminClient();
  if (!(await isCronRequest(request, db))) return NextResponse.json({ ok: false }, { status: 401 });
  const { lines, log } = cronLogger();
  const personas = await previewPersonas(db, PERSONAS, { log, size: appEnv().DIGEST_SIZE });
  return NextResponse.json({ ok: true, personas, log: lines.slice(-40) });
}
