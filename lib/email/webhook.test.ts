import { test } from "node:test";
import assert from "node:assert/strict";
import { deliveryAction } from "./webhook";

test("permanent bounce marks the address bounced", () => {
  assert.deepEqual(deliveryAction({ type: "email.bounced", data: { to: ["A@Example.com"], bounce: { type: "Permanent" } } }), {
    status: "bounced",
    emails: ["a@example.com"],
  });
});

test("transient bounce and other events change nothing", () => {
  assert.equal(deliveryAction({ type: "email.bounced", data: { to: ["a@example.com"], bounce: { type: "Transient" } } }), null);
  assert.equal(deliveryAction({ type: "email.delivered", data: { to: ["a@example.com"] } }), null);
  assert.equal(deliveryAction({ type: "email.complained", data: { to: [] } }), null);
});

test("spam complaint unsubscribes", () => {
  assert.deepEqual(deliveryAction({ type: "email.complained", data: { to: ["b@example.com"] } }), {
    status: "unsubscribed",
    emails: ["b@example.com"],
  });
});
