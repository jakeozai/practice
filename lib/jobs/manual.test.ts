import { test } from "node:test";
import assert from "node:assert/strict";
import { ManualJobSchema, jobToFormValues, manualRawPosting, toJobFields, toJobInsert } from "./manual";

const form = {
  company: "Example AI",
  title: "Korean AI Trainer (Remote)",
  url: "https://jobs.example.com/123",
  summary_ko: "한국어 AI 답변을 평가하는 일\n\n전 세계 원격 지원 가능\n시간당 30~35달러",
  category: "language",
  languages: "ko, EN",
  korea_eligible: "true",
  eligibility_note: "Worldwide",
  pay_min: "30",
  pay_max: "35",
  pay_currency: "",
  pay_unit: "hour",
  hours_per_week_min: "15",
  english_level: "reading",
  status: "open",
};

test("parses a full form", () => {
  const j = ManualJobSchema.parse(form);
  assert.deepEqual(j.summary_ko, ["한국어 AI 답변을 평가하는 일", "전 세계 원격 지원 가능", "시간당 30~35달러"]);
  assert.deepEqual(j.languages, ["ko", "en"]);
  assert.equal(j.requires_credential, false);
  assert.equal(j.korea_eligible, true);
  assert.equal(j.pay_min, 30);
  assert.equal(j.hours_per_week_min, 15);

  const now = new Date("2026-11-07T10:00:00Z");
  const row = toJobInsert(j, "raw-id", now);
  assert.equal(row.title_normalized, "korean ai trainer remote");
  assert.equal(row.pay_currency, "USD");
  assert.equal(row.review_state, "approved");
  assert.equal(row.reviewed_at, now.toISOString());
});

test("blank optional fields become null", () => {
  const j = ManualJobSchema.parse({
    company: "X",
    title: "Y",
    url: "https://x.example/y",
    summary_ko: "한 줄",
    category: "",
    pay_min: "",
    pay_max: "",
    pay_unit: "hour",
    korea_eligible: "",
    english_level: "",
    hours_per_week_min: "",
  });
  assert.equal(j.category, null);
  assert.equal(j.korea_eligible, null);
  assert.equal(j.english_level, null);
  const row = toJobInsert(j, "raw-id", new Date());
  assert.equal(row.pay_currency, null);
  assert.equal(row.pay_unit, null, "unit is dropped when there is no amount");
});

test("rejects bad input with Korean messages", () => {
  const r = ManualJobSchema.safeParse({
    ...form,
    url: "javascript:alert(1)",
    summary_ko: "1\n2\n3\n4",
    pay_min: "40",
    pay_max: "35",
    languages: "korean",
  });
  assert.equal(r.success, false);
  if (r.success) return;
  const paths = r.error.issues.map((i) => i.path.join("."));
  for (const p of ["url", "summary_ko", "languages"]) assert.ok(paths.some((x) => x.split(".")[0] === p), `error on ${p}`);
});

test("pay range check", () => {
  const r = ManualJobSchema.safeParse({ ...form, pay_min: "40", pay_max: "35" });
  assert.equal(r.success, false);
  if (!r.success) assert.deepEqual(r.error.issues.map((i) => i.path.join(".")), ["pay_max"]);
});

test("summary lines are limited to 60 characters", () => {
  const r = ManualJobSchema.safeParse({ ...form, summary_ko: "가".repeat(61) });
  assert.equal(r.success, false);
});

test("raw posting stores no body and is marked processed", () => {
  const j = ManualJobSchema.parse(form);
  const raw = manualRawPosting(j, "source-id");
  assert.equal(raw.body, null);
  assert.equal(raw.processed_hash, raw.body_hash);
  assert.equal(raw.external_id, manualRawPosting(j, "source-id").external_id, "same URL → same external_id");
});

test("a jobs row round-trips through the form values", () => {
  const parsed = ManualJobSchema.parse(form);
  const row = { ...toJobInsert(parsed, "raw-id", new Date("2026-11-07T00:00:00Z")) } as Parameters<typeof jobToFormValues>[0];
  const again = ManualJobSchema.parse(jobToFormValues(row));
  // What gets saved is identical (pay_currency is defaulted to USD on the first save).
  assert.deepEqual(toJobFields(again), toJobFields(parsed));
});
