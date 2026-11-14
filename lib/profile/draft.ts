/**
 * Converts between a Profile and the flat string form edited on the
 * confirmation screen. The result is raw input: the server re-validates it
 * with ProfileSchema before saving.
 */
import type { EnglishLevel, PreferredTime, Profile } from "./parse";

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
};

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
  };
}
