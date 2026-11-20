/*
 * Send rate: lib/email/rate.ts (2026-11-20, several mails in flight instead of
 * one every 600 ms). A 429 is still retried with backoff in send.ts. The plan's
 * daily/monthly quota is a separate limit — check it in the Resend dashboard.
 */

/** Network timeout and attempts for one Resend call. */
export const SEND_TIMEOUT_MS = 15_000;
export const SEND_MAX_ATTEMPTS = 3;
