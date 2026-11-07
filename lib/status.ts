/** Repost / talent-pool status (spec §8 step 3). Thresholds are 제안값. */
export const REPOST_WINDOW_DAYS = 60;
export const REPOST_THRESHOLD = 3;

/**
 * `sameTitleCount` = jobs with the same company + title_normalized first seen
 * within REPOST_WINDOW_DAYS, including this one.
 */
export function decideStatus(input: { isTalentPool: boolean; sameTitleCount: number }): "open" | "pool" {
  return input.isTalentPool || input.sameTitleCount >= REPOST_THRESHOLD ? "pool" : "open";
}
