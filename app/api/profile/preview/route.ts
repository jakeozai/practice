import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { MAX_INPUT_CHARS, PARSE_ERROR_MESSAGES_KO, parseProfileText } from "@/lib/profile/parse";

// Generous bound; parseProfileText itself answers TOO_LARGE above MAX_INPUT_CHARS.
const Body = z.object({ text: z.string().max(MAX_INPUT_CHARS * 5) });

/**
 * Parses pasted AI output and returns the profile. Saves nothing and never
 * logs the pasted text (CLAUDE.md rule 2).
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, message: "로그인이 필요해요." }, { status: 401 });

  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ ok: false, error: "TOO_LARGE", message: PARSE_ERROR_MESSAGES_KO.TOO_LARGE }, { status: 400 });
  }

  const result = parseProfileText(body.data.text);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, message: PARSE_ERROR_MESSAGES_KO[result.error] },
      { status: 422 },
    );
  }
  return NextResponse.json(result);
}
