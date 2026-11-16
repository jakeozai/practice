import { connection, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { previewPersonas } from "@/lib/workers/picks";
import { PERSONAS } from "@/lib/match/personas";
import { parseThinking, PICK_WITH_MODEL } from "@/lib/match/pick";
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
 *
 * Experiments: `?only=translator,designer` limits the personas, `?model=on|off`
 * overrides PICK_WITH_MODEL, and `?thinking=off|<tokens>` changes how much the
 * model thinks before answering (real mail keeps the model's default).
 */
export async function GET(request: Request) {
  await connection(); // request-time only, never prerendered
  const db = createAdminClient();
  if (!(await isCronRequest(request, db))) return NextResponse.json({ ok: false }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const only = new Set((params.get("only") ?? "").split(",").map((s) => s.trim()).filter(Boolean));
  const thinking = parseThinking(params.get("thinking"));
  const model = params.get("model") === "on" ? true : params.get("model") === "off" ? false : undefined;
  const personas = only.size ? PERSONAS.filter((p) => only.has(p.id)) : PERSONAS;
  const { lines, log } = cronLogger();
  const started = Date.now();
  const result = await previewPersonas(db, personas, { log, size: appEnv().DIGEST_SIZE, thinking, model });
  return NextResponse.json({ ok: true, model: model ?? PICK_WITH_MODEL, thinking: thinking ?? "default", ms: Date.now() - started, personas: result, log: lines.slice(-40) });
}
