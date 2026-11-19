import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeFromAddress, sesError, sesRequest } from "./ses";
import { unsubscribeHeaders, type OutgoingEmail } from "./send";

const mail: OutgoingEmail = {
  to: "reader@example.com",
  subject: "🦆 영상 편집 실력으로 해볼 만한 일감 5개 가져왔어요 (11/17)",
  html: "<p>안녕하세요</p>",
  text: "안녕하세요",
  headers: unsubscribeHeaders("https://www.duckjob.app/api/email/unsubscribe?t=abc"),
  idempotencyKey: "digest-1234-2026-11-17",
};

test("SES gets the same mail Resend did: from, reply-to, subject, both bodies, unsubscribe headers", () => {
  const req = sesRequest(mail, { from: "hello@duckjob.app", replyTo: "contact@example.com", configurationSet: "duckjob-events" });
  assert.equal(req.FromEmailAddress, "hello@duckjob.app");
  assert.deepEqual(req.Destination, { ToAddresses: ["reader@example.com"] });
  assert.deepEqual(req.ReplyToAddresses, ["contact@example.com"]);
  assert.equal(req.ConfigurationSetName, "duckjob-events");
  const simple = req.Content!.Simple!;
  assert.deepEqual(simple.Subject, { Data: mail.subject, Charset: "UTF-8" });
  assert.equal(simple.Body!.Html!.Data, mail.html);
  assert.equal(simple.Body!.Text!.Data, mail.text);
  assert.deepEqual(simple.Headers, [
    { Name: "List-Unsubscribe", Value: "<https://www.duckjob.app/api/email/unsubscribe?t=abc>" },
    { Name: "List-Unsubscribe-Post", Value: "List-Unsubscribe=One-Click" },
  ]);
  assert.deepEqual(req.EmailTags, [{ Name: "mail", Value: "digest-1234-2026-11-17" }]);

  const bare = sesRequest(mail, { from: "hello@duckjob.app", replyTo: null });
  assert.equal("ReplyToAddresses" in bare, false);
  assert.equal("ConfigurationSetName" in bare, false);
});

test("a Korean display name is MIME-encoded; plain addresses pass as they are", () => {
  assert.equal(encodeFromAddress("hello@duckjob.app"), "hello@duckjob.app");
  assert.equal(encodeFromAddress("duckjob <hello@duckjob.app>"), "duckjob <hello@duckjob.app>");
  const encoded = encodeFromAddress("덕잡 <hello@duckjob.app>");
  assert.match(encoded, /^=\?UTF-8\?B\?[A-Za-z0-9+/=]+\?= <hello@duckjob\.app>$/);
  const b64 = encoded.match(/\?B\?(.+)\?=/)![1];
  assert.equal(Buffer.from(b64, "base64").toString("utf8"), "덕잡");
  assert.equal(encodeFromAddress('"덕잡" <hello@duckjob.app>'), encoded);
});

test("SES errors: throttling and 5xx may be retried later, a timeout never (no idempotency key)", () => {
  assert.equal(sesError({ name: "TooManyRequestsException", message: "slow down" }).retryable, true);
  assert.equal(sesError({ name: "InternalFailure", $metadata: { httpStatusCode: 500 } }).retryable, true);
  assert.equal(sesError({ name: "MessageRejected", message: "Email address is not verified", $metadata: { httpStatusCode: 400 } }).retryable, false);
  const timeout = sesError({ name: "TimeoutError", message: "Connection timed out after 15000 ms" });
  assert.equal(timeout.code, "timeout");
  assert.equal(timeout.retryable, false);
});
