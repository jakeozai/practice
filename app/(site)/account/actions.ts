"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser, safeNextPath } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { appEnv, linkEnv } from "@/lib/env";
import { claimLoginLink, composeAccountCodeEmail, generateAccountCode } from "@/lib/login-link";
import { sendEmail } from "@/lib/email/send";

/** Stop or restart the daily mail (privacy policy §13: 처리정지). */
export async function setDigest(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/account");
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
  if (!user) redirect("/account");
  if (formData.get("confirm") !== "탈퇴") redirect("/account?error=confirm");

  const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
  if (error) {
    console.error("deleteAccount failed", error.message);
    redirect("/account?error=server");
  }
  await (await createClient()).auth.signOut();
  redirect("/account/deleted");
}

/** Forget the sign-in on this browser only (other devices stay signed in). */
export async function signOutHere() {
  await (await createClient()).auth.signOut({ scope: "local" });
  redirect("/account?signedout=1");
}

export type CodeState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string; email?: string };

const Email = z.string().trim().toLowerCase().max(254).pipe(z.email());

function clientIp(h: Headers): string | null {
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

/**
 * 내 정보 on a device that isn't signed in: mail a six-digit code to the
 * address. The answer is the same whether or not it belongs to a subscriber.
 */
export async function requestAccountCode(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const email = Email.safeParse(formData.get("email"));
  if (!email.success) return { status: "error", message: "이메일 주소를 다시 확인해 주세요." };
  const db = createAdminClient();
  try {
    const verdict = await claimLoginLink(db, email.data, clientIp(await headers()), linkEnv().EMAIL_LINK_SECRET);
    if (verdict === "too_soon") return { status: "error", message: "방금 보냈어요. 1분 뒤에 다시 시도해 주세요.", email: email.data };
    if (verdict === "too_many") return { status: "error", message: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.", email: email.data };
    const code = await generateAccountCode(db, email.data);
    if (code) {
      const mail = await composeAccountCodeEmail({
        email: email.data,
        code,
        appUrl: appEnv().APP_URL,
        idempotencyKey: `account-code-${email.data}-${code}`,
      });
      await sendEmail(mail);
    }
  } catch (e) {
    console.error("account code failed", e instanceof Error ? e.message : e);
    return { status: "error", message: "메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.", email: email.data };
  }
  return { status: "sent", email: email.data };
}

/** The code from the mail signs this browser in, then 내 정보 (or `next`) opens. */
export async function verifyAccountCode(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const email = Email.safeParse(formData.get("email"));
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (!email.success) return { status: "error", message: "이메일 주소를 다시 확인해 주세요." };
  if (code.length < 6 || code.length > 10) return { status: "error", message: "메일로 받은 6자리 숫자를 입력해 주세요.", email: email.data };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: email.data, token: code, type: "email" });
  if (error) {
    console.error(`account code verify failed: ${error.code ?? error.message}`);
    return { status: "error", message: "코드가 맞지 않거나 시간이 지났어요. 메일의 숫자를 다시 확인하거나 새 코드를 받아 주세요.", email: email.data };
  }
  redirect(safeNextPath(String(formData.get("next") ?? ""), "/account"));
}
