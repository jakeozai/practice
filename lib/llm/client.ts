/**
 * Thin Anthropic wrapper. Model IDs come only from env (CLAUDE.md stack note).
 * The SDK retries 429/5xx itself (maxRetries); `timeout` bounds each attempt.
 */
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export const LLM_TIMEOUT_MS = 60_000;
export const LLM_SDK_RETRIES = 2;

const LlmEnv = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  ANTHROPIC_MODEL_FAST: z.string().min(1),
});

/** null when the key or model isn't configured (process-postings then runs without LLM). */
export function fastModelConfig(): { apiKey: string; model: string } | null {
  const env = LlmEnv.safeParse(process.env);
  return env.success ? { apiKey: env.data.ANTHROPIC_API_KEY, model: env.data.ANTHROPIC_MODEL_FAST } : null;
}

export function createAnthropic(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, timeout: LLM_TIMEOUT_MS, maxRetries: LLM_SDK_RETRIES });
}

/** First text block of a Messages API response. */
export function firstText(message: { content: Array<{ type: string; text?: string }> }): string {
  return message.content.find((b) => b.type === "text")?.text ?? "";
}
