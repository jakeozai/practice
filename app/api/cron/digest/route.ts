import { connection, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { seoulDate } from "@/lib/time";
import { sendDigest } from "@/lib/workers/digest";
import { cronLogger, isCronRequest } from "@/lib/cron";

/** Vercel function limit for this route (seconds). */
export const maxDuration = 300;
const BUDGET_MS = 285_000;

/**
 * Today's mail (spec §9). Called at 06:00 KST sharp by Supabase pg_cron
 * (migration 0007) and again around 07:00 KST by Vercel Cron as a backup.
 * Safe to call again the same day: sent/skipped users are not mailed twice and
 * failed ones are retried (digest_sends PK + Resend idempotency key).
 */
export async function GET(request: Request) {
  await connection(); // request-time only, never prerendered
  const db = createAdminClient();
  if (!(await isCronRequest(request, db))) return NextResponse.json({ ok: false }, { status: 401 });
  const { lines, log } = cronLogger();
  const result = await sendDigest(db, {
    log,
    sendDate: seoulDate(),
    deadline: Date.now() + BUDGET_MS,
  });
  return NextResponse.json({ ok: true, result, log: lines.slice(-60) });
}
