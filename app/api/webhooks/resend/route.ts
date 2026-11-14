import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { deliveryAction, webhookSecret } from "@/lib/email/webhook";

/**
 * Resend delivery events, signed with the webhook's secret (Svix headers).
 * Permanent bounce → digest_status 'bounced'; spam complaint → 'unsubscribed'.
 */
export async function POST(request: Request) {
  const secret = webhookSecret();
  if (!secret) return NextResponse.json({ ok: false, error: "not configured" }, { status: 503 });

  const payload = await request.text();
  let event;
  try {
    // verify() checks the signature only; the API key is not used.
    event = new Resend(process.env.RESEND_API_KEY || "re_unused").webhooks.verify({
      payload,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? "",
      },
      webhookSecret: secret,
    });
  } catch {
    console.warn("resend webhook: bad signature"); // wrong or missing secret shows up here
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const action = deliveryAction(event as Parameters<typeof deliveryAction>[0]);
  // Event type and outcome only, never addresses.
  console.log(`resend webhook: ${event.type} → ${action?.status ?? "ignored"}`);
  if (!action) return NextResponse.json({ ok: true, ignored: event.type });

  const { error } = await createAdminClient()
    .from("profiles")
    .update({ digest_status: action.status, updated_at: new Date().toISOString() })
    .in("email", action.emails)
    .in("digest_status", action.status === "bounced" ? ["active", "paused", "unsubscribed"] : ["active", "paused"]);
  if (error) {
    console.error("resend webhook update failed", error.message);
    return NextResponse.json({ ok: false }, { status: 500 }); // Resend retries
  }
  return NextResponse.json({ ok: true, status: action.status });
}
