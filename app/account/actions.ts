"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Stop or restart the daily mail (privacy policy §13: 처리정지). */
export async function setDigest(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/?next=/account");
  const on = formData.get("on") === "1";
  const db = createAdminClient();
  const { error } = await db
    .from("profiles")
    .update({ digest_status: on ? "active" : "unsubscribed", updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .neq("digest_status", "bounced");
  if (error) console.error("setDigest failed", error.message);
  redirect("/account?saved=1");
}

/** Delete the account and everything tied to it (auth.users → on delete cascade). */
export async function deleteAccount(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/?next=/account");
  if (formData.get("confirm") !== "탈퇴") redirect("/account?error=confirm");

  const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
  if (error) {
    console.error("deleteAccount failed", error.message);
    redirect("/account?error=server");
  }
  await (await createClient()).auth.signOut();
  redirect("/account/deleted");
}
