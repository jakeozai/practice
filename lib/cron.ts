/**
 * Who may call /api/cron/*:
 *  - Vercel Cron, with `Authorization: Bearer $CRON_SECRET` (backup schedule, vercel.json)
 *  - Supabase pg_cron through pg_net, with the token kept in Vault
 *    (exact-time schedule, supabase/migrations/0007). The database checks it,
 *    so the app never holds a copy.
 * Anyone else gets 401.
 */
import { timingSafeEqual } from "node:crypto";
import type { ServiceClient } from "./supabase/service";

export function bearer(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
}

export function isVercelCron(request: Request, secret = process.env.CRON_SECRET): boolean {
  if (!secret || secret.length < 16) return false;
  const got = Buffer.from(bearer(request));
  const want = Buffer.from(secret);
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Shape of the Vault token (32 random bytes, hex). Anything else is rejected without a DB call. */
export const DB_CRON_TOKEN = /^[0-9a-f]{64}$/;

export async function isCronRequest(request: Request, db: ServiceClient): Promise<boolean> {
  if (isVercelCron(request)) return true;
  const token = bearer(request);
  if (!DB_CRON_TOKEN.test(token)) return false;
  const { data, error } = await db.rpc("verify_cron_token", { p_token: token });
  if (error) console.error(`verify_cron_token: ${error.message}`);
  return !error && data === true;
}

/** Collects log lines for the JSON response while still printing them to the function log. */
export function cronLogger() {
  const lines: string[] = [];
  return {
    lines,
    log: (line: string) => {
      console.log(line);
      lines.push(line);
    },
  };
}
