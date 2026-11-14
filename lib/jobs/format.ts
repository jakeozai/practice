/** Display helpers shared by the mail template, admin pages and (later) /j/[id]. */
import type { Tables } from "../supabase/database.types";
import { languageNameKo } from "./language";

type Job = Tables<"jobs">;

export const ENGLISH_LEVEL_LABELS_KO = {
  none: "영어 필요 없음",
  reading: "영어 독해",
  conversational: "영어 일상 회화",
  business: "영어 업무 수준",
  native: "영어 원어민",
} as const;

export const CATEGORY_LABELS_KO = {
  language: "언어",
  domain: "전문 분야",
  labeling: "라벨링",
  video: "영상",
  design: "디자인",
  motion_3d: "3D·모션",
  dev: "개발·자동화",
  writing: "글쓰기",
  other: "기타",
} as const;

/** Category chip on a mail card; `other` gets none. */
export const CATEGORY_CHIP_KO = {
  language: "언어 작업",
  domain: "전문 분야",
  labeling: "데이터 라벨링",
  video: "영상 편집·제작",
  design: "디자인·사진",
  motion_3d: "3D·모션",
  dev: "개발·자동화",
  writing: "글쓰기",
} as const;

/** "영어" row on a mail card. */
const ENGLISH_NEED_KO = {
  none: "필요 없음",
  reading: "읽기 수준",
  conversational: "일상 회화",
  business: "유창한 업무 수준",
  native: "원어민 수준",
} as const;

const ENGAGEMENT_KO = {
  freelance: "프리랜서",
  contract: "기간 계약",
  part_time: "파트타임",
  permanent: "정규직",
} as const;

export type JobFact = { label: string; value: string };

/** Label/value rows on a mail card. Pay is always shown; the rest only when known. */
export function jobFacts(
  job: Pick<
    Job,
    "pay_min" | "pay_max" | "pay_currency" | "pay_unit" | "hours_per_week_min" | "languages" | "english_level" | "engagement"
  >,
): JobFact[] {
  const facts: JobFact[] = [{ label: "보수", value: formatPay(job) ?? "원문에서 확인" }];
  if (job.hours_per_week_min) facts.push({ label: "시간", value: `주 ${job.hours_per_week_min}시간부터` });
  if (job.languages.length) facts.push({ label: "작업 언어", value: job.languages.map(languageNameKo).join(", ") });
  if (job.english_level) facts.push({ label: "영어", value: ENGLISH_NEED_KO[job.english_level] });
  if (job.engagement && job.engagement !== "permanent") facts.push({ label: "형태", value: ENGAGEMENT_KO[job.engagement] });
  return facts;
}

export type StatusBadge = { label: string; tone: "open" | "pool" };

/** Mail badge per spec §9. `unknown` gets no badge; `closed` is never sent. */
export function statusBadge(status: Job["status"]): StatusBadge | null {
  if (status === "open") return { label: "실제 프로젝트", tone: "open" };
  if (status === "pool") return { label: "상시 모집 — 대기가 길 수 있음", tone: "pool" };
  return null;
}

const UNIT_PREFIX: Record<NonNullable<Job["pay_unit"]>, string> = {
  hour: "시간당",
  task: "건당",
  project: "프로젝트당",
  month: "월",
};

const CURRENCY_SYMBOL: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", KRW: "₩" };

function amount(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

/** "시간당 $30~35" / "건당 $5" / null when there is no pay info. */
export function formatPay(job: Pick<Job, "pay_min" | "pay_max" | "pay_currency" | "pay_unit">): string | null {
  const min = job.pay_min ?? job.pay_max;
  const max = job.pay_max ?? job.pay_min;
  if (min === null || max === null) return null;

  const code = (job.pay_currency ?? "USD").toUpperCase();
  const symbol = CURRENCY_SYMBOL[code];
  const range = min === max ? amount(min) : `${amount(min)}~${amount(max)}`;
  const money = symbol ? `${symbol}${range}` : `${range} ${code}`;
  return job.pay_unit ? `${UNIT_PREFIX[job.pay_unit]} ${money}` : money;
}

/** "시간당 $30~35 · 주 15시간~" — the conditions line on a mail card. */
export function formatConditions(
  job: Pick<Job, "pay_min" | "pay_max" | "pay_currency" | "pay_unit" | "hours_per_week_min">,
): string {
  const parts = [formatPay(job), job.hours_per_week_min ? `주 ${job.hours_per_week_min}시간~` : null].filter(
    (p): p is string => Boolean(p),
  );
  return parts.length ? parts.join(" · ") : "보수·시간은 원문에서 확인";
}

/** Lowercase, keep only ASCII letters/digits and Hangul, collapse spaces (spec §8). */
export function normalizeTitle(title: string): string {
  return title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
