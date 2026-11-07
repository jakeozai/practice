import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { ProfileSchema, missingFields, toProfileColumns } from "@/lib/profile/parse";
import { ensureProfile } from "@/lib/profile/store";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

const Body = z.object({ profile: z.record(z.string(), z.unknown()) });

const MISSING_KO = { english_level: "영어 수준", fields: "관심 분야", weekly_hours: "주당 가능 시간" } as const;

/** Re-validates the confirmed profile on the server and saves only the parsed fields. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, message: "로그인이 필요해요." }, { status: 401 });

  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ ok: false, message: "잘못된 요청이에요." }, { status: 400 });

  const profile = ProfileSchema.parse(body.data.profile);
  const missing = missingFields(profile);
  if (missing.length) {
    return NextResponse.json(
      { ok: false, missing, message: `${missing.map((m) => MISSING_KO[m]).join(", ")}을(를) 채워 주세요.` },
      { status: 422 },
    );
  }

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
  return NextResponse.json({ ok: true });
}
