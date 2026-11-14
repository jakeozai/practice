/**
 * How well one job fits one person, from the profile their own AI wrote
 * (2026-11-14 user decision: the mail follows that analysis strictly, three
 * best fits, no mixing of kinds for variety). Pure and LLM-free: this layer
 * rules jobs out and ranks the rest; lib/match/pick.ts lets the model choose
 * the final three from the top of this list and write why.
 *
 * Hard rules (a job is out):
 *  - a work language the person doesn't have, or English two levels above theirs
 *  - something on their `avoid` list (AVOID_RULES), or performer work they never mention
 *  - full-time work (lib/jobs/process.ts isFullTime), more weekly hours than they have, or an hourly rate under their minimum
 *  - text saying it's for residents of another country ("미국 거주자만", "(US Only)")
 *  - a degree/licence requirement outside the person's own fields
 *  - software work in a programming language the profile doesn't show
 *  - a title naming a craft the profile doesn't have (3D, motion, logo, photo, audio, translation, labeling)
 *  - specialist ("domain") work outside the person's own specialty
 *  - nothing in common with what they do (no concept or search term from their profile)
 *
 * Score: profile concepts the job matches, weighted by where the AI wrote them
 * (fields in order > its recommendations > expertise > search terms > skills >
 * experience), the profile's own search terms (job_keywords) matched directly,
 * plus named tools (small), then pay, freshness and small penalties.
 */
import { ENGLISH_LEVELS, type Profile } from "../profile/parse";
import { residentsOnlyElsewhere } from "../eligibility";
import { isBiddingGig } from "../jobs/format";
import { isFullTime } from "../jobs/process";
import { namedLanguages } from "../jobs/language";
import {
  AVOID_RULES,
  CODE_CONCEPTS,
  CONCEPTS,
  DOMAIN_CONCEPTS,
  PERFORMER_JOB,
  PERFORMER_PROFILE,
  TITLE_CRAFTS,
  USD_PER_UNIT,
  codeLanguages,
  keywordPattern,
  toolTokens,
  type Concept,
} from "./concepts";

type EnglishLevel = (typeof ENGLISH_LEVELS)[number];

export type FitJob = {
  id: string;
  title: string;
  title_ko: string | null;
  summary_ko: string[];
  category: string | null;
  languages: string[];
  english_level: EnglishLevel | null;
  requires_credential: boolean;
  hours_per_week_min: number | null;
  pay_min: number | null;
  pay_max: number | null;
  pay_currency: string | null;
  pay_unit: "hour" | "task" | "project" | "month" | null;
  status: string;
  first_seen_at: string;
  url: string;
};

/** (제안값) Weight of a concept by where the profile names it. */
export const SECTION_WEIGHT = {
  /** fields[0]; each later field 0.4 less. The AI lists them by strength. */
  firstField: 5,
  fieldStep: 0.4,
  /** notes_ko: the AI's own "recommend first" line. */
  notes: 4,
  domain: 3,
  /** job_keywords[0]; each later one 0.1 less, never under MIN_RELEVANCE. The AI lists them by importance. */
  firstKeyword: 3.5,
  keywordStep: 0.1,
  skills: 2.5,
  experience: 2,
} as const;

/** (제안값) A job needs at least this much in common with the profile. */
export const MIN_RELEVANCE = 2.5;
/** (제안값) Degree/licence jobs need a match at least this strong, from the fields or expertise. */
const CREDENTIAL_MIN_WEIGHT = 3;
/**
 * AI coding tools in a profile: with them the person builds in the mainstream
 * languages whether or not the profile names one (2026-11-14 user decision:
 * what someone does with AI counts — a nurse who builds apps with Claude Code
 * gets app work).
 */
