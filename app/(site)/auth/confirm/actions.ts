"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile, recordTermsAgreement } from "@/lib/profile/store";
import { getCurrentUser, safeNextPath } from "@/lib/auth";

const Input = z.object({
  token_hash: z.string().min(10).max(200),
  type: z.enum(["magiclink", "signup", "email"]),
  next: z.string().optional(),
});

/** Back to the same link with a note: the token is still unused. */
function backWithoutAgreement(formData: FormData): never {
  const q = new URLSearchParams();
  for (const k of ["token_hash", "type", "next"]) {
    const v = formData.get(k);
    if (typeof v === "string" && v) q.set(k, v);
  }
  q.set("agree", "missing");
  redirect(`/auth/confirm?${q.toString()}`);
}

/**
 * The button on /auth/confirm: checks the required box (age 14+ and the
 * terms), spends the one-time token, creates the profile row, records which
 * terms were agreed to, moves on.
 */
export async function confirmLogin(formData: FormData) {
  // The box is `required` in the page too; this is for browsers that skip it.
  if (formData.get("agree") !== "1") backWithoutAgreement(formData);
  const parsed = Input.safeParse({
    token_hash: formData.get("token_hash"),
    type: formData.get("type"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) redirect("/auth/confirm?error=invalid");
  const next = safeNextPath(parsed.data.next);

  const supabase = await createClient();
  // "email" accepts both kinds of token generateLoginToken can mail: a magic link for a confirmed
  // user, and a confirmation token for a new or not-yet-confirmed one ("magiclink" rejects the latter).
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: parsed.data.token_hash, type: "email" });
  const user = data?.user;
  if (error || !user?.email) {
    // A second click on an already used link: if this browser is signed in, just go on.
    if (await getCurrentUser()) redirect(next);
    console.error(`verifyOtp failed: ${error?.code ?? "no user"}`);
    redirect(`/auth/confirm?error=expired&next=${encodeURIComponent(next)}`);
  }

  try {
    await ensureProfile(user.id, user.email);
    await recordTermsAgreement(user.id);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
  }
  redirect(next);
}
