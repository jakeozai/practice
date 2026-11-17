import { test } from "node:test";
import assert from "node:assert/strict";
import { ProfileSchema, missingFields } from "./parse";
import { fromDraft, toDraft } from "./draft";

const profile = ProfileSchema.parse({
  languages: [
    { code: "ko", level: "native" },
    { code: "ja", level: "conversational" },
    { code: "en", level: "reading" },
  ],
  fields: ["번역", "콘텐츠 검수"],
  skills: ["Premiere Pro"],
  experience_summary_ko: "자막 검수 경험",
  weekly_hours: 10,
  preferred_time: "evening",
  min_hourly_usd: 20,
  has_desktop: true,
  avoid: ["음성 녹음"],
});

test("round trip through the edit form keeps the profile", () => {
  const back = ProfileSchema.parse(fromDraft(toDraft(profile), profile));
  assert.deepEqual(back, profile);
});

test("editing English level keeps other languages", () => {
  const draft = { ...toDraft(profile), englishLevel: "business" as const };
  const back = ProfileSchema.parse(fromDraft(draft, profile));
  assert.deepEqual(back.languages, [
    { code: "ko", level: "native" },
    { code: "ja", level: "conversational" },
    { code: "en", level: "business" },
  ]);
});

test("filling the missing fields clears `missing`", () => {
  const empty = ProfileSchema.parse({ languages: [{ code: "ko", level: "native" }] });
  assert.deepEqual(missingFields(empty).sort(), ["english_level", "fields", "weekly_hours"]);
  const draft = { ...toDraft(empty), englishLevel: "reading" as const, fields: "라벨링, 번역\n전사", weeklyHours: "8" };
  const filled = ProfileSchema.parse(fromDraft(draft, empty));
  assert.deepEqual(missingFields(filled), []);
  assert.deepEqual(filled.fields, ["라벨링", "번역", "전사"]);
  assert.equal(filled.weekly_hours, 8);
});

test("structured items survive the edit form round trip", () => {
  const p = ProfileSchema.parse({
    work_status: "employed",
    job_role: "경영지원",
    industry: "제조",
    career_years: 8,
    education_level: "bachelor",
    licenses: ["컴퓨터활용능력 1급"],
    ai_tools: ["ChatGPT"],
    ai_level: "daily",
    wanted_work: ["office", "language"],
    pay_preference: "hourly",
  });
  const back = ProfileSchema.parse(fromDraft(toDraft(p), p));
  for (const key of ["work_status", "job_role", "industry", "career_years", "education_level", "licenses", "ai_tools", "ai_level", "wanted_work", "pay_preference"] as const) {
    assert.deepEqual(back[key], p[key], key);
  }
});
