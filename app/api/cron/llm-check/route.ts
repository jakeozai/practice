import { connection, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronRequest } from "@/lib/cron";
import { AI_GATEWAY_BASE_URL, createAnthropic, fastModelConfig, firstText } from "@/lib/llm/client";

export const maxDuration = 60;

type GatewayModel = {
  id: string;
  type?: string;
  pricing?: { input?: string; output?: string };
  model_eligibility?: { status?: string; reason?: string };
};

/**
 * Operator check (cron-token protected): which language models this Vercel
 * account may call through AI Gateway right now, and whether the configured
 * model (or ?model=) answers a one-line Messages API request.
 */
export async function GET(request: Request) {
  await connection();
  if (!(await isCronRequest(request, createAdminClient()))) return NextResponse.json({ ok: false }, { status: 401 });

  const config = await fastModelConfig();
  if (!config) return NextResponse.json({ ok: false, error: "no model or credential configured" });
  const model = new URL(request.url).searchParams.get("model") ?? config.model;

  const res = await fetch(`${AI_GATEWAY_BASE_URL}/v1/models?include_availability`, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await res.json()) as { data?: GatewayModel[]; request_context_availability?: unknown };
  const perM = (s?: string) => (s ? Math.round(Number(s) * 1e6 * 1000) / 1000 : null);
  const eligible = (body.data ?? [])
    .filter((m) => m.type === "language" && m.model_eligibility?.status === "eligible")
    .map((m) => ({ id: m.id, in: perM(m.pricing?.input), out: perM(m.pricing?.output) }))
    .sort((a, b) => (a.in ?? 99) - (b.in ?? 99));
  const ineligibleReasons = [
    ...new Set((body.data ?? []).filter((m) => m.model_eligibility?.status === "ineligible").map((m) => m.model_eligibility?.reason)),
  ];

  let probe: string;
  try {
    const msg = await createAnthropic(config).messages.create({
      model,
      max_tokens: 20,
      messages: [{ role: "user", content: "Reply with the single word: ok" }],
    });
    probe = `ok: ${firstText(msg).slice(0, 40)}`;
  } catch (e) {
    probe = `error: ${(e instanceof Error ? e.message : String(e)).slice(0, 300)}`;
  }

  return NextResponse.json({
    ok: true,
    via: config.via,
    model,
    probe,
    account: body.request_context_availability ?? null,
    eligibleCount: eligible.length,
    cheapestEligible: eligible.slice(0, 40),
    ineligibleReasons,
  });
}
