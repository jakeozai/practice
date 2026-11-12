import { test } from "node:test";
import assert from "node:assert/strict";
import { createPacer, llmRequestsPerMinute, pacedClient } from "./pace";

function fakeClock() {
  let t = 1_000_000;
  const slept: number[] = [];
  return {
    now: () => t,
    sleep: async (ms: number) => {
      slept.push(ms);
      t += ms;
    },
    slept,
  };
}

test("pacer spaces calls at 60s / rpm plus a margin", async () => {
  const clock = fakeClock();
  const pacer = createPacer(5, clock.now, clock.sleep);
  await pacer.take(); // immediate
  await pacer.take();
  await pacer.take();
  assert.deepEqual(clock.slept, [12_500, 12_500]);
  assert.equal(pacer.nextSlotAt(), clock.now() + 12_500);
});

test("concurrent takers get distinct slots", async () => {
  const clock = fakeClock();
  const pacer = createPacer(6, clock.now, clock.sleep);
  const start = clock.now();
  await Promise.all([pacer.take(), pacer.take(), pacer.take()]);
  // Three slots claimed back to back, 10.5 s apart (60 s / 6 + margin).
  assert.equal(pacer.nextSlotAt(), start + 3 * 10_500);
});

test("pacedClient waits before every request", async () => {
  const clock = fakeClock();
  const pacer = createPacer(5, clock.now, clock.sleep);
  let calls = 0;
  const client = pacedClient({ messages: { create: async () => { calls++; return { content: [] }; } } }, pacer);
  await client.messages.create({});
  await client.messages.create({});
  assert.equal(calls, 2);
  assert.deepEqual(clock.slept, [12_500]);
});

test("llmRequestsPerMinute reads the env, defaulting to the free-tier limit", () => {
  assert.equal(llmRequestsPerMinute(undefined), 5);
  assert.equal(llmRequestsPerMinute("abc"), 5);
  assert.equal(llmRequestsPerMinute("60"), 60);
});
