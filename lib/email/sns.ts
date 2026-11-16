/**
 * Amazon SNS messages carrying SES bounce and complaint events
 * (/api/webhooks/ses, docs/email/ses-switch.md). Every message is checked
 * against Amazon's signature before anything is trusted:
 * https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html
 */
import { createVerify } from "node:crypto";
import type { DeliveryAction } from "./webhook";

export type SnsMessage = {
  Type: string;
  MessageId: string;
  TopicArn: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertURL: string;
  Subject?: string;
  SubscribeURL?: string;
  Token?: string;
};

export function parseSnsMessage(body: string): SnsMessage | null {
  try {
    const m = JSON.parse(body) as Partial<SnsMessage>;
    const required = ["Type", "MessageId", "TopicArn", "Message", "Timestamp", "SignatureVersion", "Signature", "SigningCertURL"] as const;
    return required.every((k) => typeof m[k] === "string") ? (m as SnsMessage) : null;
  } catch {
    return null;
  }
}

/** The exact text Amazon signed: fixed keys in a fixed order, each "key\nvalue\n". */
export function snsStringToSign(m: SnsMessage): string {
  const keys =
    m.Type === "Notification"
      ? ["Message", "MessageId", ...(m.Subject !== undefined ? ["Subject"] : []), "Timestamp", "TopicArn", "Type"]
      : ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"];
  return keys.map((k) => `${k}\n${(m as Record<string, string | undefined>)[k] ?? ""}\n`).join("");
}

/** Only Amazon's own certificate host, over https. */
export function isTrustedCertUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && /^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/.test(u.hostname) && u.pathname.endsWith(".pem");
  } catch {
    return false;
  }
}

const certCache = new Map<string, string>();

async function fetchCert(url: string): Promise<string> {
  const hit = certCache.get(url);
  if (hit) return hit;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`certificate ${res.status}`);
  const pem = await res.text();
  certCache.set(url, pem);
  return pem;
}

/** True only for a message signed by Amazon SNS (SignatureVersion 1 = SHA1, 2 = SHA256). */
export async function verifySnsMessage(m: SnsMessage, getCert: (url: string) => Promise<string> = fetchCert): Promise<boolean> {
  if (!isTrustedCertUrl(m.SigningCertURL)) return false;
  const algorithm = m.SignatureVersion === "1" ? "RSA-SHA1" : m.SignatureVersion === "2" ? "RSA-SHA256" : null;
  if (!algorithm) return false;
  try {
    const cert = await getCert(m.SigningCertURL);
    return createVerify(algorithm).update(snsStringToSign(m), "utf8").verify(cert, m.Signature, "base64");
  } catch {
    return false;
  }
}

type SesEvent = {
  eventType?: string;
  notificationType?: string;
  bounce?: { bounceType?: string; bouncedRecipients?: { emailAddress?: string }[] };
  complaint?: { complainedRecipients?: { emailAddress?: string }[] };
};

/**
 * The same outcome as a Resend event (lib/email/webhook.ts deliveryAction): a
 * permanent bounce stops the mail, a spam complaint unsubscribes. SES sends
 * `eventType` from a configuration set and `notificationType` from identity
 * notifications; both are read.
 */
export function sesDeliveryAction(message: string): DeliveryAction {
  let e: SesEvent;
  try {
    e = JSON.parse(message) as SesEvent;
  } catch {
    return null;
  }
  const type = e.eventType ?? e.notificationType;
  const clean = (list: { emailAddress?: string }[] | undefined) =>
    (list ?? []).map((r) => r.emailAddress?.trim().toLowerCase() ?? "").filter(Boolean);
  if (type === "Complaint") {
    const emails = clean(e.complaint?.complainedRecipients);
    return emails.length ? { status: "unsubscribed", emails } : null;
  }
  // Transient bounces (mailbox full, greylisting…) are retried by the next day's mail.
  if (type === "Bounce" && e.bounce?.bounceType === "Permanent") {
    const emails = clean(e.bounce.bouncedRecipients);
    return emails.length ? { status: "bounced", emails } : null;
  }
  return null;
}
