"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { appEnv, linkEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { claimLoginLink, composeLoginEmail, confirmUrl, generateLoginToken } from "@/lib/login-link";
import { sendEmail } from "@/lib/email/send";

export type MagicLinkState = { status: "idle" } | { status: "sent"; email: string } | { status: "error"; message: string };

const Input = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  next: z.string().optional(),
  /** Hidden field people never fill; bots that fill every field are ignored. */
  website: z.string().optional(),
});

function clientIp(h: Headers): string | null {
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export async function requestMagicLink(_prev: MagicLinkState, formData: FormData): Promise<MagicLinkState> {
  const parsed = Input.safeParse({
    email: formData.get("email"),
    next: formData.get("next") ?? undefined,
    website: formData.get("website") ?? undefined,
  });
  if (!parsed.success) return { status: "error", message: "이메일 주소를 확인해 주세요." };
  const { email } = parsed.data;
  if (parsed.data.website) return { status: "sent", email };

  const { APP_URL } = appEnv();
  const { EMAIL_LINK_SECRET } = linkEnv();
  const db = createAdminClient();
  try {
    const verdict = await claimLoginLink(db, email, clientIp(await headers()), EMAIL_LINK_SECRET);
    if (verdict === "too_soon") return { status: "error", message: "방금 보냈어요. 1분 뒤에 다시 시도해 주세요." };
    if (verdict === "too_many") return { status: "error", message: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요." };

    const token = await generateLoginToken(db, email);
    const mail = await composeLoginEmail({
      email,
      url: confirmUrl(APP_URL, token, safeNextPath(parsed.data.next)),
      appUrl: APP_URL,
      // Each request is a new token, so each mail gets its own key.
      idempotencyKey: `login-${token.tokenHash.slice(0, 24)}`,
    });
    await sendEmail(mail);
  } catch (e) {
    console.error("login link failed", e instanceof Error ? e.message : e);
    return { status: "error", message: "메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  return { status: "sent", email };
}
