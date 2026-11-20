/**
 * How fast the morning mail goes out (2026-11-20: several mails in flight at
 * once instead of one after another, so the 06:00 run reaches thousands of
 * subscribers instead of about 250).
 *
 * The limit is the mail service's request rate, not our code:
 * - Resend: 10 requests/s per team, shared by every API key, the same on every
 *   plan, no burst (checked 2026-11-20, resend.com/docs/api-reference/rate-limit).
 *   The digest takes 8 so login links and feedback alerts still get through.
 * - Amazon SES: the account's own sending rate (SES console, "Sending
 *   statistics"; often 14/s when production access is granted). The default 10
 *   stays under that; set EMAIL_SENDS_PER_SECOND after AWS raises it.
 */
export const DEFAULT_SENDS_PER_SECOND = { resend: 8, ses: 10, file: 50 } as const;
export type Transport = keyof typeof DEFAULT_SENDS_PER_SECOND;

/** Upper bound for EMAIL_SENDS_PER_SECOND: one function instance renders every mail itself. */
export const MAX_SENDS_PER_SECOND = 40;

export function sendsPerSecond(transport: Transport, configured?: number): number {
  const n = configured ?? DEFAULT_SENDS_PER_SECOND[transport];
  return Math.min(MAX_SENDS_PER_SECOND, Math.max(0.1, n));
}

/**
 * Mails in flight at once. One mail takes about a second end to end (render,
 * send, three small writes), so 1.5× the rate keeps the rate busy.
 */
export function sendConcurrency(perSecond: number): number {
  return Math.max(1, Math.min(60, Math.ceil(perSecond * 1.5)));
}

export type RateGate = {
  /** Waits for the next start slot and claims it. */
  take(): Promise<void>;
};

/**
 * Starts are spaced 1000/perSecond ms apart, so no one-second window ever holds
 * more than `perSecond` requests (Resend allows no burst).
 */
export function createRateGate(
  perSecond: number,
  now: () => number = Date.now,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): RateGate {
  const interval = 1000 / perSecond;
  let next = 0;
  return {
    async take() {
      const slot = Math.max(now(), next);
      next = slot + interval;
      const wait = slot - now();
      if (wait > 0) await sleep(wait);
    },
  };
}
