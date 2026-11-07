/**
 * [확인 필요] Operator line at the bottom of every mail (spec §9, §16).
 * Replace once the side-job rules are checked; until then only the
 * placeholder service name is shown.
 */
export const MAIL_FOOTER_SENDER = "AI잡5 (가칭)";

/**
 * [확인 필요] Pause between sends so we stay under the Resend plan's rate
 * limit (spec §9). 600 ms ≈ 1.7 mails/s, below Resend's documented default
 * of 2 requests/s. Raise or lower once the plan is fixed.
 */
export const SEND_INTERVAL_MS = 600;

/** Network timeout and attempts for one Resend call. */
export const SEND_TIMEOUT_MS = 15_000;
export const SEND_MAX_ATTEMPTS = 3;
