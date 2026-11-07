/** Dates for `send_date` and UI labels use Asia/Seoul; the DB stores UTC timestamptz. */
export const SERVICE_TIME_ZONE = "Asia/Seoul";

/** YYYY-MM-DD in Asia/Seoul. */
export function seoulDate(at: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SERVICE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** "11월 8일" for a YYYY-MM-DD date. */
export function koreanMonthDay(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) throw new Error(`Invalid date: ${isoDate}`);
  return `${Number(m[2])}월 ${Number(m[3])}일`;
}

export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
}

/** First instant (UTC) of a Seoul calendar day. Korea has no DST, so the offset is fixed. */
export function seoulDayStartUtc(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00+09:00`);
}
