import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/profile/store";
import { safeNextPath } from "@/lib/auth";

const OTP_TYPES = new Set<EmailOtpType>(["email", "magiclink", "signup", "invite", "recovery", "email_change"]);

/**
 * Magic-link landing. Supports both Supabase link styles:
 * - PKCE: `?code=...` (default {{ .ConfirmationURL }} template, same browser only)
 * - token hash: `?token_hash=...&type=email` (custom template, works across devices)
 * Then creates the profiles row on first login and moves on to `next`.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNextPath(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type && OTP_TYPES.has(type)) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  const user = ok ? (await supabase.auth.getUser()).data.user : null;
  if (!user?.email) {
    return NextResponse.redirect(new URL("/?error=auth", url.origin));
  }

  try {
    await ensureProfile(user.id, user.email);
  } catch (e) {
    console.error(e);
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
