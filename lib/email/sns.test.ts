import { test } from "node:test";
import assert from "node:assert/strict";
import { createSign, generateKeyPairSync } from "node:crypto";
import { isTrustedCertUrl, parseSnsMessage, sesDeliveryAction, snsStringToSign, verifySnsMessage, type SnsMessage } from "./sns";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
const CERT_URL = "https://sns.ap-northeast-2.amazonaws.com/SimpleNotificationService-abc.pem";

function signed(m: Omit<SnsMessage, "Signature" | "SignatureVersion" | "SigningCertURL">, version: "1" | "2" = "2"): SnsMessage {
  const base = { ...m, SignatureVersion: version, SigningCertURL: CERT_URL, Signature: "" } as SnsMessage;
  const signature = createSign(version === "1" ? "RSA-SHA1" : "RSA-SHA256").update(snsStringToSign(base)).sign(privateKey, "base64");
  return { ...base, Signature: signature };
}

const bounce = JSON.stringify({
  eventType: "Bounce",
  bounce: { bounceType: "Permanent", bouncedRecipients: [{ emailAddress: "Gone@Example.com" }] },
  mail: { destination: ["Gone@Example.com"] },
});

const notification = () =>
  signed({
    Type: "Notification",
    MessageId: "m-1",
    TopicArn: "arn:aws:sns:ap-northeast-2:123456789012:duckjob-ses-events",
    Message: bounce,
    Timestamp: "2026-11-17T21:00:05.000Z",
  });

test("string to sign: fixed keys and order, Subject only when present", () => {
  const n = notification();
  assert.equal(snsStringToSign(n), `Message\n${bounce}\nMessageId\nm-1\nTimestamp\n2026-11-17T21:00:05.000Z\nTopicArn\n${n.TopicArn}\nType\nNotification\n`);
  assert.match(snsStringToSign({ ...n, Subject: "Amazon SES Email Event Notification" }), /MessageId\nm-1\nSubject\nAmazon SES/);
  const confirm = { ...n, Type: "SubscriptionConfirmation", SubscribeURL: "https://sns.ap-northeast-2.amazonaws.com/?Action=ConfirmSubscription", Token: "t" };
  assert.match(snsStringToSign(confirm), /SubscribeURL\nhttps:\/\/sns.+\nTimestamp\n.+\nToken\nt\nTopicArn/);
});

test("only Amazon-signed messages pass; a changed message or a foreign certificate host fails", async () => {
  const cert = async () => publicPem;
  assert.equal(await verifySnsMessage(notification(), cert), true);
  assert.equal(await verifySnsMessage(signed({ ...notification(), Type: "Notification" }, "1"), cert), true);
  assert.equal(await verifySnsMessage({ ...notification(), Message: bounce.replace("Permanent", "Transient") }, cert), false);
  assert.equal(await verifySnsMessage({ ...notification(), SigningCertURL: "https://evil.example.com/cert.pem" }, cert), false);
  assert.equal(await verifySnsMessage({ ...notification(), SignatureVersion: "3" }, cert), false);

  assert.equal(isTrustedCertUrl(CERT_URL), true);
  assert.equal(isTrustedCertUrl("http://sns.ap-northeast-2.amazonaws.com/x.pem"), false);
  assert.equal(isTrustedCertUrl("https://sns.ap-northeast-2.amazonaws.com.evil.com/x.pem"), false);
  assert.equal(parseSnsMessage("not json"), null);
  assert.equal(parseSnsMessage(JSON.stringify({ Type: "Notification" })), null);
  assert.ok(parseSnsMessage(JSON.stringify(notification())));
});

test("SES events: the same outcomes as Resend's", () => {
  assert.deepEqual(sesDeliveryAction(bounce), { status: "bounced", emails: ["gone@example.com"] });
  const transient = JSON.stringify({ eventType: "Bounce", bounce: { bounceType: "Transient", bouncedRecipients: [{ emailAddress: "a@b.c" }] } });
  assert.equal(sesDeliveryAction(transient), null);
  const complaint = JSON.stringify({ notificationType: "Complaint", complaint: { complainedRecipients: [{ emailAddress: "x@y.z" }] } });
  assert.deepEqual(sesDeliveryAction(complaint), { status: "unsubscribed", emails: ["x@y.z"] });
  assert.equal(sesDeliveryAction(JSON.stringify({ eventType: "Delivery" })), null);
  assert.equal(sesDeliveryAction("{"), null);
});
