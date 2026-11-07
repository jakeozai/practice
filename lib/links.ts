/**
 * Signed tokens for links in emails (click tracking, feedback, unsubscribe).
 *
 * token = base64url(JSON payload) + "." + base64url(HMAC-SHA256(EMAIL_LINK_SECRET, payload part))
 *
 * A GET on a mail link must never change state (security scanners open links
 * ahead of the user). Only /r/[token] records a click on GET, for statistics.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const LINK_PURPOSES = ["click", "feedback", "unsub"] as const;
export type LinkPurpose = (typeof LINK_PURPOSES)[number];

/** Link lifetime (spec §9: 30 days). */
export const LINK_TTL_DAYS = 30;

const PayloadSchema = z.object({
  uid: z.uuid(),
  purpose: z.enum(LINK_PURPOSES),
  jobId: z.uuid().optional(),
  /** Expiry, unix seconds. */
  exp: z.number().int().positive(),
});

export type LinkPayload = z.infer<typeof PayloadSchema>;

export type VerifyResult =
  | { ok: true; payload: LinkPayload; expired: boolean }
  | { ok: false; error: "MALFORMED" | "BAD_SIGNATURE" | "WRONG_PURPOSE" };

function hmac(secret: string, data: string): Buffer {
  return createHmac("sha256", secret).update(data).digest();
}

export function signLink(
  input: { uid: string; purpose: LinkPurpose; jobId?: string },
  secret: string,
  now: Date = new Date(),
): string {
  const payload: LinkPayload = PayloadSchema.parse({
    ...input,
    exp: Math.floor(now.getTime() / 1000) + LINK_TTL_DAYS * 24 * 60 * 60,
  });
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmac(secret, body).toString("base64url")}`;
}

/**
 * Checks the signature and purpose. Expiry is reported, not enforced, so each
 * caller decides: state changes should reject `expired`, while unsubscribe
 * accepts it (an old mail's unsubscribe link must keep working).
 */
export function verifyLink(
  token: string,
  purpose: LinkPurpose,
  secret: string,
  now: Date = new Date(),
): VerifyResult {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, error: "MALFORMED" };
  const [body, sig] = parts;

  const expected = hmac(secret, body);
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, error: "BAD_SIGNATURE" };
  }

  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return { ok: false, error: "MALFORMED" };
  }
  const parsed = PayloadSchema.safeParse(json);
  if (!parsed.success) return { ok: false, error: "MALFORMED" };
  if (parsed.data.purpose !== purpose) return { ok: false, error: "WRONG_PURPOSE" };

  return { ok: true, payload: parsed.data, expired: parsed.data.exp * 1000 <= now.getTime() };
}
