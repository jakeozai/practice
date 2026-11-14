import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { preparePicks } from "@/lib/workers/picks";
import { appEnv } from "@/lib/env";
import { isIsoDate, seoulDate } from "@/lib/time";
import { cronLogger, isCronRequest } from "@/lib/cron";

/** Vercel function limit for this route (seconds). */
export const maxDuration = 300;
const BUDGET_MS = 285_000;

const Query = z.object({
  date: z.string().refine(isIsoDate).optional(),
  user: z.uuid().optional(),
  dry: z.enum(["1"]).optional(),
  force: z.enum(["1"]).optional(),
});

/**
 * Operator tool (cron-token protected): prepare personal picks now, or with
 * ?dry=1 show what they would be — the three, their reasons and first steps,
 * the rule ranking they came from and why other jobs were left out — without
 * storing anything. ?user= limits it to one subscriber, ?date= picks for
 * another send date, ?force=1 recomputes stored picks. Never sends mail.
 */
export async function GET(request: Request) {
  await connection(); // request-time only, never prerendered
  const db = createAdminClient();
  if (!(await isCronRequest(request, db))) return NextResponse.json({ ok: false }, { status: 401 });
  const q = Query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!q.success) return NextResponse.json({ ok: false, error: "bad query" }, { status: 400 });

  const { lines, log } = cronLogger();
  const result = await preparePicks(db, {
    log,
    deadline: Date.now() + BUDGET_MS,
    sendDate: q.data.date ?? seoulDate(),
    size: appEnv().DIGEST_SIZE,
    onlyUser: q.data.user,
    dryRun: q.data.dry === "1",
    force: q.data.force === "1",
  });
  return NextResponse.json({ ok: true, result, log: lines.slice(-40) });
}
