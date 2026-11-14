/**
 * Profile reminder inside the daily mail (spec §15 Phase 3 "프로필 갱신 메일",
 * sent as a box in the mail people already get, not an extra mail). Every two
 * weeks (2026-11-14 user decision; the spec said 30 days).
 */
import { seoulDate, seoulDayStartUtc } from "../time";

/** Ask for a fresh analysis every this many days (user decision: every two weeks). */
export const PROFILE_REFRESH_DAYS = 14;
/** (제안값) Show the reminder on this many mails from each mark, in case a day is skipped. */
export const PROFILE_REFRESH_WINDOW_DAYS = 3;

export type ProfileNudge = "missing" | "stale" | null;

/** "missing" on every mail until there is a profile; "stale" for a few days every two weeks after the last analysis. */
export function profileNudge(importedAt: string | null | undefined, sendDate: string): ProfileNudge {
  if (!importedAt) return "missing";
  // Calendar days in Seoul between the analysis and the mail.
  const ageDays = Math.round(
    (seoulDayStartUtc(sendDate).getTime() - seoulDayStartUtc(seoulDate(new Date(importedAt))).getTime()) / 86_400_000,
  );
  if (ageDays < PROFILE_REFRESH_DAYS) return null;
  return ageDays % PROFILE_REFRESH_DAYS < PROFILE_REFRESH_WINDOW_DAYS ? "stale" : null;
}
