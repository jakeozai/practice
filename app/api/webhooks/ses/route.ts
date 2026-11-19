import { NextResponse } from "next/server";
import { parseSnsMessage, sesDeliveryAction, verifySnsMessage } from "@/lib/email/sns";
import { applyDeliveryAction } from "@/lib/email/delivery";

/**
 * Amazon SES bounce and complaint events, delivered by SNS (docs/email/ses-switch.md).
 * Only messages Amazon signed, from our own topic (SES_SNS_TOPIC_ARN), count.
 * Permanent bounce → digest_status 'bounced'; spam complaint → 'unsubscribed'
 * (the same as /api/webhooks/resend).
 */
export async function POST(request: Request) {
  const topic = process.env.SES_SNS_TOPIC_ARN?.trim();
  if (!topic) return NextResponse.json({ ok: false, error: "not configured" }, { status: 503 });

  const message = parseSnsMessage(await request.text());
  if (!message || message.TopicArn !== topic || !(await verifySnsMessage(message))) {
    console.warn("ses webhook: rejected (bad signature or another topic)");
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (message.Type === "SubscriptionConfirmation") {
    // Opening the signed SubscribeURL (an Amazon host, checked above) confirms the subscription.
    const url = message.SubscribeURL ?? "";
    const host = (() => {
      try {
        return new URL(url).hostname;
      } catch {
        return "";
      }
    })();
    if (!/^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/.test(host)) return NextResponse.json({ ok: false }, { status: 400 });
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    console.log(`ses webhook: subscription confirmed (${res.status})`);
    return NextResponse.json({ ok: res.ok });
  }
  if (message.Type !== "Notification") return NextResponse.json({ ok: true, ignored: message.Type });

  const action = sesDeliveryAction(message.Message);
  // Event outcome only, never addresses.
  console.log(`ses webhook: → ${action?.status ?? "ignored"}`);
  if (!action) return NextResponse.json({ ok: true, ignored: true });

  const { error } = await applyDeliveryAction(action);
  if (error) {
    console.error("ses webhook update failed", error);
    return NextResponse.json({ ok: false }, { status: 500 }); // SNS retries
  }
  return NextResponse.json({ ok: true, status: action.status });
}
