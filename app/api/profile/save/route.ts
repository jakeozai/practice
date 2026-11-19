import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { MAX_INPUT_CHARS, ProfileSchema, toProfileColumns } from "@/lib/profile/parse";
import { applyRawChoice } from "@/lib/profile/raw";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureProfile } from "@/lib/profile/store";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

const Body = z.object({
  profile: z.record(z.string(), z.unknown()),
  /** The pasted AI answer, sent only while the optional consent box is ticked (lib/profile/consent.ts). */
  raw: z.string().max(MAX_INPUT_CHARS).nullable().optional(),
  /** The optional consent box; absent from older pages = no change. */
  rawConsent: z.boolean().optional(),
});

/** Re-validates the confirmed profile on the server and saves the parsed fields; the raw answer only with consent. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, message: "로그인이 필요해요." }, { status: 401 });

  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ ok: false, message: "잘못된 요청이에요." }, { status: 400 });

  // Re-validated on the server. Empty fields are fine: the user only confirms what their AI found.
  const profile = ProfileSchema.parse(body.data.profile);

  await ensureProfile(user.id, user.email);
  const now = new Date().toISOString();
  const { profile_json, ...columns } = toProfileColumns(profile);

  // User-scoped client: RLS allows updating only the caller's own row.
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      ...columns,
      profile_json: profile_json as unknown as Json,
      profile_source: "ai_import",
      profile_imported_at: now,
      updated_at: now,
    })
    .eq("user_id", user.id);

  if (error) {
    console.error("profile save failed", error.code, error.message);
    return NextResponse.json({ ok: false, message: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }

  // The raw AI answer only with the optional consent; unticking it withdraws (deletes what was kept).
  if (body.data.rawConsent !== undefined) {
    try {
      await applyRawChoice(createAdminClient(), user.id, { consent: body.data.rawConsent, raw: body.data.rawConsent ? body.data.raw : null });
    } catch (e) {
      console.error("raw choice failed", (e as Error).message); // never the text itself
      return NextResponse.json({ ok: false, message: "분석 결과는 저장했지만 원문 동의를 처리하지 못했어요. 다시 시도해 주세요." }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}
