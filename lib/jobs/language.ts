/**
 * Work languages of a job.
 *
 * In the common mail (no profile) language is information only: it orders
 * jobs (lib/digest/plan.ts) and never removes one. In personal mail a job
 * needs a work language the profile lists (lib/match/fit.ts personalLimits),
 * so a job for Odia speakers stored as English-only would reach Korean
 * subscribers. Titles name the language plainly ("AI Trainers Network -
 * Odia"); namedLanguages reads it from there, and buildJob stores it.
 */
const NAMES_KO: Record<string, string> = {
  ko: "한국어", en: "영어", ja: "일본어", zh: "중국어", es: "스페인어", fr: "프랑스어", de: "독일어", pt: "포르투갈어",
  it: "이탈리아어", ru: "러시아어", ar: "아랍어", hi: "힌디어", vi: "베트남어", th: "태국어", id: "인도네시아어",
  tr: "튀르키예어", pl: "폴란드어", nl: "네덜란드어", sv: "스웨덴어", uk: "우크라이나어", he: "히브리어",
  // South and Southeast Asia
  or: "오디아어", bn: "벵골어", ta: "타밀어", te: "텔루구어", mr: "마라티어", gu: "구자라트어", pa: "펀자브어",
  kn: "칸나다어", ml: "말라얄람어", ur: "우르두어", ne: "네팔어", si: "싱할라어", as: "아삼어", tl: "타갈로그어",
  ms: "말레이어", jv: "자와어", my: "미얀마어", km: "크메르어", lo: "라오어", mn: "몽골어", sd: "신디어", ceb: "세부아노어",
  ilo: "일로카노어", ug: "위구르어", sa: "산스크리트어",
  // Central Asia, Caucasus, Middle East
  kk: "카자흐어", uz: "우즈베크어", az: "아제르바이잔어", ka: "조지아어", hy: "아르메니아어", fa: "페르시아어",
  ps: "파슈토어", ku: "쿠르드어", ky: "키르기스어", tg: "타지크어",
  // Europe
  el: "그리스어", cs: "체코어", sk: "슬로바키아어", hu: "헝가리어", ro: "루마니아어", bg: "불가리아어", sr: "세르비아어",
  hr: "크로아티아어", bs: "보스니아어", sl: "슬로베니아어", mk: "마케도니아어", sq: "알바니아어", lt: "리투아니아어",
  lv: "라트비아어", et: "에스토니아어", fi: "핀란드어", da: "덴마크어", no: "노르웨이어", is: "아이슬란드어",
  ga: "아일랜드어", cy: "웨일스어", ca: "카탈루냐어", eu: "바스크어", be: "벨라루스어", gl: "갈리시아어", mt: "몰타어",
  lb: "룩셈부르크어", ast: "아스투리아스어", oc: "오크어",
  // Africa, Americas, Pacific
  sw: "스와힐리어", am: "암하라어", yo: "요루바어", ig: "이그보어", ha: "하우사어", zu: "줄루어", xh: "코사어",
  af: "아프리칸스어", so: "소말리어", mg: "말라가시어", rw: "킨야르완다어", om: "오로모어", ti: "티그리냐어", wo: "월로프어",
  ff: "풀라어", tw: "트위어", luo: "루오어", ht: "아이티 크리올어", qu: "케추아어", gn: "과라니어", ay: "아이마라어",
  nah: "나우아틀어", mi: "마오리어",
  sgn: "수화",
};

export function languageNameKo(code: string): string {
  return NAMES_KO[code.toLowerCase()] ?? code.toUpperCase();
}

