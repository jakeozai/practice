/**
 * First-pass keyword filter before any LLM call (spec §8 step 1, 제안값).
 * Matched against title + body, case-insensitive.
 */
export const JOB_KEYWORDS = [
  "ai trainer",
  "ai training",
  "annotation",
  "annotator",
  "labeling",
  "labeler",
  "rater",
  "evaluator",
  "rlhf",
  "data contributor",
  "transcription",
  "linguist",
  "language expert",
  "korean",
] as const;

export function matchesJobKeywords(title: string, body: string): boolean {
  const text = `${title}\n${body}`.toLowerCase();
  return JOB_KEYWORDS.some((k) => text.includes(k));
}
