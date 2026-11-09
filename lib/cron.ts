/**
 * Vercel Cron calls /api/cron/* with `Authorization: Bearer $CRON_SECRET`.
 * Anyone else (or a deployment without CRON_SECRET) gets 401.
 */
import { timingSafeEqual } from "node:crypto";

export function isCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
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
