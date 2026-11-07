/** Display helpers shared by the mail template, admin pages and (later) /j/[id]. */
import type { Tables } from "../supabase/database.types";

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
  other: "기타",
} as const;

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
