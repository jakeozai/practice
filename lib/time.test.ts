import { test } from "node:test";
import assert from "node:assert/strict";
import { seoulDate, koreanMonthDay, koreanWeekday, isIsoDate, seoulDayStartUtc, nextSendDate } from "./time";

test("seoulDate uses KST, not UTC", () => {
  // 21:00 UTC on Nov 7 = 06:00 KST on Nov 8 (the digest send time)
  assert.equal(seoulDate(new Date("2026-11-07T21:00:00Z")), "2026-11-08");
  assert.equal(seoulDate(new Date("2026-11-07T14:59:59Z")), "2026-11-07");
  assert.equal(seoulDate(new Date("2026-11-07T15:00:00Z")), "2026-11-08");
});

test("koreanMonthDay", () => {
  assert.equal(koreanMonthDay("2026-11-08"), "11월 8일");
  assert.equal(koreanMonthDay("2027-01-01"), "1월 1일");
});

test("koreanWeekday", () => {
  assert.equal(koreanWeekday("2026-11-13"), "금요일");
  assert.equal(koreanWeekday("2026-11-15"), "일요일");
  assert.throws(() => koreanWeekday("2026-02-30"));
});

test("isIsoDate", () => {
  assert.equal(isIsoDate("2026-11-08"), true);
  assert.equal(isIsoDate("2026-02-30"), false);
  assert.equal(isIsoDate("2026-1-8"), false);
});

test("seoulDayStartUtc", () => {
  assert.equal(seoulDayStartUtc("2026-11-08").toISOString(), "2026-11-07T15:00:00.000Z");
});

test("next send date: today before 06:00 KST, tomorrow after", () => {
  assert.equal(nextSendDate(new Date("2026-11-14T20:59:00Z")), "2026-11-15"); // 05:59 KST on the 15th
  assert.equal(nextSendDate(new Date("2026-11-14T21:00:00Z")), "2026-11-16"); // 06:00 KST on the 15th
  assert.equal(nextSendDate(new Date("2026-11-14T04:00:00Z")), "2026-11-15"); // 13:00 KST on the 14th
});
