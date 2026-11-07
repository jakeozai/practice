/**
 * Service-role Supabase client. Bypasses RLS.
 *
 * Only for route handlers, server actions and workers (CLAUDE.md rule 5).
 * Next.js code must import it through `lib/supabase/admin.ts`, which adds the
 * `server-only` guard. Workers (plain Node via tsx) import this file directly
 * because `server-only` throws outside the Next.js server bundle.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { serviceEnv, supabasePublicEnv } from "../env";

export type ServiceClient = ReturnType<typeof createServiceClient>;

export function createServiceClient() {
  const { NEXT_PUBLIC_SUPABASE_URL } = supabasePublicEnv();
  const { SUPABASE_SERVICE_ROLE_KEY } = serviceEnv();
  return createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
