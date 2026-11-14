import { test } from "node:test";
import assert from "node:assert/strict";
import { profileNudge } from "./nudge";

test("no profile: always ask for one", () => {
  assert.equal(profileNudge(null, "2026-11-15"), "missing");
});

test("an analysis is refreshed every 30 days, shown for a few mails", () => {
  const at = "2026-11-14T03:00:00Z"; // analysed 11/14 noon KST
  assert.equal(profileNudge(at, "2026-11-15"), null);
  assert.equal(profileNudge(at, "2026-12-13"), null, "29 days");
  assert.equal(profileNudge(at, "2026-12-14"), "stale", "30 days");
  assert.equal(profileNudge(at, "2026-12-16"), "stale", "32 days");
  assert.equal(profileNudge(at, "2026-12-17"), null, "33 days: window over");
  assert.equal(profileNudge(at, "2027-01-13"), "stale", "60 days");
});
