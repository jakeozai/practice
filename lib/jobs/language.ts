/**
 * Work language is shown as information only. It never filters a job out:
 * 덕잡 curates in Korean, and whether to take an English, Chinese or
 * Japanese job is the subscriber's call.
 */
const NAMES_KO: Record<string, string> = {
  ko: "한국어", en: "영어", ja: "일본어", zh: "중국어", es: "스페인어", fr: "프랑스어", de: "독일어", pt: "포르투갈어",
  it: "이탈리아어", ru: "러시아어", ar: "아랍어", hi: "힌디어", vi: "베트남어", th: "태국어", id: "인도네시아어",
  tr: "튀르키예어", pl: "폴란드어", nl: "네덜란드어", sv: "스웨덴어", uk: "우크라이나어", he: "히브리어",
};

export function languageNameKo(code: string): string {
  return NAMES_KO[code.toLowerCase()] ?? code.toUpperCase();
}