const AI_CODING = /claude\s*code|클로드\s*코드|cursor|커서\s*ai|copilot|코파일럿|windsurf|바이브\s*코딩|vibe\s*cod|lovable|bolt\.new|replit|\bv0\b|ai\s*코딩/i;
const AI_CODING_LANGUAGES = ["js", "python"];
/** Craft work: knowing a field (nursing, law) is a plus there, never the reason on its own (a clinic website is web work). */
const CRAFT_CATEGORIES = new Set(["dev", "design", "video", "motion_3d"]);

/** Joining a company rather than taking a gig: founding roles, equity pay. */
const EMPLOYMENT_ROLE = /founding\s+(?:engineer|developer|designer|member|team)|co-?founder|공동\s*창업|창립\s*(?:멤버|엔지니어|팀)|\bcto\b|equity[- ](?:only|based)|지분\s*(?:보상|으로)/i;

/** (제안값) A job in the person's own specialty outranks general work their profile also covers. */
const SPECIALTY_BONUS = 1.5;
/** (제안값) Fixed-price budgets under this (USD) are too small to be worth a bid. */
const TINY_BUDGET_USD = 50;

export type ProfileSection = "field" | "notes" | "domain" | "keywords" | "skills" | "experience";
export type ConceptHit = { id: string; label: string; weight: number; trigger: string; categories: string[]; section: ProfileSection };

export type ProfileSignals = {
  langs: Set<string>;
  english: EnglishLevel;
  concepts: Map<string, ConceptHit>;
  /** The profile's own search terms (job_keywords) that say enough to match on. */
  keywords: { hit: ConceptHit; re: RegExp }[];
  tools: string[];
  avoid: Set<string>;
  performer: boolean;
  /** Programming languages the profile shows (CODE_LANGUAGES ids). */
  code: Set<string>;
  weeklyHours: number | null;
  minHourlyUsd: number | null;
  /** The profile's first fields, for the mail's intro line. */
  focus: string[];
};

/** The clause of a longer text that contains the match, for citing it in a reason. */
function clauseAround(text: string, re: RegExp): string {
  const m = re.exec(text);
  if (!m) return text.slice(0, 24);
  const parts = text.split(/[.,;:()\n]|(?:\s+-\s+)/);
  let pos = 0;
  for (const p of parts) {
    if (m.index >= pos && m.index < pos + p.length + 1) return p.trim();
    pos += p.length + 1;
  }
  return m[0];
}

function keywordWeight(i: number): number {
  return Math.max(SECTION_WEIGHT.firstKeyword - SECTION_WEIGHT.keywordStep * i, MIN_RELEVANCE);
}

