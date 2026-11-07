/**
 * Thin wrapper around Resend with timeout, retry and an idempotency key.
 *
 * EMAIL_TRANSPORT=file writes the rendered mail to .outbox/ instead of
 * sending, for local checks without a Resend account.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Resend } from "resend";
import { emailEnv } from "../env";
import { SEND_MAX_ATTEMPTS, SEND_TIMEOUT_MS } from "./constants";

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers: Record<string, string>;
  /** Same key + same payload within 24h is delivered once by Resend. */
  idempotencyKey: string;
};

export class EmailSendError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "EmailSendError";
  }
}

/** Resend error names worth retrying; everything else fails immediately. */
const RETRYABLE = new Set(["rate_limit_exceeded", "concurrent_idempotent_requests", "internal_server_error", "application_error"]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new EmailSendError(`Timed out after ${ms} ms`, "timeout", true)), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

let resendClient: Resend | null = null;

async function sendViaResend(mail: OutgoingEmail, from: string, apiKey: string): Promise<{ id: string }> {
  resendClient ??= new Resend(apiKey);
  const { data, error } = await withTimeout(
    resendClient.emails.send(
      { from, to: mail.to, subject: mail.subject, html: mail.html, text: mail.text, headers: mail.headers },
      { idempotencyKey: mail.idempotencyKey },
    ),
    SEND_TIMEOUT_MS,
  );
  if (error) {
    const retryable = RETRYABLE.has(error.name) || (error.statusCode ?? 0) >= 500;
    throw new EmailSendError(error.message, error.name, retryable);
  }
  return { id: data.id };
}

async function writeToOutbox(mail: OutgoingEmail, from: string): Promise<{ id: string }> {
  const dir = join(process.cwd(), ".outbox");
  await mkdir(dir, { recursive: true });
  const base = join(dir, mail.idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, "_"));
  await writeFile(`${base}.html`, mail.html);
  await writeFile(
    `${base}.json`,
    JSON.stringify({ from, to: mail.to, subject: mail.subject, headers: mail.headers, text: mail.text }, null, 2),
  );
  return { id: `file:${mail.idempotencyKey}` };
}

export async function sendEmail(mail: OutgoingEmail): Promise<{ id: string }> {
  const env = emailEnv();
  if (env.EMAIL_TRANSPORT === "file") return writeToOutbox(mail, env.EMAIL_FROM);

  let lastError: unknown;
  for (let attempt = 1; attempt <= SEND_MAX_ATTEMPTS; attempt++) {
    try {
      return await sendViaResend(mail, env.EMAIL_FROM, env.RESEND_API_KEY!);
    } catch (e) {
      lastError = e;
      const retryable = e instanceof EmailSendError ? e.retryable : true; // network errors
      if (!retryable || attempt === SEND_MAX_ATTEMPTS) break;
      await sleep(1000 * 2 ** (attempt - 1));
    }
  }
  if (lastError instanceof EmailSendError) throw lastError;
  throw new EmailSendError(String(lastError), "network_error", true);
}

/** RFC 8058 one-click unsubscribe headers (CLAUDE.md rule 7). */
export function unsubscribeHeaders(unsubscribeUrl: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
