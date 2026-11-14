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

const WEEKDAYS_KO = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

/** "금요일" for a YYYY-MM-DD date (a calendar date, so no time zone is involved). */
export function koreanWeekday(isoDate: string): string {
  if (!isIsoDate(isoDate)) throw new Error(`Invalid date: ${isoDate}`);
  return WEEKDAYS_KO[new Date(`${isoDate}T00:00:00Z`).getUTCDay()];
}

export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
}

/** The daily mail goes out at 06:00 KST (2026-11-12 decision; pg_cron 21:00 UTC). */
export const SEND_HOUR_KST = 6;

/** The send instant of a Seoul calendar day: 06:00 KST. */
export function seoulSendTime(isoDate: string): Date {
  return new Date(`${isoDate}T${String(SEND_HOUR_KST).padStart(2, "0")}:00:00+09:00`);
}

/** First instant (UTC) of a Seoul calendar day. Korea has no DST, so the offset is fixed. */
export function seoulDayStartUtc(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00+09:00`);
}

/** The send date of the next 06:00 KST mail: today before 06:00 KST, tomorrow after. */
export function nextSendDate(at: Date = new Date()): string {
  const today = seoulDate(at);
  if (at.getTime() < seoulSendTime(today).getTime()) return today;
  return seoulDate(new Date(seoulSendTime(today).getTime() + 24 * 60 * 60 * 1000));
}
