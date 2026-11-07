import { test } from "node:test";
import assert from "node:assert/strict";
import { signLink, verifyLink, LINK_TTL_DAYS } from "./links";

const SECRET = "test-secret-test-secret-test-secret-0123";
const UID = "4f8c2a5e-1b3d-4c6e-8f9a-0b1c2d3e4f50";
const JOB = "9a8b7c6d-5e4f-4a3b-8c1d-0e9f8a7b6c5d";
const NOW = new Date("2026-11-07T00:00:00Z");

test("round trip keeps uid, purpose and jobId", () => {
  const token = signLink({ uid: UID, purpose: "click", jobId: JOB }, SECRET, NOW);
  const r = verifyLink(token, "click", SECRET, NOW);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.payload.uid, UID);
  assert.equal(r.payload.jobId, JOB);
  assert.equal(r.expired, false);
});

test("token is URL-safe", () => {
  const token = signLink({ uid: UID, purpose: "unsub" }, SECRET, NOW);
  assert.match(token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
});

test("rejects a tampered payload", () => {
  const token = signLink({ uid: UID, purpose: "unsub" }, SECRET, NOW);
  const [, sig] = token.split(".");
  const forged = Buffer.from(
    JSON.stringify({ uid: "00000000-0000-4000-8000-000000000000", purpose: "unsub", exp: 9999999999 }),
  ).toString("base64url");
  assert.deepEqual(verifyLink(`${forged}.${sig}`, "unsub", SECRET, NOW), { ok: false, error: "BAD_SIGNATURE" });
});

test("rejects a token signed with another secret", () => {
  const token = signLink({ uid: UID, purpose: "unsub" }, "another-secret-another-secret-another-1", NOW);
  assert.deepEqual(verifyLink(token, "unsub", SECRET, NOW), { ok: false, error: "BAD_SIGNATURE" });
});

test("rejects a token used for another purpose", () => {
  const token = signLink({ uid: UID, purpose: "click", jobId: JOB }, SECRET, NOW);
  assert.deepEqual(verifyLink(token, "unsub", SECRET, NOW), { ok: false, error: "WRONG_PURPOSE" });
});

test("reports expiry after the TTL", () => {
  const token = signLink({ uid: UID, purpose: "unsub" }, SECRET, NOW);
  const later = new Date(NOW.getTime() + (LINK_TTL_DAYS * 24 + 1) * 3600 * 1000);
  const r = verifyLink(token, "unsub", SECRET, later);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.expired, true);
});

test("malformed tokens", () => {
  for (const bad of ["", "abc", "a.b.c", ".", "abc."]) {
    const r = verifyLink(bad, "unsub", SECRET, NOW);
    assert.equal(r.ok, false, bad);
  }
});
