import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { seoulDate } from "@/lib/time";
import { sendDigest } from "@/lib/workers/digest";
import { cronLogger, isCronRequest } from "@/lib/cron";

/** Vercel function limit for this route (seconds). */
export const maxDuration = 300;
const BUDGET_MS = 285_000;

/**
 * Daily at 08:00 KST (vercel.json): today's mail (spec §9). Safe to call
 * again the same day: sent/skipped users are not mailed twice and failed
 * ones are retried (digest_sends PK + Resend idempotency key).
 */
export async function GET(request: Request) {
  if (!isCronRequest(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const { lines, log } = cronLogger();
  const result = await sendDigest(createAdminClient(), {
    log,
    sendDate: seoulDate(),
    deadline: Date.now() + BUDGET_MS,
  });
  return NextResponse.json({ ok: true, result, log: lines.slice(-60) });
}
