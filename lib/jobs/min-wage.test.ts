import { test } from "node:test";
import assert from "node:assert/strict";
import { belowMinimumWage, hourlyKrw, minWageKrw } from "./min-wage";

const hourly = (pay_min: number | null, pay_max: number | null, pay_currency = "USD") => ({ pay_min, pay_max, pay_currency, pay_unit: "hour" });

test("minimum wage by year", () => {
  assert.equal(minWageKrw("2026-11-15"), 10_320);
  assert.equal(minWageKrw("2027-01-01"), 10_700);
  assert.equal(minWageKrw("2029-03-01"), 10_700, "latest known until a new notice is added");
});

test("hourly jobs below Korea's minimum wage are out; the lowest offered rate counts", () => {
  const day = "2026-11-15";
  assert.equal(belowMinimumWage(hourly(4, 4), day), true, "$4/h");
  assert.equal(belowMinimumWage(hourly(2, 8), day), true, "$2–8/h: the low end is below");
  assert.equal(belowMinimumWage(hourly(16.2, 16.2), day), false);
  assert.equal(belowMinimumWage(hourly(null, 25), day), false, "only a top rate given");
  assert.equal(belowMinimumWage(hourly(9_000, 12_000, "KRW"), day), true, "9,000원");
  assert.equal(belowMinimumWage(hourly(11_000, null, "KRW"), day), false);
});

test("only hourly pay is judged", () => {
  const day = "2026-11-15";
  assert.equal(belowMinimumWage({ pay_min: 5, pay_max: 5, pay_currency: "USD", pay_unit: "task" }, day), false);
  assert.equal(belowMinimumWage({ pay_min: 50, pay_max: 100, pay_currency: "USD", pay_unit: "project" }, day), false);
  assert.equal(belowMinimumWage(hourly(null, null), day), false, "no pay stated");
  assert.equal(hourlyKrw(hourly(5, 5, "XYZ")), null, "unknown currency");
});
