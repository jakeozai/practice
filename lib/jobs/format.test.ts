import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPay, formatConditions, normalizeTitle, statusBadge } from "./format";

const base = { pay_min: null, pay_max: null, pay_currency: null, pay_unit: null, hours_per_week_min: null };

test("formatPay ranges and units", () => {
  assert.equal(formatPay({ ...base, pay_min: 30, pay_max: 35, pay_currency: "USD", pay_unit: "hour" }), "시간당 $30~35");
  assert.equal(formatPay({ ...base, pay_min: 20, pay_max: 20, pay_currency: "USD", pay_unit: "hour" }), "시간당 $20");
  assert.equal(formatPay({ ...base, pay_max: 5, pay_currency: "usd", pay_unit: "task" }), "건당 $5");
  assert.equal(formatPay({ ...base, pay_min: 12.5, pay_max: 17.25, pay_unit: "hour" }), "시간당 $12.5~17.25");
  assert.equal(formatPay({ ...base, pay_min: 900, pay_max: 1000, pay_currency: "CHF", pay_unit: "month" }), "월 900~1000 CHF");
  assert.equal(formatPay(base), null);
});

test("formatConditions", () => {
  assert.equal(
    formatConditions({ ...base, pay_min: 30, pay_max: 35, pay_currency: "USD", pay_unit: "hour", hours_per_week_min: 15 }),
    "시간당 $30~35 · 주 15시간~",
  );
  assert.equal(formatConditions({ ...base, hours_per_week_min: 10 }), "주 10시간~");
  assert.equal(formatConditions(base), "보수·시간은 원문에서 확인");
});

test("normalizeTitle", () => {
  assert.equal(normalizeTitle("  Korean  AI Trainer (Remote) — Freelance! "), "korean ai trainer remote freelance");
  assert.equal(normalizeTitle("한국어 AI 평가자 / Rater"), "한국어 ai 평가자 rater");
  assert.equal(normalizeTitle("ＡＩ Ｔｒａｉｎｅｒ"), "ai trainer");
});

test("statusBadge", () => {
  assert.deepEqual(statusBadge("open"), { label: "실제 프로젝트", tone: "open" });
  assert.deepEqual(statusBadge("pool"), { label: "상시 모집 — 대기가 길 수 있음", tone: "pool" });
  assert.equal(statusBadge("unknown"), null);
});
