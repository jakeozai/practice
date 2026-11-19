/**
 * Keeps or forgets the pasted AI answer by the person's choice (lib/profile/consent.ts).
 * Service role only: profile_raw has no policies.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { parseProfileText } from "./parse";
import { RAW_CONSENT_VERSION } from "./consent";

type Db = SupabaseClient<Database>;

export type RawChoice = { consent: boolean; raw?: string | null };

/**
 * consent true: record the consent (first time) and keep `raw` if it is a real AI answer
 * (it must hold a profile block; anything else is not stored).
 * consent false: withdraw: delete what was kept and clear the consent.
 */
export async function applyRawChoice(db: Db, userId: string, choice: RawChoice, now = new Date()): Promise<{ stored: boolean }> {
  if (!choice.consent) {
    const { error: delError } = await db.from("profile_raw").delete().eq("user_id", userId);
    if (delError) throw new Error(`delete profile_raw: ${delError.message}`);
    const { error } = await db.from("profiles").update({ raw_consent_at: null, raw_consent_version: null }).eq("user_id", userId);
    if (error) throw new Error(`clear raw consent: ${error.message}`);
    return { stored: false };
  }

  const { data: row, error: readError } = await db.from("profiles").select("raw_consent_at, raw_consent_version").eq("user_id", userId).maybeSingle();
  if (readError) throw new Error(`load raw consent: ${readError.message}`);
  if (!row?.raw_consent_at || row.raw_consent_version !== RAW_CONSENT_VERSION) {
    const { error } = await db
      .from("profiles")
      .update({ raw_consent_at: now.toISOString(), raw_consent_version: RAW_CONSENT_VERSION })
      .eq("user_id", userId);
    if (error) throw new Error(`record raw consent: ${error.message}`);
  }

  const raw = choice.raw?.trim();
  if (!raw || !parseProfileText(raw).ok) return { stored: false };
  const { error } = await db.from("profile_raw").insert({ user_id: userId, raw_text: raw, consent_version: RAW_CONSENT_VERSION });
  if (error) throw new Error(`store profile_raw: ${error.message}`);
  return { stored: true };
}
