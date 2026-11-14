import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSignals, rankForProfile, type FitJob } from "./fit";
import { PERSONAS } from "./personas";

const NOW = new Date("2026-11-15T00:00:00Z");

function job(id: string, title: string, partial: Partial<FitJob> = {}): FitJob {
  return {
    id,
    title,
    title_ko: null,
    summary_ko: [],
    category: "other",
    languages: ["en"],
    english_level: "reading",
    requires_credential: false,
    hours_per_week_min: null,
    pay_min: 100,
    pay_max: 300,
    pay_currency: "USD",
    pay_unit: "project",
    status: "open",
    first_seen_at: "2026-11-14T12:00:00Z",
    url: `https://www.freelancer.com/projects/x/${id}`,
    ...partial,
  };
}

/** One small market with a bit of everything. */
const JOBS: FitJob[] = [
  job("video", "Edit 10 YouTube Shorts from podcast footage", { category: "video", summary_ko: ["팟캐스트 촬영본으로 쇼츠 10개 편집"] }),
  job("loc", "English to Korean game localization review", { category: "language", languages: ["en", "ko"], english_level: "business", pay_unit: "hour", pay_max: 30 }),
  job("ko_eval", "Korean linguist for AI response evaluation", { category: "language", languages: ["ko"], pay_unit: "hour", pay_max: 25 }),
  job("logo", "Logo design for a coffee brand", { category: "design" }),
  job("banner", "Instagram banner set for a bakery", { category: "design", summary_ko: ["인스타그램 배너 5장"] }),
  job("scrape", "Python web scraping script for real estate listings", { category: "dev" }),
  job("java", "Java Spring backend bug fixes", { category: "dev" }),
  job("nurse", "Medical AI evaluation - registered nurses", { category: "domain", english_level: "business", requires_credential: true, pay_unit: "hour", pay_max: 45 }),
  job("chem", "Analytical Chemistry Specialist - AI Trainer", { category: "domain", english_level: "business", pay_unit: "hour", pay_max: 60 }),
  job("acct", "Accounting expert for AI model training", { category: "domain", english_level: "business", pay_unit: "hour", pay_max: 50 }),
  job("blog", "SEO blog writing - 10 articles about travel", { category: "writing", english_level: "business" }),
  job("render", "3D product rendering in Blender", { category: "motion_3d" }),
  job("annot", "Korean data annotation for AI", { category: "labeling", languages: ["ko"], pay_unit: "hour", pay_max: 15 }),
  job("fulltime", "Full-time video editor (40 hours/week)", { category: "video", hours_per_week_min: 40 }),
];

const expectations: Record<string, { gets: string[]; never: string[] }> = {
  translator: { gets: ["loc", "ko_eval"], never: ["video", "logo", "scrape", "nurse", "chem", "acct", "render"] },
  designer: { gets: ["logo", "banner"], never: ["video", "loc", "scrape", "render", "nurse"] },
  python_dev: { gets: ["scrape"], never: ["java", "video", "logo", "loc"] },
  nurse: { gets: ["nurse"], never: ["chem", "acct", "video", "logo"] },
  ko_ai_worker: { gets: ["ko_eval", "annot"], never: ["chem", "nurse", "acct", "video", "logo"] },
  copywriter: { gets: ["blog"], never: ["logo", "render", "nurse", "chem"] },
  "3d_artist": { gets: ["render"], never: ["video", "logo", "loc", "acct"] },
  accountant: { gets: ["acct"], never: ["nurse", "chem", "video", "logo"] },
};

test("every kind of person gets the work their own AI described, and nothing else", () => {
  assert.equal(PERSONAS.length, Object.keys(expectations).length);
  for (const p of PERSONAS) {
    const want = expectations[p.id];
    const ids = rankForProfile(JOBS, buildSignals(p.profile), NOW).map((r) => r.job.id);
    for (const id of want.gets) assert.ok(ids.includes(id), `${p.id} should get ${id}; got ${ids.join(",")}`);
    for (const id of want.never) assert.ok(!ids.includes(id), `${p.id} must not get ${id}; got ${ids.join(",")}`);
    assert.ok(!ids.includes("fulltime"), `${p.id}: never full-time`);
    assert.equal(ids[0], want.gets[0], `${p.id}: the first field leads (${ids.join(",")})`);
  }
});

test("the profile's own search terms reach work the concept list doesn't name", () => {
  const p = PERSONAS.find((x) => x.id === "designer")!;
  const packaging = job("pack", "Packaging design for a tea box", { category: "design" });
  const [r] = rankForProfile([packaging], buildSignals(p.profile), NOW);
  assert.ok(r, "packaging design is in the designer's search terms");
  assert.equal(r.hits[0].section, "keywords");
});
