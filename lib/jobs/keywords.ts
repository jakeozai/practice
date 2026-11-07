/**
 * First-pass keyword filter before any LLM call (spec §8 step 1).
 * Scope (2026-11-07): any short-term work that needs AI, from any country or
 * site, so the spec's AI-training list (제안값) is extended with general AI
 * terms and Korean terms for Korean sites. The LLM then decides
 * ai_related / engagement.
 */
export const JOB_KEYWORDS = [
  // spec §8 list
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
  // AI work in general
  "artificial intelligence",
  "machine learning",
  "generative",
  "llm",
  "prompt",
  "chatgpt",
  "chatbot",
  // Korean sites
  "인공지능",
  "생성형",
  "라벨링",
  "어노테이션",
  "학습데이터",
  "학습 데이터",
  "데이터 가공",
  "데이터 수집",
  "프롬프트",
  "챗gpt",
  "챗봇",
  "전사 작업",
] as const;

/** "AI" as a word (not "said", "maintain"), in English or Korean text. */
const AI_WORD = /(^|[^a-z])ai([^a-z]|$)/i;

export function matchesJobKeywords(title: string, body: string): boolean {
  const text = `${title}\n${body}`.toLowerCase();
  return AI_WORD.test(text) || JOB_KEYWORDS.some((k) => text.includes(k));
}
