/**
 * Pause between sends (spec §9). Resend's API limit is 10 requests/s per
 * team, shared by every API key on the team and the same on every plan
 * (checked 2026-11-07, resend.com/docs/api-reference/rate-limit). 600 ms
 * (~1.7/s) leaves room for other callers; a 429 is retried with backoff in
 * send.ts. The plan's daily/monthly quota is a separate limit — check it in
 * the Resend dashboard before the subscriber count grows.
 */
export const SEND_INTERVAL_MS = 600;

/** Network timeout and attempts for one Resend call. */
export const SEND_TIMEOUT_MS = 15_000;
export const SEND_MAX_ATTEMPTS = 3;
