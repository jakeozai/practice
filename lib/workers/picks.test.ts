import { test } from "node:test";
import assert from "node:assert/strict";
import { pickStillValid, type StoredPick } from "./picks";

const stored: StoredPick = { jobIds: ["a", "b", "c"], notes: {}, subject: null, method: "llm", createdAt: "2026-11-14T20:30:00Z" };
const open = new Set(["a", "b", "c", "d"]);

test("a stored pick is reused only while it still holds", () => {
  assert.equal(pickStillValid(stored, "2026-11-13T04:00:00Z", open, new Set()), true);
  assert.equal(pickStillValid(stored, "2026-11-14T21:00:00Z", open, new Set()), false, "profile changed after the pick");
  assert.equal(pickStillValid(stored, "2026-11-13T04:00:00Z", new Set(["a", "b"]), new Set()), false, "a job closed");
  assert.equal(pickStillValid(stored, "2026-11-13T04:00:00Z", open, new Set(["b"])), false, "a job was already sent");
  assert.equal(pickStillValid(undefined, "2026-11-13T04:00:00Z", open, new Set()), false);
  assert.equal(pickStillValid({ ...stored, jobIds: [] }, "2026-11-13T04:00:00Z", open, new Set()), false);
});

test("pick model: its own setting, else the extraction model", async () => {
  const { pickModel } = await import("./picks");
  assert.equal(pickModel("google/gemini-2.5-flash-lite", "google/gemini-2.5-flash"), "google/gemini-2.5-flash");
  assert.equal(pickModel("google/gemini-2.5-flash-lite", " "), "google/gemini-2.5-flash-lite");
  assert.equal(pickModel(null, undefined), null);
});
