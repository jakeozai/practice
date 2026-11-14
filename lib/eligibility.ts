/**
 * Can a Korea resident apply? Location-text rules first (spec §8 step 3);
 * when they can't decide, the caller falls back to the LLM value, and null
 * means "unknown" (never auto-approved).
 *
 * Additions to the spec list, from the 2026-11-07 supply check:
 * - "seoul", "KR"/"KOR" and "world wide" (Greenhouse writes "World Wide - Remote")
 * - lists of ISO country codes decide by whether KR/KOR is in them
 * - "international" is deliberately NOT a yes-word: xAI labels US/UK/CA/AU-only
 *   roles "Remote, International", so those go to the LLM, which reads the body.
 */
const YES = /world\s?wide|\bglobal\b|anywhere|south korea|\bkorea\b|\bapac\b|\basia\b|\bseoul\b|\bKR\b|\bKOR\b/i;

/** A list made only of ISO country codes (Mercor writes "GBR / Remote", OneForma "CN / MX / KR / GB"). */
const CODE_LIST = /^(?:[A-Z]{2,3}|Remote)(?:\s*[/,]\s*(?:[A-Z]{2,3}|Remote))*$/;

const COUNTRY_ONLY =
  /united states|\busa?\b|\bus only\b|\buk\b|uk only|united kingdom|england|canada|australia|new zealand|india|philippines|brazil|mexico|argentina|colombia|chile|peru|germany|france|spain|italy|portugal|netherlands|belgium|poland|romania|ukraine|ireland|sweden|norway|denmark|finland|switzerland|austria|czech|hungary|greece|turkey|israel|egypt|south africa|nigeria|kenya|ghana|morocco|japan|china|taiwan|hong kong|singapore|malaysia|indonesia|thailand|vietnam|pakistan|bangladesh|sri lanka|nepal|europe|\bemea\b|latam|north america|\bremote - (?:us|uk|eu)\b|new york|san francisco|london|toronto|tokyo|berlin|paris|warsaw|dublin/i;

/**
 * Every other country's English name (from ICU, so the list stays complete),
 * for locations like "Doha, Qatar" or "Yangon, Myanmar (Burma)" that the short
 * list above misses. Added 2026-11-12: each miss costs an LLM call, and the
 * free Gateway tier allows 5 a minute.
 */
const COUNTRY_NAMES: RegExp = (() => {
  const names = new Set<string>();
  const display = new Intl.DisplayNames(["en"], { type: "region" });
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const a of letters)
    for (const b of letters) {
      const code = a + b;
      if (code === "KR" || code === "KP") continue;
      let name: string | undefined;
      try {
        name = display.of(code);
      } catch {
        continue;
      }
      if (!name || name === code || /unknown/i.test(name)) continue;
      // "Myanmar (Burma)" → also "Myanmar"; "Hong Kong SAR China" → also "Hong Kong".
      for (const n of [name, name.replace(/\s*\(.*\)$/, ""), name.replace(/\s+SAR\s+China$/, "")]) {
        if (n.length >= 4 && !/korea/i.test(n)) names.add(n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      }
    }
  return new RegExp(`\\b(?:${[...names].join("|")})\\b`, "i");
})();

/** "City, ST" with a US state or DC code: "Palo Alto, CA", "Southaven, MS; Memphis, TN". */
const US_STATE =
  /,\s*(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/;

/** "North Korea" (also in some all-countries lists) must not count as Korea. */
const NORTH_KOREA = /north korea|democratic people'?s republic of korea|\bdprk\b|korea,? (?:dem\.?|democratic) people'?s rep(?:ublic|\.)?/gi;

export function koreaEligibleFromLocation(location: string | null | undefined): boolean | null {
  const text = (location ?? "").replace(NORTH_KOREA, " ").trim();
  if (!text) return null;
  if (CODE_LIST.test(text) && text.replace(/Remote/g, "").trim()) return /\b(?:KR|KOR)\b/.test(text);
  if (YES.test(text)) return true;
  if (COUNTRY_ONLY.test(text) || COUNTRY_NAMES.test(text) || US_STATE.test(text)) return false;
  return null;
}

/** Rule result first, then the LLM's value, else null (spec §8). */
export function decideKoreaEligible(location: string | null | undefined, llmValue: boolean | null | undefined): boolean | null {
  return koreaEligibleFromLocation(location) ?? llmValue ?? null;
}

/**
 * The posting itself says it's for residents of some other country: our Korean
 * summary ("미국 거주자만 지원 가능", "특정 국가 거주자만", "캐나다 거주자를
 * 대상으로") or the English title ("(US Only)", "UK residents only"). Catches
 * jobs whose location field said "Remote" and the extraction still marked
 * Korea-eligible (2026-11-14: five such jobs were approved). Not when the same
 * text also names Korea or a worldwide scope.
 */
const RESIDENTS_ONLY_KO = /(?:거주자|거주\s*중인\s*(?:분|사람)|거주하는\s*(?:분|사람))\s*(?:만|한정|대상|에\s*한해|를\s*대상|를\s*위한)/;
const RESIDENTS_ONLY_EN =
  /\b(?:US|USA|U\.S\.|UK|EU|Canada|Europe|India|Philippines|Brazil|Mexico|LATAM)[\s-]*(?:residents?\s*)?only\b|\bresidents?\s+of\s+(?:the\s+)?(?:US|USA|United States|UK|United Kingdom|Canada|EU)\s+only\b|\((?:US|USA|UK|Canada|EU)\)/i;
const KOREA_OR_WORLD = /한국|대한민국|국내|전\s*세계|전세계|글로벌|국가\s*무관|지역\s*무관|\bkorea\b|worldwide|world\s*wide|\bglobal\b|anywhere/i;

export function residentsOnlyElsewhere(texts: (string | null | undefined)[]): boolean {
  const text = texts.filter(Boolean).join("\n");
  if (KOREA_OR_WORLD.test(text.replace(NORTH_KOREA, " "))) return false;
  return RESIDENTS_ONLY_KO.test(text) || RESIDENTS_ONLY_EN.test(text);
}
