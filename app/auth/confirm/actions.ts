"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/profile/store";
import { safeNextPath } from "@/lib/auth";

const Input = z.object({
  token_hash: z.string().min(10).max(200),
  type: z.enum(["magiclink", "signup", "email"]),
  next: z.string().optional(),
});

/** The button on /auth/confirm: spends the one-time token, creates the profile row, moves on. */
export async function confirmLogin(formData: FormData) {
  const parsed = Input.safeParse({
    token_hash: formData.get("token_hash"),
    type: formData.get("type"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) redirect("/?error=auth");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: parsed.data.token_hash, type: parsed.data.type });
  const user = data?.user;
  if (error || !user?.email) redirect("/?error=auth");

  try {
    await ensureProfile(user.id, user.email);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
  }
  redirect(safeNextPath(parsed.data.next));
}
