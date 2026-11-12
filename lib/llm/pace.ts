/**
 * Spaces out LLM calls to stay under the AI Gateway rate limit. The Vercel free
 * tier allows 5 requests per minute per model for the whole team (2026-11-12),
 * so processing runs often and slowly instead of in one burst.
 */
import type { MessagesClient } from "./extractJob";

/** (제안값) Free-tier limit. Raise LLM_REQUESTS_PER_MINUTE after topping up Gateway credits. */
export const DEFAULT_LLM_RPM = 5;
/** Slack per slot so clock skew between us and the gateway doesn't trip the limit. */
const SLOT_MARGIN_MS = 500;

export function llmRequestsPerMinute(env: string | undefined = process.env.LLM_REQUESTS_PER_MINUTE): number {
  const n = Number(env);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_LLM_RPM;
}

export type Pacer = {
  /** When the next call may start (epoch ms). */
  nextSlotAt(): number;
  /** Waits for a slot and claims it. */
  take(): Promise<void>;
};

export function createPacer(rpm: number, now: () => number = Date.now, sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))): Pacer {
  const interval = Math.ceil(60_000 / rpm) + SLOT_MARGIN_MS;
  let next = 0;
  return {
    nextSlotAt: () => Math.max(now(), next),
    async take() {
      const slot = Math.max(now(), next);
      next = slot + interval;
      const wait = slot - now();
      if (wait > 0) await sleep(wait);
    },
  };
}

/** Same client, but every request waits for a pacer slot first (retries included). */
export function pacedClient(client: MessagesClient, pacer: Pacer): MessagesClient {
  return {
    messages: {
      create: async (params) => {
        await pacer.take();
        return client.messages.create(params);
      },
    },
  };
}