export function buildSignals(profile: Profile): ProfileSignals {
  const langs = new Set(profile.languages.map((l) => l.code));
  if (langs.size === 0) langs.add("ko");
  const en = profile.languages.find((l) => l.code === "en");
  const english: EnglishLevel = en ? (en.level ?? "reading") : "none";

  const sections: { text: string; weight: number; cite: "item" | "clause"; section: ProfileSection }[] = [
    ...profile.fields.map((text, i) => ({ text, weight: SECTION_WEIGHT.firstField - SECTION_WEIGHT.fieldStep * i, cite: "item" as const, section: "field" as const })),
    ...(profile.notes_ko ? [{ text: profile.notes_ko, weight: SECTION_WEIGHT.notes, cite: "clause" as const, section: "notes" as const }] : []),
    ...profile.domain_expertise.map((text) => ({ text, weight: SECTION_WEIGHT.domain, cite: "item" as const, section: "domain" as const })),
    ...profile.job_keywords.map((text, i) => ({ text, weight: keywordWeight(i), cite: "item" as const, section: "keywords" as const })),
    ...profile.skills.map((text) => ({ text, weight: SECTION_WEIGHT.skills, cite: "item" as const, section: "skills" as const })),
    ...(profile.experience_summary_ko
      ? [{ text: profile.experience_summary_ko, weight: SECTION_WEIGHT.experience, cite: "clause" as const, section: "experience" as const }]
      : []),
  ];

  const concepts = new Map<string, ConceptHit>();
  for (const c of CONCEPTS) {
    for (const s of sections) {
      if (!c.profile.test(s.text)) continue;
      const prev = concepts.get(c.id);
      if (prev && prev.weight >= s.weight) continue;
      const trigger = s.cite === "item" ? s.text : clauseAround(s.text, new RegExp(c.profile.source, "i"));
      concepts.set(c.id, { id: c.id, label: c.label, weight: s.weight, trigger, categories: c.categories, section: s.section });
    }
  }

  const keywords = profile.job_keywords.flatMap((text, i) => {
    const re = keywordPattern(text);
    return re ? [{ re, hit: { id: `kw:${text.toLowerCase()}`, label: "검색어", weight: keywordWeight(i), trigger: text, categories: [], section: "keywords" as const } }] : [];
  });

  const everything = [...profile.fields, ...profile.skills, ...profile.domain_expertise, ...profile.job_keywords, profile.notes_ko, profile.experience_summary_ko].join("\n");
  return {
    langs,
    english,
    concepts,
    keywords,
    tools: toolTokens(profile.skills),
    avoid: new Set(AVOID_RULES.filter((r) => profile.avoid.some((a) => r.avoid.test(a))).map((r) => r.id)),
    performer: PERFORMER_PROFILE.test(everything),
    code: AI_CODING.test(everything) ? new Set([...codeLanguages(everything), ...AI_CODING_LANGUAGES]) : codeLanguages(everything),
    weeklyHours: profile.weekly_hours,
    minHourlyUsd: profile.min_hourly_usd,
    focus: profile.fields.slice(0, 2),
  };
}

export function jobText(job: Pick<FitJob, "title" | "title_ko" | "summary_ko">): string {
  return [job.title, job.title_ko ?? "", ...job.summary_ko].join("\n");
}

export function toUsd(amount: number | null, currency: string | null): number | null {
  if (amount === null || !currency) return null;
  const rate = USD_PER_UNIT[currency.toUpperCase()];
  return rate ? amount * rate : null;
}

const levelIndex = (l: EnglishLevel) => ENGLISH_LEVELS.indexOf(l);

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type Fit =
  | { ok: true; score: number; relevance: number; hits: ConceptHit[]; tools: string[] }
  | { ok: false; why: string };

/**
 * Rules that hold for every job sent to this person, whether it fits their
 * profile or is an AI stretch (lib/match/stretch.ts): where they can work,
 * languages and English, their avoid list, performer work, hours and pay.
 */
export function personalLimits(job: FitJob, sig: ProfileSignals): { ok: false; why: string } | { ok: true; penalty: number } {
  const text = jobText(job);
  if (residentsOnlyElsewhere([job.title, job.title_ko, ...job.summary_ko])) return { ok: false, why: "region" };

  // Short-term only: never full-time, however many hours the person has (regular or bundled work is fine).
  if (isFullTime(text, job.hours_per_week_min)) return { ok: false, why: "fulltime" };

  if (EMPLOYMENT_ROLE.test(text)) return { ok: false, why: "fulltime" };

  const named = [...namedLanguages(`${job.title}\n${job.title_ko ?? ""}`)];
  const foreign = [...new Set([...job.languages, ...named])].filter((l) => !sig.langs.has(l));
  if (foreign.length) return { ok: false, why: `language:${foreign.join(",")}` };

  let penalty = 0;
  if (job.english_level) {
    const gap = levelIndex(job.english_level) - levelIndex(sig.english);
    if (gap >= 2) return { ok: false, why: `english:${job.english_level}` };
    if (gap === 1) penalty += 1.5;
  }

  if (!sig.performer && PERFORMER_JOB.test(text)) return { ok: false, why: "performer" };
  for (const rule of AVOID_RULES) {
    if (sig.avoid.has(rule.id) && rule.job.test(text)) return { ok: false, why: `avoid:${rule.id}` };
  }

  if (job.hours_per_week_min !== null && sig.weeklyHours !== null && job.hours_per_week_min > sig.weeklyHours) {
    return { ok: false, why: `hours:${job.hours_per_week_min}` };
  }
  const payUsd = toUsd(job.pay_max ?? job.pay_min, job.pay_currency);
  if (job.pay_unit === "hour" && payUsd !== null && sig.minHourlyUsd !== null && payUsd < sig.minHourlyUsd) {
    return { ok: false, why: `pay:${Math.round(payUsd)}` };
  }
  return { ok: true, penalty };
}

