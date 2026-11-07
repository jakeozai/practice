import "server-only";
import { createAdminClient } from "../supabase/admin";

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