const CODE_BY_NAME_KO = new Map(Object.entries(NAMES_KO).map(([code, name]) => [name, code]));
/** Other Korean spellings seen in titles. */
for (const [name, code] of [
  ["터키어", "tr"], ["오리야어", "or"], ["벵골리어", "bn"], ["필리핀어", "tl"], ["버마어", "my"], ["그루지야어", "ka"],
  ["우즈벡어", "uz"], ["키르기즈어", "ky"], ["아쌈어", "as"], ["라오스어", "lo"], ["플라망어", "nl"], ["광둥어", "zh"],
  ["북마케도니아어", "mk"], ["볼로프어", "wo"],
] as const) CODE_BY_NAME_KO.set(name, code);

/**
 * English language names in a title. ISO 639-1, or 639-3 where there is no
 * two-letter code (Kaqchikel "cak"), sign languages "sgn". Names that are
 * also ordinary words need a language word next to them (Latin, Irish).
 */
const NAMES_EN: [string, RegExp][] = [
  ["en", /\benglish\b/i], ["ko", /\bkorean\b/i], ["ja", /\bjapanese\b/i], ["zh", /\b(?:chinese|mandarin|cantonese)\b/i],
  ["es", /\bspanish\b/i], ["fr", /\bfrench\b/i], ["de", /\bgerman\b/i], ["pt", /\bportuguese\b/i], ["it", /\bitalian\b/i],
  ["ru", /\brussian\b/i], ["ar", /\barabic\b/i], ["hi", /\bhindi\b/i], ["vi", /\bvietnamese\b/i], ["th", /\bthai\b/i],
  ["id", /\b(?:indonesian|bahasa\s+indonesia)\b/i], ["tr", /\bturkish\b/i], ["nl", /\b(?:dutch|flemish)\b/i], ["sv", /\bswedish\b/i], ["uk", /\bukrainian\b/i],
  ["he", /\bhebrew\b/i], ["pl", /\bpolish\s+(?:speaker|native|language|translat|linguist|transcri|writer|voice)/i],
  ["sgn", /수화|sign\s*language|\b[ab]sl\b/i],
  // South and Southeast Asia
  ["or", /\b(?:odia|oriya)\b/i], ["bn", /\b(?:bengali|bangla)\b/i], ["ta", /\btamil\b/i], ["te", /\btelugu\b/i],
  ["mr", /\bmarathi\b/i], ["gu", /\bgujarati\b/i], ["pa", /\b(?:punjabi|panjabi)\b/i], ["kn", /\bkannada\b/i],
  ["ml", /\bmalayalam\b/i], ["ur", /\burdu\b/i], ["ne", /\bnepali\b/i], ["si", /\b(?:sinhala|sinhalese)\b/i],
  ["as", /\bassamese\b/i], ["sd", /\bsindhi\b/i], ["bho", /\bbhojpuri\b/i], ["mai", /\bmaithili\b/i],
  ["tl", /\b(?:tagalog|filipino)\b/i], ["ceb", /\bcebuano\b/i], ["ilo", /\bilocano\b/i], ["ms", /\b(?:malay|bahasa\s+melayu)\b/i],
  ["jv", /\bjavanese\b/i], ["su", /\bsundanese\b/i], ["my", /\bburmese\b/i], ["km", /\bkhmer\b/i], ["lo", /\b(?:lao|laotian)\b/i],
  ["mn", /\bmongolian\b/i], ["bo", /\btibetan\b/i], ["ug", /\buyghur\b/i], ["hmn", /\bhmong\b/i],
  // Central Asia, Caucasus, Middle East
  ["kk", /\bkazakh\b/i], ["uz", /\buzbek\b/i], ["ky", /\bkyrgyz\b/i], ["tg", /\btajik\b/i], ["tk", /\bturkmen\b/i],
  ["az", /\b(?:azerbaijani|azeri)\b/i], ["ka", /\bgeorgian\b/i], ["hy", /\barmenian\b/i], ["fa", /\b(?:persian|farsi)\b/i],
  ["prs", /\bdari\b/i], ["ps", /\bpashto\b/i], ["ku", /\b(?:kurdish|kurmanji|sorani)\b/i], ["yi", /\byiddish\b/i],
  // Europe
  ["el", /\bgreek\b/i], ["cs", /\bczech\b/i], ["sk", /\bslovak\b/i], ["hu", /\bhungarian\b/i], ["ro", /\b(?:romanian|moldovan)\b/i],
  ["bg", /\bbulgarian\b/i], ["sr", /\bserbian\b/i], ["hr", /\bcroatian\b/i], ["bs", /\bbosnian\b/i], ["sl", /\bslovenian?\b|\bslovene\b/i],
  ["mk", /\bmacedonian\b/i], ["sq", /\balbanian\b/i], ["lt", /\blithuanian\b/i], ["lv", /\blatvian\b/i], ["et", /\bestonian\b/i],
  ["fi", /\bfinnish\b/i], ["da", /\bdanish\b/i], ["no", /\b(?:norwegian|bokm[aå]l|nynorsk)\b/i], ["is", /\bicelandic\b/i],
  ["ga", /\birish\s+(?:gaelic|language|speaker|native|translat|linguist)|\bgaeilge\b/i], ["gd", /\bscottish\s+gaelic\b/i],
  ["cy", /\bwelsh\b/i], ["ca", /\bcatalan\b/i], ["eu", /\bbasque\b/i], ["gl", /\bgalician\b/i], ["mt", /\bmaltese\b/i],
  ["be", /\bbelarusian\b/i], ["lb", /\bluxembourgish\b/i], ["fo", /\bfaroese\b/i], ["br", /\bbreton\b/i], ["eo", /\besperanto\b/i], ["ast", /\basturian\b/i], ["oc", /\boccitan\b/i],
  ["la", /\blatin\s+(?:language|speaker|translat|teacher|tutor|linguist|expert)/i], ["sa", /\bsanskrit\b/i],
  // Africa
  ["sw", /\b(?:swahili|kiswahili)\b/i], ["am", /\bamharic\b/i], ["ti", /\btigrinya\b/i], ["om", /\b(?:oromo|afaan\s+oromoo)\b/i],
  ["so", /\bsomali\b/i], ["yo", /\byoruba\b/i], ["ig", /\bigbo\b/i], ["ha", /\bhausa\b/i], ["zu", /\b(?:zulu|isizulu)\b/i],
  ["xh", /\b(?:xhosa|isixhosa)\b/i], ["af", /\bafrikaans\b/i], ["st", /\b(?:sesotho|sotho)\b/i], ["tn", /\b(?:setswana|tswana)\b/i],
  ["sn", /\bshona\b/i], ["rw", /\bkinyarwanda\b/i], ["rn", /\bkirundi\b/i], ["lg", /\bluganda\b/i], ["ny", /\b(?:chichewa|nyanja)\b/i],
  ["mg", /\bmalagasy\b/i], ["wo", /\bwolof\b/i], ["tw", /\btwi\b/i], ["ak", /\bakan\b/i], ["ee", /\bewe\b/i], ["ln", /\blingala\b/i], ["luo", /\b(?:dho)?luo\b/i],
  ["ff", /\b(?:fula|fulah|fulani|fulfulde|pulaar)\b/i], ["umb", /\bumbundu\b/i], ["kmb", /\bkimbundu\b/i], ["kg", /\bkikongo\b/i],
  // Americas and the Pacific
  ["ht", /\bhaitian(?:\s+creole)?\b/i], ["kea", /\bkabuverdianu\b|\bcape\s+verdean\s+creole\b/i], ["qu", /\bquechua\b/i], ["gn", /\bguaran[ií](?![a-z])/i], ["ay", /\baymara\b/i],
  ["cak", /\bkaqchikel\b/i], ["quc", /\bk['’]?iche['’]?\b/i], ["nah", /\bnahuatl\b/i], ["mi", /\b(?:maori|māori)\b/i], ["arn", /\bmapudungun\b/i],
  ["sm", /\bsamoan\b/i], ["to", /\btongan\b/i], ["fj", /\bfijian\b/i], ["haw", /\bhawaiian\s+(?:language|speaker|translat|native)|\bʻōlelo\b/i],
];
/** "Japanese-style illustration", "Chinese New Year poster": culture, not the working language. */
const CULTURE_AFTER = /^(?:-|\s+)(?:style|food|cuisine|recipes?|restaurant|mytholog|new\s*year)/i;
/** "카크치켈어 AI 학습 전문가", "움분두어 원어민": a language name before a word about language work. */
const NAMED_KO = /([가-힣]{2,10}어)(?=\s*(?:\(|ai|원어민|화자|전문가|번역|평가|학습|트레이너|데이터|전사|검수|언어|콘텐츠|튜터|교사|강사|사용자|구사))/gi;
/** Words ending in 어 that aren't languages. */
const NOT_LANGUAGE = new Set(["단어", "용어", "언어", "엔지니어", "시니어", "주니어", "프리미어", "아이디어", "소프트웨어", "하드웨어", "커리어", "플레이어", "레이어", "스토어"]);

function names(text: string, re: RegExp): boolean {
  for (const m of text.matchAll(new RegExp(re.source, "gi"))) {
    if (!CULTURE_AFTER.test(text.slice(m.index + m[0].length))) return true;
  }
  return false;
}

/**
 * Work languages a job title names ("AI Trainers Network - Odia", "Hindi
 * speakers", "British Sign Language"). The extraction sometimes keeps only
 * "en" (the instructions' language) for a job that is really for speakers of
 * another language; its title can't hide it. Unknown Korean names come back
 * as "?<name>".
 */
export function namedLanguages(title: string): Set<string> {
  const out = new Set<string>();
  for (const [code, re] of NAMES_EN) if (names(title, re)) out.add(code);
  for (const m of title.matchAll(NAMED_KO)) {
    const name = m[1];
    if (NOT_LANGUAGE.has(name) || [...NOT_LANGUAGE].some((w) => name.endsWith(w))) continue;
    out.add(CODE_BY_NAME_KO.get(name) ?? `?${name}`);
  }
  return out;
}

/** Other codes for the same language the extraction may give ("fil" for Tagalog, "ory" for Odia). */
const CODE_ALIASES: Record<string, string> = {
  fil: "tl", ory: "or", nb: "no", nn: "no", nob: "no", iw: "he", ji: "yi", cmn: "zh", yue: "zh", zho: "zh", bur: "my", al: "sq",
  kor: "ko", eng: "en", jpn: "ja", ben: "bn", hin: "hi", tam: "ta", tel: "te", urd: "ur", swa: "sw", tgl: "tl",
};
const STORABLE = /^[a-z]{2,3}$/;

/**
 * `languages` with the ones the titles name added in front (rule-based
 * fallback for the extraction, no extra LLM call). Never removes a code.
 */
export function withNamedLanguages(languages: readonly string[], titles: readonly (string | null | undefined)[]): string[] {
  const known = languages.map((l) => {
    const c = l.trim().toLowerCase();
    return CODE_ALIASES[c] ?? c;
  });
  const named = [...namedLanguages(titles.filter(Boolean).join("\n"))].filter((l) => STORABLE.test(l));
  return [...new Set([...named.filter((l) => !known.includes(l)), ...known])].filter((l) => STORABLE.test(l));
}

export type LanguageFix = { id: string; title: string; from: string[]; to: string[] };

/** Stored jobs whose languages change once the title's languages are added (workers/backfill-languages.ts). */
export function languageFixes(rows: readonly { id: string; title: string; title_ko: string | null; languages: string[] }[]): LanguageFix[] {
  return rows.flatMap((r) => {
    const to = withNamedLanguages(r.languages, [r.title, r.title_ko]);
    return to.join(",") === r.languages.join(",") ? [] : [{ id: r.id, title: r.title, from: r.languages, to }];
  });
}
