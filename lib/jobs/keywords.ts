/**
 * First-pass keyword filter before any LLM call (spec §8 step 1), for hiring
 * boards that list staff jobs too. Scope C (2026-11-14): any short-term gig
 * where AI may be used, so creative and freelance terms joined the AI-work
 * list (제안값). The LLM then decides engagement / ai_prohibited.
 * Sources that already searched for gigs (Freelancer.com) skip this filter.
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
  // Short-term and creative work (scope C)
  "freelance",
  "contract",
  "part-time",
  "part time",
  "video editor",
  "video editing",
  "video production",
  "motion design",
  "motion graphics",
  "animator",
  "animation",
  "3d artist",
  "3d model",
  "illustrat",
  "photoshop",
  "photo editing",
  "retouch",
  "graphic design",
  "thumbnail",
  "voice actor",
  "voice over",
  "subtitl",
  "caption",
  "copywriter",
  "content writer",
  "translator",
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
