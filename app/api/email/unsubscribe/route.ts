import { NextResponse, type NextRequest } from "next/server";
import { verifyLink } from "@/lib/links";
import { appEnv, linkEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET  → confirmation page (no state change: scanners open mail links).
 * POST → unsubscribe. Either RFC 8058 one-click from the mail client
 *        (body `List-Unsubscribe=One-Click`, answered with 200) or the
 *        confirmation page's button (answered with a redirect).
 *
 * Expired but correctly signed tokens are accepted: an unsubscribe link in an
 * old mail must keep working.
 */
export async function GET(request: NextRequest) {
  const t = request.nextUrl.searchParams.get("t") ?? "";
  return NextResponse.redirect(`${appEnv().APP_URL}/unsubscribe?t=${encodeURIComponent(t)}`, 303);
}

export async function POST(request: NextRequest) {
  const t = request.nextUrl.searchParams.get("t") ?? "";
  const form = await request.formData().catch(() => null);
  const oneClick = form?.get("List-Unsubscribe") === "One-Click";
  const { APP_URL } = appEnv();

  const v = verifyLink(t, "unsub", linkEnv().EMAIL_LINK_SECRET);
  if (!v.ok) {
    return oneClick
      ? new NextResponse("invalid token", { status: 400 })
      : NextResponse.redirect(`${APP_URL}/unsubscribe?error=invalid`, 303);
  }

  const db = createAdminClient();
  const { error } = await db
    .from("profiles")
    .update({ digest_status: "unsubscribed", updated_at: new Date().toISOString() })
    .eq("user_id", v.payload.uid)
    .in("digest_status", ["active", "paused"]); // keep `bounced` as is

  if (error) {
    console.error("unsubscribe failed", error.message);
    return oneClick
      ? new NextResponse("temporary error", { status: 500 })
      : NextResponse.redirect(`${APP_URL}/unsubscribe?t=${encodeURIComponent(t)}&error=server`, 303);
  }

  return oneClick ? new NextResponse("unsubscribed", { status: 200 }) : NextResponse.redirect(`${APP_URL}/unsubscribe?done=1`, 303);
}