export function assessJob(job: FitJob, sig: ProfileSignals, now: Date = new Date()): Fit {
  const text = jobText(job);
  const limits = personalLimits(job, sig);
  if (!limits.ok) return limits;
  let penalty = limits.penalty;

  const title = `${job.title}\n${job.title_ko ?? ""}`;
  for (const c of CONCEPTS) {
    if (TITLE_CRAFTS.has(c.id) && !sig.concepts.has(c.id) && c.job.test(title)) return { ok: false, why: `craft:${c.id}` };
  }
  const payUsd = toUsd(job.pay_max ?? job.pay_min, job.pay_currency);

  // Software work counts only in a language the person uses (no Java trainer jobs for a Next.js developer).
  const jobCode = codeLanguages(text);
  const codeFits = jobCode.size === 0 || [...jobCode].some((l) => sig.code.has(l));
  const hits = [
    ...CONCEPTS.flatMap((c: Concept) => {
      const h = sig.concepts.get(c.id);
      if (!h || !c.job.test(text)) return [];
      return CODE_CONCEPTS.has(c.id) && !codeFits ? [] : [h];
    }),
    // The profile's own search terms reach work the concept list doesn't name.
    ...sig.keywords.filter((k) => k.re.test(text)).map((k) => k.hit),
  ]
    // In craft work a specialty only adds to a craft match.
    .filter((h, _, all) => !(DOMAIN_CONCEPTS.has(h.id) && job.category && CRAFT_CATEGORIES.has(job.category) && !all.some((o) => !DOMAIN_CONCEPTS.has(o.id))))
    .sort((a, b) => b.weight - a.weight);
  const best = hits[0]?.weight ?? 0;
  const rest = hits.slice(1).reduce((sum, h) => sum + h.weight, 0);
  const relevance = best + Math.min(0.35 * rest, 3);
  if (best < MIN_RELEVANCE) return { ok: false, why: "unrelated" };

  // Specialist work (AI training or review for experts) only in the person's own specialty:
  // a chemistry trainer job isn't for a generalist AI evaluator.
  if (job.category === "domain") {
    const named = CONCEPTS.filter((c) => DOMAIN_CONCEPTS.has(c.id) && c.job.test(title));
    if (named.some((c) => !sig.concepts.has(c.id))) return { ok: false, why: "domain" };
    if (!hits.some((h) => h.categories.includes("domain") || h.section === "keywords")) return { ok: false, why: "domain" };
  }

  // A degree/licence job only when it is the person's own line of work: the match comes from
  // their fields or expertise (not a recommendation or a skill), in the job's category
  // (a "licensed lawyer" job that mentions AI video is still a lawyer job).
  if (job.requires_credential) {
    const own = hits[0].section === "field" || hits[0].section === "domain";
    if (!own || best < CREDENTIAL_MIN_WEIGHT || !job.category || !hits[0].categories.includes(job.category)) return { ok: false, why: "credential" };
    penalty += 1;
  }

  const tools = sig.tools.filter((t) => new RegExp(`(^|[^a-z0-9])${escapeRe(t)}([^a-z0-9]|$)`, "i").test(text));

  let bonus = 0;
  if (job.category && hits[0].categories.includes(job.category)) bonus += 0.5;
  // The person's own specialty (nursing, accounting, law…) is the most specific fit there is.
  if (hits.some((h) => DOMAIN_CONCEPTS.has(h.id))) bonus += SPECIALTY_BONUS;
  if (payUsd !== null) {
    if (job.pay_unit === "hour" && sig.minHourlyUsd !== null) bonus += payUsd >= sig.minHourlyUsd * 1.5 ? 1 : 0.5;
    else if (job.pay_unit === "hour") bonus += 0.5;
    else if (payUsd < TINY_BUDGET_USD) penalty += 2;
    else if (payUsd >= 250) bonus += 0.5;
  }
  const ageHours = (now.getTime() - new Date(job.first_seen_at).getTime()) / 3_600_000;
  if (ageHours <= 36) bonus += 1;
  else if (ageHours <= 96) bonus += 0.5;
  if (job.status === "pool") penalty += 1;

  // Named tools confirm a match but never outweigh the order of the person's fields.
  const toolBonus = tools.length === 0 ? 0 : tools.length === 1 ? 1 : 1.5;
  const score = relevance + toolBonus + bonus - penalty;
  return { ok: true, score: Math.round(score * 100) / 100, relevance, hits, tools };
}

