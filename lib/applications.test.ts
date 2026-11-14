import { test } from "node:test";
import assert from "node:assert/strict";
import { StatusFormSchema } from "./applications";

const jobId = "7e36a4a4-e491-4766-a2ec-f5df484384e8";

test("status form: a known status or empty to clear", () => {
  assert.equal(StatusFormSchema.parse({ jobId, status: "applied" }).status, "applied");
  assert.equal(StatusFormSchema.parse({ jobId, status: "" }).status, "");
  assert.equal(StatusFormSchema.safeParse({ jobId, status: "drafted" }).success, false, "drafted is not picked by hand");
  assert.equal(StatusFormSchema.safeParse({ jobId: "x", status: "paid" }).success, false);
});
