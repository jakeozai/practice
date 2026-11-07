/**
 * The language a posting is written in doesn't matter (users read English
 * postings themselves). The language the WORK needs does: it's a skill, like
 * any other. A Korean user can do work in Korean or English, plus whatever
 * else their profile lists (Phase 2 matching).
 */

/** What every subscriber can be assumed to handle, for the same-for-all digest (Phase 0–1). */
export const DEFAULT_USER_LANGUAGES = ["ko", "en"] as const;

/** Languages a job needs (jobs.languages, ISO 639-1) that the user doesn't have. */
export function missingLanguages(jobLanguages: readonly string[], userLanguages: readonly string[] = DEFAULT_USER_LANGUAGES): string[] {
  const have = new Set(userLanguages.map((l) => l.toLowerCase()));
  return [...new Set(jobLanguages.map((l) => l.toLowerCase()))].filter((l) => !have.has(l));
}

export function languagesFeasible(jobLanguages: readonly string[], userLanguages?: readonly string[]): boolean {
  return missingLanguages(jobLanguages, userLanguages).length === 0;
}

/** Display names for the codes we see most in AI data work. */
const NAMES_KO: Record<string, string> = {
  ko: "한국어", en: "영어", ja: "일본어", zh: "중국어", es: "스페인어", fr: "프랑스어", de: "독일어", pt: "포르투갈어",
  it: "이탈리아어", ru: "러시아어", ar: "아랍어", hi: "힌디어", vi: "베트남어", th: "태국어", id: "인도네시아어",
  tr: "튀르키예어", pl: "폴란드어", nl: "네덜란드어", sv: "스웨덴어", uk: "우크라이나어", he: "히브리어",
};

export function languageNameKo(code: string): string {
  return NAMES_KO[code.toLowerCase()] ?? code.toUpperCase();
}
