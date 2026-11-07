import { test } from "node:test";
import assert from "node:assert/strict";
import { planManualDigest, summarizePlan, type DigestStatus } from "./plan";

const a = { user_id: "u-a", email: "a@example.com" };
const b = { user_id: "u-b", email: "b@example.com" };
const c = { user_id: "u-c", email: "c@example.com" };
const d = { user_id: "u-d", email: "d@example.com" };

test("sends the picked jobs in order to everyone new today", () => {
  const plan = planManualDigest({
    recipients: [a, b],
    jobIds: ["j1", "j2", "j3"],
    todayStatus: new Map(),
    alreadyMatched: new Set(),
    maxJobs: 5,
  });
  assert.deepEqual(plan, [
    { kind: "send", recipient: a, jobIds: ["j1", "j2", "j3"] },
    { kind: "send", recipient: b, jobIds: ["j1", "j2", "j3"] },
  ]);
});

test("one mail per day: sent and skipped are final, failed is retried", () => {
  const todayStatus = new Map<string, DigestStatus>([
    ["u-a", "sent"],
    ["u-b", "skipped"],
    ["u-c", "failed"],
  ]);
  const plan = planManualDigest({
    recipients: [a, b, c, d],
    jobIds: ["j1"],
    todayStatus,
    alreadyMatched: new Set(),
    maxJobs: 5,
  });
  assert.deepEqual(
    plan.map((p) => [p.recipient.user_id, p.kind]),
    [
      ["u-a", "already_done"],
      ["u-b", "already_done"],
      ["u-c", "send"],
      ["u-d", "send"],
    ],
  );
});

test("never resends a job the user already got; empty → skip", () => {
  const plan = planManualDigest({
    recipients: [a, b],
    jobIds: ["j1", "j2"],
    todayStatus: new Map(),
    alreadyMatched: new Set(["u-a:j1", "u-b:j1", "u-b:j2"]),
    maxJobs: 5,
  });
  assert.deepEqual(plan, [
    { kind: "send", recipient: a, jobIds: ["j2"] },
    { kind: "skip_empty", recipient: b },
  ]);
  assert.deepEqual(summarizePlan(plan), { send: 1, skipEmpty: 1, alreadyDone: 0 });
});

test("caps at maxJobs and ignores duplicate ids and recipients", () => {
  const plan = planManualDigest({
    recipients: [a, a],
    jobIds: ["j1", "j1", "j2", "j3", "j4", "j5", "j6"],
    todayStatus: new Map(),
    alreadyMatched: new Set(),
    maxJobs: 5,
  });
  assert.deepEqual(plan, [{ kind: "send", recipient: a, jobIds: ["j1", "j2", "j3", "j4", "j5"] }]);
});
