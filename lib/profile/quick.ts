/**
 * Five-question profile (spec §15 Phase 2 "5문항 대체 폼"): for people who
 * don't use an AI assistant, or whose assistant knows little about them.
 * The answers become the same validated Profile the AI import produces.
 */
import type { EnglishLevel } from "./parse";

/** Q1 choices. Wording follows the matching dictionary (lib/match/concepts.ts) so each choice is understood. */
export const QUICK_FIELD_CHOICES = [
  "영상 편집",
  "유튜브·숏폼 콘텐츠",
  "썸네일·그래픽 디자인",
  "로고·브랜딩",
  "사진 보정·포토샵",
  "모션그래픽·애니메이션",
  "3D 모델링",
  "생성형 AI 영상·이미지",
  "웹·앱 개발",
  "AI 자동화·챗봇",
  "글쓰기·카피",
  "번역",
  "AI 트레이너·언어 평가",
  "데이터 라벨링",
  "마케팅",
  "오디오·음악",
] as const;

/** Profile limit for fields (lib/profile/parse.ts). */
export const QUICK_MAX_FIELDS = 5;

export type QuickAnswers = {
  /** Q1, in the order picked (first = most wanted). */
  fields: string[];
  /** Q2, comma separated tools. */
  skills: string;
  /** Q3 */
  englishLevel: EnglishLevel | "";
  /** Q4 */
  weeklyHours: string;
  /** Q5, USD */
  minHourlyUsd: string;
};

function splitList(s: string): string[] {
  return s
    .split(/[,，、\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Answers → raw profile object for ProfileSchema (the server validates it again). */
export function quickProfile(a: QuickAnswers): Record<string, unknown> {
  return {
    version: 1,
    country: "KR",
    languages: [{ code: "ko", level: "native" }, ...(a.englishLevel ? [{ code: "en", level: a.englishLevel }] : [])],
    fields: a.fields.slice(0, QUICK_MAX_FIELDS),
    skills: splitList(a.skills),
    domain_expertise: [],
    experience_summary_ko: "",
    weekly_hours: a.weeklyHours.trim() === "" ? null : a.weeklyHours,
    preferred_time: null,
    min_hourly_usd: a.minHourlyUsd.trim() === "" ? null : a.minHourlyUsd,
    has_desktop: null,
    avoid: [],
    notes_ko: "",
  };
}
