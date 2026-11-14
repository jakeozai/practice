/**
 * Turns one raw posting (+ optional LLM extraction) into a jobs row and a
 * review decision (spec §8 steps 3 and 5). Pure.
 */
import { decideKoreaEligible, koreaEligibleFromLocation, residentsOnlyElsewhere } from "../eligibility";
import { decideStatus } from "../status";
import { isScamRejected, scamScore } from "../scam";
import { normalizeTitle } from "./format";
import { matchesJobKeywords } from "./keywords";
import type { JobExtract } from "../llm/extractJob";
import type { Database } from "../supabase/database.types";

type JobInsert = Database["public"]["Tables"]["jobs"]["Insert"];

export type RawForProcessing = {
  id: string;
  url: string;
  title: string | null;
  location_raw: string | null;
  body: string | null;
};

export type SourceInfo = { name: string; trusted: boolean; kind: string };

/**
 * Safety net for ai_prohibited when the LLM misses it or isn't available: plain
 * statements that AI may not be used. Kept narrow; "AI-generated images" alone
 * (often the job itself) doesn't count.
 */
const NO_AI =
  /\bno\s+ai\b|\bnot?\s+(?:use|using)\s+(?:any\s+)?ai\b|\bwithout\s+(?:using\s+)?ai\b|\bai[- ](?:generated|made)\s+(?:\w+\s+){0,3}(?:is|are|will\s+be)\s+(?:not\s+(?:accepted|allowed|permitted)|rejected)|\b100%\s+human[- ]made\b|\bai\s+(?:use\s+)?(?:is\s+)?(?:strictly\s+)?(?:prohibited|forbidden|not\s+allowed)\b|ai\s*사용\s*(?:금지|불가)|ai\s*(?:생성물|작업물)\s*(?:불가|금지)/i;

export function forbidsAi(text: string): boolean {
  return NO_AI.test(text);
}

/**
 * Full-time work is out of scope (2026-11-14 user decision: any length or
 * rhythm of work is fine — a regular weekly edit, a bundle of 10–15 videos —
 * as long as it isn't full-time). A minimum of this many hours a week counts
 * as full-time. (제안값)
 */
