import { test } from "node:test";
import assert from "node:assert/strict";
import { nextMissing, planSync } from "./sync";
import { bodyHash } from "./text";

const p = (id: string, body = "b") => ({ external_id: id, url: `https://x/${id}`, title: `T${id}`, location_raw: null, body });
const e = (id: string, body = "b") => ({
  id: `raw-${id}`,
  external_id: id,
  body_hash: bodyHash(body),
  url: `https://x/${id}`,
  title: `T${id}`,
  location_raw: null,
});

test("new, changed, unchanged and missing postings", () => {
  const plan = planSync([e("1"), e("2"), e("3")], [p("1"), p("2", "edited"), p("4")]);
  assert.deepEqual(
    plan.upserts.map((u) => u.external_id),
    ["2", "4"],
  );
  assert.equal(plan.upserts[0].body_hash, bodyHash("edited"));
  assert.deepEqual(plan.seenRawIds, ["raw-1", "raw-2"]);
  assert.deepEqual(plan.missingRawIds, ["raw-3"]);
  assert.equal(plan.newCount, 1);
});

test("duplicate ids in one response are stored once", () => {
  const plan = planSync([], [p("1"), p("1")]);
  assert.equal(plan.upserts.length, 1);
});

test("a job closes after two missed runs", () => {
  assert.deepEqual(nextMissing(0), { missing_count: 1, close: false });
  assert.deepEqual(nextMissing(1), { missing_count: 2, close: true });
});
