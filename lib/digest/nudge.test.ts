import { test } from "node:test";
import assert from "node:assert/strict";
import { profileNudge } from "./nudge";

test("no profile: always ask for one", () => {
  assert.equal(profileNudge(null, "2026-11-15"), "missing");
});

test("an analysis is refreshed every two weeks, shown for a few mails", () => {
  const at = "2026-11-14T03:00:00Z"; // analysed 11/14 noon KST
  assert.equal(profileNudge(at, "2026-11-15"), null);
  assert.equal(profileNudge(at, "2026-11-27"), null, "13 days");
  assert.equal(profileNudge(at, "2026-11-28"), "stale", "14 days");
  assert.equal(profileNudge(at, "2026-11-30"), "stale", "16 days");
  assert.equal(profileNudge(at, "2026-12-01"), null, "17 days: window over");
  assert.equal(profileNudge(at, "2026-12-12"), "stale", "28 days");
});
