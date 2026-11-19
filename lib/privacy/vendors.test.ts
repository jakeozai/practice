import { test } from "node:test";
import assert from "node:assert/strict";
import { PRIVACY_VENDORS, SES_VENDOR, policyCoversSes } from "./vendors";

test("SES stays off until the privacy policy names Amazon Web Services", () => {
  assert.equal(policyCoversSes(), false, "add SES_VENDOR to PRIVACY_VENDORS (with 30 days' notice) before switching");
  assert.equal(policyCoversSes([...PRIVACY_VENDORS, SES_VENDOR]), true);
});

test("the mail sender in use is in the policy", () => {
  assert.ok(PRIVACY_VENDORS.some((v) => v.short === "Resend"));
  for (const v of [...PRIVACY_VENDORS, SES_VENDOR]) {
    for (const [k, val] of Object.entries(v)) assert.ok(String(val).trim(), `${v.short}.${k} is empty`);
  }
});

test("emailEnv refuses SES while the policy doesn't name it", async () => {
  const saved = { ...process.env };
  try {
    Object.assign(process.env, {
      EMAIL_TRANSPORT: "ses",
      EMAIL_FROM: "덕잡 <hello@duckjob.app>",
      SES_ACCESS_KEY_ID: "test",
      SES_SECRET_ACCESS_KEY: "test",
    });
    const { emailEnv } = await import("../env");
    assert.throws(() => emailEnv(), /privacy policy/);
  } finally {
    process.env = saved;
  }
});