export const FULL_TIME_HOURS = 30;
/** The posting says the role itself is full-time; "our full-time team" doesn't count. */
const FULL_TIME =
  /\bfull[- ]?time\s+(?:\w+\s+)?(?:position|role|job|contract|employment|employee|commitment|hours|availability|schedule|engagement|basis|hire|opportunity)|\b(?:is|be|work(?:ing)?|available)\s+(?:a\s+)?full[- ]?time\b|\bfull[- ]?time\s*\(\s*40|\b40\+?\s*(?:hours?|hrs?)\s*(?:\/|per|a|each)\s*(?:week|wk)\b|풀타임\s*(?:근무|계약|포지션|채용|상근)?|전일제|정규직|주\s*40\s*시간|주\s*5일\s*(?:근무|출근)/i;
const PART_TIME_TOO = /part[- ]?time|파트\s*타임|flexible\s*(?:hours|schedule)|유연\s*근무|own\s*(?:hours|schedule|pace)|not\s+(?:a\s+)?full[- ]?time|full[- ]?time\s+or\s+part|or\s+full[- ]?time/i;

export function isFullTime(text: string, hoursPerWeekMin: number | null | undefined): boolean {
  if (hoursPerWeekMin != null && hoursPerWeekMin >= FULL_TIME_HOURS) return true;
  return FULL_TIME.test(text) && !PART_TIME_TOO.test(text);
}

/**
 * Postings that ask for money up front or move the talk to a messenger are
 * never sent (landing page promise, 2026-11-14: "입금·메신저 유도 공고 제외").
 * The LLM's scam signals catch most; this catches the plain ones it misses.
 */
const MESSENGERS = "telegram|whats\\s*app|wechat|kakao\\s*talk|signal|line";
/** An invitation to talk on a messenger ("contact me on Telegram", "WhatsApp: +1…", "텔레그램으로 연락"), not a mention of one. */
const MESSENGER_LURE = new RegExp(
  `(?:contact|message|text|dm|reach|add|join|chat|talk|connect|apply|send|write)\\s+(?:\\S+\\s+){0,3}?(?:on|via|through|at|in|to)\\s+(?:my\\s+|our\\s+)?(?:${MESSENGERS})\\b` +
    `|\\b(?:telegram|whats\\s*app|wechat)\\s*(?:only|@|:|\\+?\\d|id\\b|number|group|link|handle)` +
    `|(?:텔레그램|카톡|카카오\\s*톡|왓츠앱|위챗)\\s*(?:으로|로|방|링크|id|아이디)?\\s*(?:연락|문의|상담|참여|입장|추가)` +
    `|오픈\\s*채팅\\s*(?:방|링크|으로|로)?`,
  "gi",
);
/** A request for money before the work ("pay a registration fee", "교육비 입금 후"). */
const UPFRONT_FEE =
  /(?:pay|send|transfer)\s+(?:a|an|the)?\s*(?:small\s+|one[- ]time\s+|refundable\s+)?(?:registration|joining|training|starter|membership|application|security)?\s*(?:fee|deposit)\b|(?:registration|joining|training|starter|membership|application|security)\s+(?:fee|deposit)\s+(?:of|is|required|needed)|가입비|등록비|교육비|보증금|선입금|입금\s*(?:후|하시면|해야)/gi;
/** "We never recruit through WhatsApp", "No upfront joining fees", "사칭 주의": a warning, not a lure. */
const NEGATED = /\b(?:never|not|no|don'?t|doesn'?t|won'?t|without|beware)\b|않|절대|사칭|주의|없(?:어요|습니다|음)/i;

function invites(re: RegExp, text: string): boolean {
  for (const m of text.matchAll(re)) {
    const before = text.slice(Math.max(0, m.index - 60), m.index);
    if (!NEGATED.test(before) && !NEGATED.test(m[0])) return true;
  }
  return false;
}

export function luresOffPlatform(text: string, signals: readonly string[] = []): boolean {
  return signals.includes("upfront_payment") || signals.includes("messenger_only") || invites(MESSENGER_LURE, text) || invites(UPFRONT_FEE, text);
}

/** "Invisible (Freelance AI Trainer)" → "Invisible": source names carry admin notes in parentheses. */
export function boardCompany(sourceName: string): string {
  return sourceName.replace(/\s*\(.*\)\s*$/, "").trim() || sourceName;
}

const NO_COMPANY = /^(?:n\/?a|unknown|none|not specified|undisclosed|confidential|없음|미상|-+)$/i;

/**
 * Who you apply through. A hiring-system board (Greenhouse, Lever, Ashby,
 * Recruitee) belongs to one company, so its name wins over whatever the LLM
 * read in the text (2026-11-12: "N/A", or the job title, for Invisible).
 * Page sources can list other companies' jobs, so there the LLM's answer is
 * used unless it is a placeholder.
 */
export function decideCompany(source: SourceInfo, llmCompany: string | null | undefined): string {
  if (source.kind !== "page" && source.kind !== "manual") return boardCompany(source.name);
  const c = llmCompany?.trim();
  return c && !NO_COMPANY.test(c) ? c : boardCompany(source.name);
}

/**
 * Before any LLM call (cost rule 10):
 * - no keyword → not an AI gig, skip
 * - location rule says a Korea resident can't apply → skip (the rule would
 *   override any LLM answer anyway, so the call would be wasted)
 */
/**
 * `preselected`: the source already searched for gigs (Freelancer.com presets),
 * so the keyword pass would only drop good ones like "Cute Cartoon Illustrator".
 */
export function triage(raw: RawForProcessing, opts: { preselected?: boolean } = {}): "skip_keyword" | "skip_region" | "candidate" {
  if (!opts.preselected && !matchesJobKeywords(raw.title ?? "", raw.body ?? "")) return "skip_keyword";
  if (koreaEligibleFromLocation(raw.location_raw) === false) return "skip_region";
  return "candidate";
}

export function buildJob(input: {
  raw: RawForProcessing;
  source: SourceInfo;
  extraction: JobExtract | null;
  /** Same company + normalized title first seen in the repost window, counting this posting. */
  sameTitleCount: number;
}): JobInsert {
  const { raw, source, extraction: x, sameTitleCount } = input;
  const title = x?.title || raw.title?.trim() || "(제목 없음)";
  const company = decideCompany(source, x?.company);
  // The posting's own words win over a generic "Remote" location: "US residents only" isn't for Korea.
  const korea = residentsOnlyElsewhere([raw.title, x?.title, ...(x?.summary_ko ?? [])])
    ? false
    : decideKoreaEligible(raw.location_raw, x?.korea_eligible);
  const scam = scamScore(x?.scam_signals ?? []);
  const requiresCredential = x?.requires_credential ?? false;

  // Out of scope (scope C, 2026-11-14): open-ended staff hiring, full-time roles, work that forbids AI, adult work.
  // Short-term work of any kind is in, AI or not; credentials and work language are information only.
  // Not open to Korea residents (2026-11-12): such a job can never be mailed, so it isn't
  // worth a reviewer's time either (Phase 1 goal: under 10 minutes of human work a day).
  const outOfScope =
    (x !== null && (x.ai_prohibited || x.adult_content || x.engagement === "permanent")) ||
    forbidsAi(`${raw.title ?? ""}\n${raw.body ?? ""}`) ||
    isFullTime(`${raw.title ?? ""}\n${raw.body ?? ""}`, x?.hours_per_week_min) ||
    luresOffPlatform(`${raw.title ?? ""}\n${raw.body ?? ""}`, x?.scam_signals ?? []) ||
    korea === false;

  let review: JobInsert["review_state"] = "pending";
  if (isScamRejected(scam) || outOfScope) review = "rejected";
  else if (x && source.trusted && korea === true && scam === 0) review = "approved";

  return {
    raw_posting_id: raw.id,
    company,
    title,
    title_ko: x?.title_ko ?? null,
    title_normalized: normalizeTitle(title),
    url: raw.url,
    summary_ko: x?.summary_ko ?? [],
    category: x?.category ?? null,
    languages: x?.languages ?? [],
    requires_credential: requiresCredential,
    korea_eligible: korea,
    eligibility_note: x?.location_raw ?? raw.location_raw,
    pay_min: x?.pay_min ?? null,
    pay_max: x?.pay_max ?? null,
    pay_currency: x && (x.pay_min !== null || x.pay_max !== null) ? (x.pay_currency ?? "USD") : null,
    pay_unit: x?.pay_unit ?? null,
    hours_per_week_min: x?.hours_per_week_min ?? null,
    english_level: x?.english_level ?? null,
    engagement: x?.engagement ?? null,
    status: decideStatus({ isTalentPool: x?.is_talent_pool ?? false, sameTitleCount }),
    repost_count: Math.max(0, sameTitleCount - 1),
    scam_score: scam,
    review_state: review,
  };
}
