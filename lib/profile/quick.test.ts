import { test } from "node:test";
import assert from "node:assert/strict";
import { ProfileSchema } from "./parse";
import { QUICK_FIELD_CHOICES, QUICK_MAX_FIELDS, quickProfile } from "./quick";
import { CONCEPTS } from "../match/concepts";

test("five answers make a valid profile", () => {
  const p = ProfileSchema.parse(
    quickProfile({ fields: ["영상 편집", "3D 모델링"], skills: "Premiere, Blender，Photoshop", englishLevel: "reading", weeklyHours: "10", minHourlyUsd: "12" }),
  );
  assert.deepEqual(p.fields, ["영상 편집", "3D 모델링"]);
  assert.deepEqual(p.skills, ["Premiere", "Blender", "Photoshop"]);
  assert.deepEqual(p.languages, [
    { code: "ko", level: "native" },
    { code: "en", level: "reading" },
  ]);
  assert.equal(p.weekly_hours, 10);
  assert.equal(p.min_hourly_usd, 12);
});

test("blank answers stay empty, at most five fields", () => {
  const p = ProfileSchema.parse(quickProfile({ fields: [...QUICK_FIELD_CHOICES], skills: "", englishLevel: "", weeklyHours: "", minHourlyUsd: "" }));
  assert.equal(p.fields.length, QUICK_MAX_FIELDS);
  assert.deepEqual(p.skills, []);
  assert.deepEqual(p.languages, [{ code: "ko", level: "native" }]);
  assert.equal(p.weekly_hours, null);
  assert.equal(p.min_hourly_usd, null);
});

test("every choice is understood by the matching dictionary", () => {
  for (const choice of QUICK_FIELD_CHOICES) {
    assert.ok(
      CONCEPTS.some((c) => c.profile.test(choice)),
      `${choice} matches no concept`,
    );
  }
});
