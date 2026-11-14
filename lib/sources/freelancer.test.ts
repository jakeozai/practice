import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FREELANCER_PRESETS,
  freelancerUrl,
  parseFreelancer,
  selectProjects,
  skipReason,
  toPosting,
  type FreelancerProject,
} from "./freelancer";

// Shape of a live response (2026-11-14), trimmed.
const base: FreelancerProject = {
  id: 40817307,
  title: "Daily Instagram & Facebook Reels",
  seo_url: "social-media-management/Daily-Instagram-Facebook-Reels-static",
  description: "Need 15 reels a month. Using AI tools for drafts is fine.",
  preview_description: "Need 15 reels",
  type: "fixed",
  status: "active",
  local: false,
  hireme: false,
  nonpublic: false,
  deleted: false,
  language: "en",
  time_submitted: 1794620351,
  budget: { minimum: 12500, maximum: 37500 },
  currency: { code: "INR", exchange_rate: 0.010608 },
  jobs: [{ name: "Video Editing" }, { name: "Animation" }],
  bid_stats: { bid_count: 18 },
};

test("parses the live response shape", () => {
  const projects = parseFreelancer({ status: "success", result: { projects: [base], users: null, total_count: 1 } });
  assert.equal(projects.length, 1);
  assert.equal(projects[0].currency?.exchange_rate, 0.010608);
});

test("posting: original link, worldwide location, budget and skills ahead of the description", () => {
  const p = toPosting(base);
  assert.equal(p.external_id, "40817307");
  assert.equal(p.url, "https://www.freelancer.com/projects/social-media-management/Daily-Instagram-Facebook-Reels-static");
  assert.match(p.location_raw ?? "", /^Worldwide/);
  assert.ok(p.body.includes("Budget: INR 12500-37500 for the whole project (fixed price)"));
  assert.ok(p.body.includes("Skills: Video Editing, Animation"));
  assert.ok(p.body.indexOf("Budget:") < p.body.indexOf("Need 15 reels"));
});

test("skips on-site, private, adult and too-cheap gigs before any LLM call", () => {
  assert.equal(skipReason(base), null, "INR 37,500 ≈ $398 is fine");
  assert.equal(skipReason({ ...base, local: true }), "on-site only");
  assert.equal(skipReason({ ...base, nonpublic: true }), "private");
  assert.equal(skipReason({ ...base, title: "Realistic NSFW AI Content Workflow" }), "adult");
  assert.equal(skipReason({ ...base, budget: { minimum: 600, maximum: 1500 } }), "budget too low", "INR 1,500 ≈ $16 fixed");
  assert.equal(skipReason({ ...base, type: "hourly", currency: { code: "USD", exchange_rate: 1 }, budget: { minimum: 2, maximum: 8 } }), null);
  assert.equal(skipReason({ ...base, type: "hourly", currency: { code: "USD", exchange_rate: 1 }, budget: { minimum: 2, maximum: 5 } }), "budget too low");
  assert.equal(skipReason({ ...base, status: "closed" }), "not active");
});

test("merge: unique, newest first, capped", () => {
  const a = { ...base, id: 1, time_submitted: 100 };
  const b = { ...base, id: 2, time_submitted: 300 };
  const c = { ...base, id: 3, time_submitted: 200 };
  const cheap = { ...base, id: 4, budget: { minimum: 1, maximum: 2 } };
  const { kept, skipped } = selectProjects([[a, b], [b, c, cheap]], 2);
  assert.deepEqual(kept.map((p) => p.id), [2, 3]);
  assert.deepEqual(skipped, { "budget too low": 1, "over the per-run cap": 1 });
});

test("query URL asks for full descriptions within the preset window", () => {
  const preset = FREELANCER_PRESETS.gigs;
  const url = new URL(freelancerUrl("video editing", preset, new Date("2026-11-14T00:00:00Z")));
  assert.equal(url.searchParams.get("query"), "video editing");
  assert.equal(url.searchParams.get("full_description"), "true");
  assert.equal(Number(url.searchParams.get("from_time")), Date.UTC(2026, 10, 14) / 1000 - preset.windowHours * 3600);
  assert.ok(preset.queries.length === new Set(preset.queries).size, "no duplicate queries");
});
