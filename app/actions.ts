"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { appEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/auth";

export type MagicLinkState = { status: "idle" } | { status: "sent"; email: string } | { status: "error"; message: string };

const Input = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  next: z.string().optional(),
});

export async function requestMagicLink(_prev: MagicLinkState, formData: FormData): Promise<MagicLinkState> {
  const parsed = Input.safeParse({ email: formData.get("email"), next: formData.get("next") ?? undefined });
  if (!parsed.success) return { status: "error", message: "이메일 주소를 확인해 주세요." };

  const { APP_URL } = appEnv();
  const next = safeNextPath(parsed.data.next);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${APP_URL}/auth/callback?next=${encodeURIComponent(next)}` },
  });

  if (error) {
    if (error.status === 429) {
      return { status: "error", message: "잠시 후 다시 시도해 주세요. 메일 요청이 너무 잦아요." };
    }
    console.error("signInWithOtp failed", error.status, error.code);
    return { status: "error", message: "메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  return { status: "sent", email: parsed.data.email };
}
