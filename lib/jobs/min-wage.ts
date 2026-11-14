/**
 * Korea's minimum wage as a floor for hourly jobs (직업안정법 제25조: a job
 * information provider must not offer job information below the minimum
 * wage; 2026-11-14 user decision to apply it to every source).
 *
 * Only hourly pay can be judged: per-task, per-project and monthly pay don't
 * say how many hours the work takes. The lowest offered rate counts, so a
 * "$2–8 an hour" range is out even though its top is fine (strict reading:
 * the posting itself offers a sub-minimum rate). This drops Invisible's
 * generic "$6–65/hr" postings; switching to the top rate is one line here.
 *
 * Applied when the mail's candidates are loaded (lib/digest/candidates.ts),
 * not when jobs are processed, so the stored jobs stay as they are and a
 * new minimum wage or a change of reading takes effect the next morning.
 */
import { USD_PER_UNIT } from "../match/concepts";

/** 최저임금 시간급(원). 2026년: 고용노동부 고시 제2025-47호. 2027년: 2026-08-05 고시. 새 고시가 나오면 추가한다. */
export const KR_MIN_WAGE_KRW_PER_HOUR: Readonly<Record<number, number>> = { 2026: 10_320, 2027: 10_700 };

/** The minimum hourly wage on a Seoul date (YYYY-MM-DD); the latest known year if the date is past the table. */
export function minWageKrw(seoulDateIso: string): number {
  const year = Number(seoulDateIso.slice(0, 4));
  const years = Object.keys(KR_MIN_WAGE_KRW_PER_HOUR)
    .map(Number)
    .sort((a, b) => a - b);
  const known = years.filter((y) => y <= year);
  return KR_MIN_WAGE_KRW_PER_HOUR[known.length ? known[known.length - 1] : years[0]];
}

type PayFields = { pay_min: number | null; pay_max: number | null; pay_currency: string | null; pay_unit: string | null };

/** Lowest offered hourly rate in won, or null when it isn't hourly or the currency is unknown. */
export function hourlyKrw(job: PayFields): number | null {
  if (job.pay_unit !== "hour") return null;
  const amount = job.pay_min ?? job.pay_max;
  if (amount === null || amount === undefined || !job.pay_currency) return null;
  const currency = job.pay_currency.toUpperCase();
  if (currency === "KRW") return amount;
  const usdPerUnit = USD_PER_UNIT[currency];
  const usdPerWon = USD_PER_UNIT.KRW;
  return usdPerUnit && usdPerWon ? (amount * usdPerUnit) / usdPerWon : null;
}

export function belowMinimumWage(job: PayFields, seoulDateIso: string): boolean {
  const krw = hourlyKrw(job);
  return krw !== null && krw < minWageKrw(seoulDateIso);
}
