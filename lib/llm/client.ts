/**
 * Thin Anthropic wrapper. Model IDs come only from env (CLAUDE.md stack note).
 * The SDK retries 429/5xx itself (maxRetries); `timeout` bounds each attempt.
 *
 * Two ways to reach the model:
 * - Vercel AI Gateway (default on Vercel): no provider key. Auth is the
 *   deployment's OIDC token (or AI_GATEWAY_API_KEY elsewhere) and usage is
 *   billed to the Vercel account. Model IDs look like "anthropic/claude-…".
 * - Anthropic API directly when ANTHROPIC_API_KEY is set. Model IDs look like "claude-…".
 */
import Anthropic from "@anthropic-ai/sdk";
import { getVercelOidcToken } from "@vercel/oidc";

export const LLM_TIMEOUT_MS = 60_000;
export const LLM_SDK_RETRIES = 2;
export const AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh";

export type LlmConfig = { model: string; apiKey: string; baseURL?: string; via: "anthropic" | "gateway" };

async function gatewayToken(): Promise<string | null> {
  if (process.env.AI_GATEWAY_API_KEY) return process.env.AI_GATEWAY_API_KEY;
  try {
    return (await getVercelOidcToken()) || null;
  } catch {
    return process.env.VERCEL_OIDC_TOKEN || null;
  }
}

/** null when no model or no credential is configured (processing then runs without LLM). */
export async function fastModelConfig(): Promise<LlmConfig | null> {
  const model = process.env.ANTHROPIC_MODEL_FAST?.trim();
  if (!model) return null;
  if (process.env.ANTHROPIC_API_KEY) return { model, apiKey: process.env.ANTHROPIC_API_KEY, via: "anthropic" };
  const token = await gatewayToken();
  return token ? { model, apiKey: token, baseURL: AI_GATEWAY_BASE_URL, via: "gateway" } : null;
}

export function createAnthropic(config: Pick<LlmConfig, "apiKey" | "baseURL">): Anthropic {
  return new Anthropic({ apiKey: config.apiKey, baseURL: config.baseURL, timeout: LLM_TIMEOUT_MS, maxRetries: LLM_SDK_RETRIES });
}

/** First text block of a Messages API response. */
export function firstText(message: { content: Array<{ type: string; text?: string }> }): string {
  return message.content.find((b) => b.type === "text")?.text ?? "";
}
