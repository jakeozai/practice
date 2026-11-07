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

/** "North Korea" (also in some all-countries lists) must not count as Korea. */
const NORTH_KOREA = /north korea|democratic people'?s republic of korea|\bdprk\b|korea,? (?:dem\.?|democratic) people'?s rep(?:ublic|\.)?/gi;

export function koreaEligibleFromLocation(location: string | null | undefined): boolean | null {
  const text = (location ?? "").replace(NORTH_KOREA, " ").trim();
  if (!text) return null;
  if (CODE_LIST.test(text) && text.replace(/Remote/g, "").trim()) return /\b(?:KR|KOR)\b/.test(text);
  if (YES.test(text)) return true;
  if (COUNTRY_ONLY.test(text)) return false;
  return null;
}

/** Rule result first, then the LLM's value, else null (spec §8). */
export function decideKoreaEligible(location: string | null | undefined, llmValue: boolean | null | undefined): boolean | null {
  return koreaEligibleFromLocation(location) ?? llmValue ?? null;
}