export type Ranked<J extends FitJob> = { job: J; score: number; hits: ConceptHit[]; tools: string[] };

/** Jobs that fit, best first (ties: newer first). */
export function rankForProfile<J extends FitJob>(jobs: J[], sig: ProfileSignals, now: Date = new Date()): Ranked<J>[] {
  const out: Ranked<J>[] = [];
  for (const job of jobs) {
    const fit = assessJob(job, sig, now);
    if (fit.ok) out.push({ job, score: fit.score, hits: fit.hits, tools: fit.tools });
  }
  return out.sort((a, b) => b.score - a.score || b.job.first_seen_at.localeCompare(a.job.first_seen_at));
}

/** Count of why jobs were left out (dry runs, logs). */
export function exclusionSummary(jobs: FitJob[], sig: ProfileSignals, now: Date = new Date()): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const job of jobs) {
    const fit = assessJob(job, sig, now);
    if (fit.ok) continue;
    const key = fit.why.split(":")[0];
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function shorten(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

/** Display name of a matched tool token ("next.js" → "Next.js"), taken from the profile's own spelling. */
function toolLabel(token: string, skills: string[]): string {
  for (const s of skills) {
    const m = new RegExp(escapeRe(token), "i").exec(s);
    if (m) return m[0];
  }
  return token;
}

export type PickNote = { reason: string; today: string };

/**
 * Reason and today-line without the model (fallback, and for picks the model
 * didn't make). Cites the profile wording that matched.
 */
export function ruleNote(r: Ranked<FitJob>, profile: Profile, now: Date = new Date()): PickNote {
  const top = r.hits[0];
  const tool = r.tools[0] ? ` · ${toolLabel(r.tools[0], profile.skills)} 그대로` : "";
  const reason =
    top.section === "keywords"
      ? shorten(`AI 분석의 검색어 ‘${shorten(top.trigger, 24)}’에 딱 맞는 일${tool}`, 80)
      : shorten(`AI 분석의 ‘${shorten(top.trigger, 22)}’와 맞는 ${top.label} 일${tool}`, 80);

  const ageHours = (now.getTime() - new Date(r.job.first_seen_at).getTime()) / 3_600_000;
  let today: string;
  if (isBiddingGig(r.job.url)) {
    today = ageHours <= 36 ? "오늘 바로 견적 입찰: 올라온 지 하루 남짓, 지원자가 적을 때예요" : "오늘 견적 입찰: 비슷한 작업물 링크 1개와 짧은 제안이면 돼요";
  } else if (r.job.hours_per_week_min) {
    today = `오늘 지원서 제출: 통과하면 주 ${r.job.hours_per_week_min}시간부터 시작해요`;
  } else {
    today = "오늘 원문에서 조건 확인하고 바로 지원해 보세요";
  }
  return { reason, today };
}
