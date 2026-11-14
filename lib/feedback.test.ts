import { test } from "node:test";
import assert from "node:assert/strict";
import { FeedbackFormSchema, formToObject, reportText } from "./feedback";

test("feedback form: not interested, or a report with a known reason", () => {
  assert.deepEqual(FeedbackFormSchema.parse({ action: "not_interested" }), { action: "not_interested" });
  const report = FeedbackFormSchema.parse({ action: "report", reason: "scam", note: "  텔레그램으로만 연락하래요 " });
  assert.equal(report.action === "report" && reportText(report), "scam: 텔레그램으로만 연락하래요");
  const bare = FeedbackFormSchema.parse({ action: "report", reason: "closed" });
  assert.equal(bare.action === "report" && reportText(bare), "closed");
  assert.equal(FeedbackFormSchema.safeParse({ action: "report", reason: "nope" }).success, false);
  assert.equal(FeedbackFormSchema.safeParse({ action: "report" }).success, false);
  assert.equal(FeedbackFormSchema.safeParse({ action: "delete" }).success, false);
  assert.equal(FeedbackFormSchema.safeParse({ action: "report", reason: "other", note: "x".repeat(301) }).success, false);
});

test("form fields: empty values are dropped", () => {
  const f = new FormData();
  f.set("action", "report");
  f.set("reason", "closed");
  f.set("note", "");
  f.set("extra", "ignored");
  assert.deepEqual(formToObject(f), { action: "report", reason: "closed" });
});
