import { test } from "node:test";
import assert from "node:assert/strict";
import { languageFixes, languageNameKo, namedLanguages, withNamedLanguages } from "./language";
import { buildSignals, personalLimits, rankForProfile, type FitJob } from "../match/fit";
import { PERSONAS } from "../match/personas";
import { ProfileSchema } from "../profile/parse";

const named = (title: string) => [...namedLanguages(title)].sort();

test("titles name the work language in the ways job boards write it", () => {
  assert.deepEqual(named("AI Trainers Network - Odia"), ["or"]);
  assert.deepEqual(named("Search Engine Evaluator - Odia (India)"), ["or"]);
  assert.deepEqual(named("Hindi speakers wanted for AI data"), ["hi"]);
  assert.deepEqual(named("Voice data from native Tagalog speakers"), ["tl"]);
  assert.deepEqual(named("AI Trainers Network - Cantonese"), ["zh"]);
  assert.deepEqual(named("AI Trainers Network - Cebuano"), ["ceb"]);
  assert.deepEqual(named("Ilocano Talent Hub"), ["ilo"]);
  assert.deepEqual(named("Luo Language Specialist - Freelance AI Trainer Project"), ["luo"]);
  assert.deepEqual(named("Guaraní Language Expert - Freelance AI Trainer Project"), ["gn"]);
  assert.deepEqual(named("K'iche' (Mayan) Language Expert - Freelance AI Trainer Project"), ["quc"]);
  assert.deepEqual(named("American Sign Language (ASL) - Freelance AI Trainer Project"), ["sgn"]);
  assert.deepEqual(named("AI Conversation Recording Contributor - Eastern Punjabi/Punjabi (India)"), ["pa"]);
  assert.deepEqual(named("English to Latvian Review Lead"), ["en", "lv"]);
  assert.deepEqual(named("Spanish (Latin America) Language Data Contributor"), ["es"]);
  assert.deepEqual(named("Brazilian Portuguese - Food, Drink & Culinary Culture Subject Matter Expert (SME)"), ["pt"]);
  assert.deepEqual(named("오디아어 원어민 평가자"), ["or"]);
  assert.deepEqual(named("세부아노어 AI 학습 데이터"), ["ceb"]);
});

test("words that look like language names but aren't the work language", () => {
  for (const t of [
    "Japanese-style anime illustration",
    "Japanese style menu design",
    "Korean food blog writer",
    "Chinese New Year poster design",
    "Polish my resume",
    "Irish residents only - video editor",
    "Latin America sales deck",
    "Senior Software Engineer",
    "선임 엔지니어 (불가리아)",
    "AI 평가 언어 전문가",
  ]) {
    assert.deepEqual(named(t), [], t);
  }
});

test("stored languages: named ones first, nothing removed, other codes for the same language merged", () => {
  assert.deepEqual(withNamedLanguages(["en"], ["AI Trainers Network - Odia", "오디아 AI 학습 데이터 전문가"]), ["or", "en"]);
  assert.deepEqual(withNamedLanguages(["ko", "en"], ["AI Data Specialist - Korean"]), ["ko", "en"]);
  assert.deepEqual(withNamedLanguages([], ["Video annotation"]), []);
  assert.deepEqual(withNamedLanguages(["fil", "en"], ["Tagalog AI trainer"]), ["tl", "en"]);
  assert.deepEqual(withNamedLanguages(["la", "en"], ["AI Trainers Network - Lao"]), ["lo", "la", "en"], "a wrong code stays; the right one is added");
  // A Korean name we have no code for can't be stored (fit.ts still reads it from the title).
  assert.deepEqual(withNamedLanguages(["en"], ["카크치켈어 AI 학습 전문가"]), ["en"]);
  assert.deepEqual(withNamedLanguages(["en"], ["Kaqchikel AI Training Specialist", "카크치켈어 AI 학습 전문가"]), ["cak", "en"]);
  assert.deepEqual(withNamedLanguages(["en"], [null, undefined, "AI Trainers Network - Odia"]), ["or", "en"]);
});

test("Korean names for stored codes", () => {
  assert.equal(languageNameKo("or"), "오디아어");
  assert.equal(languageNameKo("ceb"), "세부아노어");
  assert.equal(languageNameKo("sgn"), "수화");
  assert.equal(languageNameKo("kha"), "KHA");
});

/** As stored on 2026-11-16 (jobs 552f022a…): only "en", though the job is for Odia speakers. */
const ODIA: FitJob = {
  id: "odia",
  title: "AI Trainers Network - Odia",
  title_ko: "오디아 AI 학습 데이터 전문가",
  summary_ko: ["AI 학습 데이터 구축을 위한 오디아 언어 전문가 모집", "재택근무 기반으로 데이터 라벨링, 평가, 프롬프트 생성 등 다양한 프로젝트 참여", "유연한 근무 조건과 성장 기회를 제공하는 글로벌 커뮤니티 참여"],
  category: "labeling",
  languages: ["en"],
  english_level: "reading",
  requires_credential: false,
  hours_per_week_min: null,
  pay_min: null,
  pay_max: null,
  pay_currency: null,
  pay_unit: null,
  status: "pool",
  first_seen_at: "2026-11-15T12:00:00Z",
  url: "https://example.com/odia",
};

test("a job for speakers of a language the profile doesn't list never reaches the rule pool", () => {
  const now = new Date("2026-11-16T00:00:00Z");
  for (const languages of [["en"], ["or", "en"]]) {
    const job = { ...ODIA, languages };
    for (const p of PERSONAS) {
      const sig = buildSignals(p.profile);
      assert.deepEqual(rankForProfile([job], sig, now), [], `${p.id} with ${languages}`);
      assert.match((personalLimits(job, sig) as { why: string }).why, /^language:.*\bor\b/, p.id);
    }
  }
  // Someone who works in Odia isn't kept out by the language rule.
  const odiaSpeaker = buildSignals(ProfileSchema.parse({ languages: [{ code: "or", level: "native" }, { code: "en", level: "business" }], fields: ["AI 학습 데이터 라벨링"] }));
  assert.equal(personalLimits({ ...ODIA, languages: ["or", "en"] }, odiaSpeaker).ok, true);
});

test("backfill lists only rows whose languages change", () => {
  const fixes = languageFixes([
    { id: "a", title: "AI Trainers Network - Odia", title_ko: "오디아 AI 학습 데이터 전문가", languages: ["en"] },
    { id: "b", title: "AI Trainers Network - Korean", title_ko: "한국어 AI 데이터 작업 참여자 모집", languages: ["ko", "en"] },
    { id: "c", title: "Edit 10 YouTube Shorts", title_ko: null, languages: ["en"] },
    { id: "d", title: "AI Trainers Network - Tagalog", title_ko: null, languages: ["fil", "en"] },
  ]);
  assert.deepEqual(
    fixes.map((f) => [f.id, f.to]),
    [
      ["a", ["or", "en"]],
      ["d", ["tl", "en"]],
    ],
  );
});
