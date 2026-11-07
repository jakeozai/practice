/** Scam score (spec §8 step 3). Values are 제안값. */
export const SCAM_SIGNALS = ["upfront_payment", "messenger_only", "personal_account", "unrealistic_pay"] as const;
export type ScamSignal = (typeof SCAM_SIGNALS)[number];

export const SCAM_POINTS_PER_SIGNAL = 25;
export const SCAM_REJECT_THRESHOLD = 60;

export function scamScore(signals: readonly ScamSignal[]): number {
  return Math.min(100, new Set(signals).size * SCAM_POINTS_PER_SIGNAL);
}

export function isScamRejected(score: number): boolean {
  return score >= SCAM_REJECT_THRESHOLD;
}
