import { test } from "node:test";
import assert from "node:assert/strict";
import { createRateGate, DEFAULT_SENDS_PER_SECOND, MAX_SENDS_PER_SECOND, sendConcurrency, sendsPerSecond } from "./rate";
import { forEachConcurrent } from "../workers/run";

test("send rate: per-transport default, override, and a ceiling", () => {
  assert.equal(sendsPerSecond("resend"), DEFAULT_SENDS_PER_SECOND.resend);
  assert.ok(sendsPerSecond("resend") < 10, "Resend allows 10/s for the whole team; leave room for login mails");
  assert.equal(sendsPerSecond("ses"), DEFAULT_SENDS_PER_SECOND.ses);
  assert.equal(sendsPerSecond("ses", 14), 14);
  assert.equal(sendsPerSecond("ses", 500), MAX_SENDS_PER_SECOND);
  assert.equal(sendConcurrency(8), 12);
  assert.equal(sendConcurrency(0.5), 1);
});

test("rate gate: no one-second window holds more starts than the rate", async () => {
  let clock = 0;
  const starts: number[] = [];
  const gate = createRateGate(
    8,
    () => clock,
    async (ms) => {
      clock += ms;
    },
  );
  for (let i = 0; i < 40; i++) {
    await gate.take();
    starts.push(clock);
  }
  for (let i = 0; i < starts.length; i++) {
    const inWindow = starts.filter((t) => t >= starts[i] && t < starts[i] + 1000).length;
    assert.ok(inWindow <= 8, `${inWindow} starts in the second after ${starts[i]} ms`);
  }
  assert.ok(starts.at(-1)! <= 39 * 125 + 1, "and it does not go slower than the rate either");
});

test("concurrent runner: every item once, never more in flight than asked", async () => {
  const seen: number[] = [];
  let inFlight = 0;
  let peak = 0;
  await forEachConcurrent(
    Array.from({ length: 50 }, (_, i) => i),
    7,
    async (n) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      try {
        await new Promise((r) => setTimeout(r, n % 3));
        if (n === 13) throw new Error("one bad item");
        seen.push(n);
      } finally {
        inFlight--;
      }
    },
  );
  assert.equal(peak, 7);
  assert.deepEqual(
    [...seen].sort((a, b) => a - b),
    Array.from({ length: 50 }, (_, i) => i).filter((n) => n !== 13),
    "a throwing item does not stop the rest",
  );
});
