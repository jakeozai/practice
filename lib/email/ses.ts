/**
 * Amazon SES transport (EMAIL_TRANSPORT=ses, docs/email/ses-switch.md).
 * Builds the same mail the Resend transport sends: same From, Reply-To,
 * subject, HTML and text bodies, and the same headers (List-Unsubscribe for
 * one-click unsubscribe, CLAUDE.md rule 7).
 *
 * SES has no idempotency key. A day's mail is still sent once: digest_sends
 * (rule 9) records it, and a timeout is not retried here, because SES may
 * have taken the mail before the connection dropped.
 */
import { SESv2Client, SendEmailCommand, type SendEmailCommandInput } from "@aws-sdk/client-sesv2";
import { EmailSendError } from "./errors";
import type { OutgoingEmail } from "./send";
import { SEND_TIMEOUT_MS } from "./constants";

/**
 * "덕잡 <hello@duckjob.app>" → "=?UTF-8?B?642V7J6h?= <hello@duckjob.app>". SES needs a
 * display name outside ASCII in MIME encoded-word form; ASCII-only values pass as they are.
 */
export function encodeFromAddress(from: string): string {
  const m = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (!m) return from.trim();
  const [, name, address] = m;
  if (!name) return `<${address}>`;
  const ascii = /^[\x20-\x7e]*$/.test(name);
  return ascii ? `${name} <${address}>` : `=?UTF-8?B?${Buffer.from(name, "utf8").toString("base64")}?= <${address}>`;
}

/** SES tag values allow letters, digits, _ and - only. */
const tagValue = (v: string) => v.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 256);

export function sesRequest(mail: OutgoingEmail, opts: { from: string; replyTo: string | null; configurationSet?: string | null }): SendEmailCommandInput {
  const text = (data: string) => ({ Data: data, Charset: "UTF-8" });
  return {
    FromEmailAddress: encodeFromAddress(opts.from),
    Destination: { ToAddresses: [mail.to] },
    ...(opts.replyTo ? { ReplyToAddresses: [opts.replyTo] } : {}),
    Content: {
      Simple: {
        Subject: text(mail.subject),
        Body: { Html: text(mail.html), Text: text(mail.text) },
        Headers: Object.entries(mail.headers).map(([Name, Value]) => ({ Name, Value })),
      },
    },
    ...(opts.configurationSet ? { ConfigurationSetName: opts.configurationSet } : {}),
    // Lets a bounce or complaint event be traced to the mail it came from.
    EmailTags: [{ Name: "mail", Value: tagValue(mail.idempotencyKey) }],
  };
}

/** SES error names worth one more try later; the SDK already retries throttling and 5xx itself. */
const SES_RETRYABLE = new Set(["TooManyRequestsException", "LimitExceededException", "InternalFailure", "ServiceUnavailable"]);

export function sesError(e: unknown): EmailSendError {
  const err = e as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } };
  const name = err?.name ?? "ses_error";
  if (name === "TimeoutError" || name === "RequestTimeout" || /timed?\s*out/i.test(err?.message ?? "")) {
    // SES may have accepted the mail; no retry, so nobody gets it twice.
    return new EmailSendError(err?.message ?? "SES request timed out", "timeout", false);
  }
  const status = err?.$metadata?.httpStatusCode ?? 0;
  return new EmailSendError(err?.message ?? String(e), name, SES_RETRYABLE.has(name) || status >= 500);
}

let client: SESv2Client | null = null;

export async function sendViaSes(
  mail: OutgoingEmail,
  opts: { from: string; replyTo: string | null; region: string; accessKeyId: string; secretAccessKey: string; configurationSet?: string | null },
): Promise<{ id: string }> {
  client ??= new SESv2Client({
    region: opts.region,
    // Explicit keys: never the runtime's own AWS credentials.
    credentials: { accessKeyId: opts.accessKeyId, secretAccessKey: opts.secretAccessKey },
    maxAttempts: 3,
    requestHandler: { requestTimeout: SEND_TIMEOUT_MS, connectionTimeout: 5_000 },
  });
  try {
    const out = await client.send(new SendEmailCommand(sesRequest(mail, opts)));
    if (!out.MessageId) throw new EmailSendError("SES returned no message id", "no_message_id", false);
    return { id: out.MessageId };
  } catch (e) {
    throw e instanceof EmailSendError ? e : sesError(e);
  }
}
