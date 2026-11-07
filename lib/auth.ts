import "server-only";
import { createClient } from "./supabase/server";
import { isAdminEmail } from "./env";

export type CurrentUser = { id: string; email: string };

/** The signed-in user from the verified session, or null. Reads cookies. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;
  const { sub, email } = data.claims;
  if (typeof sub !== "string" || typeof email !== "string") return null;
  return { id: sub, email };
}

export async function getAdminUser(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return user && isAdminEmail(user.email) ? user : null;
}

/** Relative in-app path only; anything else falls back to `fallback`. */
export function safeNextPath(next: string | null | undefined, fallback = "/onboarding"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
