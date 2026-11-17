/**
 * Converts between a Profile and the flat string form edited on the
 * confirmation screen. The result is raw input: the server re-validates it
 * with ProfileSchema before saving.
 */
import type { AiLevel, EducationLevel, EnglishLevel, PayPreference, PreferredTime, Profile, WantedWork, WorkStatus } from "./parse";

export type ProfileDraft = {
  englishLevel: EnglishLevel | "";
  fields: string;
  skills: string;
  domainExpertise: string;
  experience: string;
  weeklyHours: string;
  preferredTime: PreferredTime | "";
  minHourlyUsd: string;
  hasDesktop: "yes" | "no" | "";
  avoid: string;
  notes: string;
  // Structured items (2026-11-17)
  workStatus: WorkStatus | "";
  jobRole: string;
  industry: string;
  careerYears: string;
  education: EducationLevel | "";
  licenses: string;
  aiTools: string;
  aiLevel: AiLevel | "";
  wantedWork: WantedWork[];
  payPreference: PayPreference | "";
};

export const WORK_STATUS_OPTIONS: { value: WorkStatus; label: string }[] = [
  { value: "employed", label: "직장인" },
  { value: "freelancer", label: "프리랜서" },
  { value: "self_employed", label: "자영업·사업" },
  { value: "student", label: "학생" },
  { value: "job_seeking", label: "구직 중" },
  { value: "homemaker", label: "전업주부" },
  { value: "other", label: "기타" },
];

export const EDUCATION_OPTIONS: { value: EducationLevel; label: string }[] = [
  { value: "high_school", label: "고졸" },
  { value: "associate", label: "전문학사" },
  { value: "bachelor", label: "학사" },
  { value: "master", label: "석사" },
  { value: "doctorate", label: "박사" },
];

export const AI_LEVEL_OPTIONS: { value: AiLevel; label: string }[] = [
  { value: "beginner", label: "써 본 정도예요" },
  { value: "daily", label: "업무에 매일 써요" },
  { value: "builder", label: "AI로 결과물을 만들어요" },
];

export const WANTED_WORK_OPTIONS: { value: WantedWork; label: string }[] = [
  { value: "language", label: "번역·언어 평가" },
  { value: "domain", label: "전문 분야 AI 평가" },
  { value: "labeling", label: "데이터 라벨링" },
  { value: "office", label: "문서·엑셀 작업" },
  { value: "writing", label: "글쓰기" },
  { value: "design", label: "디자인" },
  { value: "video", label: "영상" },
  { value: "motion_3d", label: "모션·3D" },
  { value: "dev", label: "개발·자동화" },
];

export const PAY_PREFERENCE_OPTIONS: { value: PayPreference; label: string }[] = [
  { value: "hourly", label: "시급" },
  { value: "project", label: "건당" },
  { value: "any", label: "상관없어요" },
];

/** Label of an option value, or null. */
export function optionLabel<T extends string>(options: { value: T; label: string }[], value: T | null | undefined): string | null {
  return options.find((o) => o.value === value)?.label ?? null;
}

export const ENGLISH_LEVEL_OPTIONS: { value: EnglishLevel; label: string }[] = [
  { value: "none", label: "영어는 거의 못 해요" },
  { value: "reading", label: "읽고 이해할 수 있어요 (독해)" },
  { value: "conversational", label: "일상 대화를 할 수 있어요" },
  { value: "business", label: "업무에 쓸 수 있어요 (유창)" },
  { value: "native", label: "원어민 수준이에요" },
];

export const PREFERRED_TIME_OPTIONS: { value: PreferredTime; label: string }[] = [
  { value: "morning", label: "아침" },
  { value: "daytime", label: "낮" },
  { value: "evening", label: "저녁" },
  { value: "night", label: "밤·새벽" },
  { value: "any", label: "상관없어요" },
];

const joinList = (items: string[]) => items.join(", ");
const splitList = (s: string) =>
  s
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);

export function toDraft(p: Profile): ProfileDraft {
  return {
    englishLevel: p.languages.find((l) => l.code === "en")?.level ?? "",
    fields: joinList(p.fields),
    skills: joinList(p.skills),
    domainExpertise: joinList(p.domain_expertise),
    experience: p.experience_summary_ko,
    weeklyHours: p.weekly_hours === null ? "" : String(p.weekly_hours),
    preferredTime: p.preferred_time ?? "",
    minHourlyUsd: p.min_hourly_usd === null ? "" : String(p.min_hourly_usd),
    hasDesktop: p.has_desktop === null ? "" : p.has_desktop ? "yes" : "no",
    avoid: joinList(p.avoid),
    notes: p.notes_ko,
    workStatus: p.work_status ?? "",
    jobRole: p.job_role,
    industry: p.industry,
    careerYears: p.career_years === null ? "" : String(p.career_years),
    education: p.education_level ?? "",
    licenses: joinList(p.licenses),
    aiTools: joinList(p.ai_tools),
    aiLevel: p.ai_level ?? "",
    wantedWork: [...p.wanted_work],
    payPreference: p.pay_preference ?? "",
  };
}

/** Keeps `base` languages other than English and replaces the English level. */
export function fromDraft(d: ProfileDraft, base: Profile): Record<string, unknown> {
  const others = base.languages.filter((l) => l.code !== "en");
  const languages = d.englishLevel ? [...others, { code: "en", level: d.englishLevel }] : others;
  return {
    version: 1,
    country: base.country,
    languages,
    fields: splitList(d.fields),
    skills: splitList(d.skills),
    domain_expertise: splitList(d.domainExpertise),
    experience_summary_ko: d.experience,
    weekly_hours: d.weeklyHours.trim() === "" ? null : d.weeklyHours,
    preferred_time: d.preferredTime || null,
    min_hourly_usd: d.minHourlyUsd.trim() === "" ? null : d.minHourlyUsd,
    has_desktop: d.hasDesktop === "" ? null : d.hasDesktop === "yes",
    avoid: splitList(d.avoid),
    notes_ko: d.notes,
    // Not edited on the confirmation screen; kept as the AI wrote them.
    job_keywords: base.job_keywords,
    portfolio_ko: base.portfolio_ko,
    work_status: d.workStatus || null,
    job_role: d.jobRole,
    industry: d.industry,
    career_years: d.careerYears.trim() === "" ? null : d.careerYears,
    education_level: d.education || null,
    licenses: splitList(d.licenses),
    ai_tools: splitList(d.aiTools),
    ai_level: d.aiLevel || null,
    wanted_work: d.wantedWork,
    pay_preference: d.payPreference || null,
  };
}
