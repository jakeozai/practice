import "server-only";
import { createAdminClient } from "../supabase/admin";
import { TERMS_VERSION } from "../terms";

/**
 * Creates the profiles row on first login. profiles has no insert policy for
 * users, so this runs with the service role (route handlers only).
 */
export async function ensureProfile(userId: string, email: string): Promise<void> {
  const db = createAdminClient();
  const { error } = await db
    .from("profiles")
    .upsert({ user_id: userId, email: email.toLowerCase(), digest_status: "active" }, {
      onConflict: "user_id",
      ignoreDuplicates: true,
    });
  if (error) throw new Error(`ensureProfile failed: ${error.message}`);
}

/**
 * Records that this member ticked "만 14세 이상이고, 이용약관에 동의해요" on
 * /auth/confirm (the proof that the terms bind them). Re-agreeing to the same
 * version keeps the first time.
 */
export async function recordTermsAgreement(userId: string): Promise<void> {
  const db = createAdminClient();
  const { error } = await db
    .from("profiles")
    .update({ terms_version: TERMS_VERSION, terms_agreed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .or(`terms_version.is.null,terms_version.neq.${TERMS_VERSION}`);
  if (error) throw new Error(`recordTermsAgreement failed: ${error.message}`);
}
