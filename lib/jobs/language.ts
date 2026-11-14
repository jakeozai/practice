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

const CODE_BY_NAME_KO = new Map(Object.entries(NAMES_KO).map(([code, name]) => [name, code]));
CODE_BY_NAME_KO.set("터키어", "tr");

const NAMES_EN: [string, RegExp][] = [
  ["en", /\benglish\b/i], ["ko", /\bkorean\b/i], ["ja", /\bjapanese\b/i], ["zh", /\b(?:chinese|mandarin|cantonese)\b/i],
  ["es", /\bspanish\b/i], ["fr", /\bfrench\b/i], ["de", /\bgerman\b/i], ["pt", /\bportuguese\b/i], ["it", /\bitalian\b/i],
  ["ru", /\brussian\b/i], ["ar", /\barabic\b/i], ["hi", /\bhindi\b/i], ["vi", /\bvietnamese\b/i], ["th", /\bthai\b/i],
  ["id", /\bindonesian\b/i], ["tr", /\bturkish\b/i], ["nl", /\bdutch\b/i], ["sv", /\bswedish\b/i], ["uk", /\bukrainian\b/i],
  ["he", /\bhebrew\b/i], ["pl", /\bpolish\s+(?:speaker|native|language|translat|linguist|transcri|writer|voice)/i],
  ["sgn", /수화|sign\s*language|\b[ab]sl\b/i],
];
/** "카크치켈어 AI 학습 전문가", "움분두어 원어민": a language name before a word about language work. */
const NAMED_KO = /([가-힣]{2,10}어)(?=\s*(?:\(|ai|원어민|화자|전문가|번역|평가|학습|트레이너|데이터|전사|검수|언어|콘텐츠|튜터|교사|강사|사용자|구사))/gi;
/** Words ending in 어 that aren't languages. */
const NOT_LANGUAGE = new Set(["단어", "용어", "언어", "엔지니어", "시니어", "주니어", "프리미어", "아이디어", "소프트웨어", "하드웨어", "커리어", "플레이어", "레이어", "스토어"]);

/**
 * Work languages a job title names ("Kaqchikel AI trainer", "British Sign
 * Language"). The extracted `languages` keeps only codes it knows, so a job
 * for a rare language can look like English work; its title can't.
 * Unknown names come back as "?<name>".
 */
export function namedLanguages(title: string): Set<string> {
  const out = new Set<string>();
  for (const [code, re] of NAMES_EN) if (re.test(title)) out.add(code);
  for (const m of title.matchAll(NAMED_KO)) {
    const name = m[1];
    if (NOT_LANGUAGE.has(name) || [...NOT_LANGUAGE].some((w) => name.endsWith(w))) continue;
    out.add(CODE_BY_NAME_KO.get(name) ?? `?${name}`);
  }
  return out;
}
