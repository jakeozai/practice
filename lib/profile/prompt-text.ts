import { readFileSync } from "node:fs";
import { join } from "node:path";

let cached: string | null = null;

/**
 * prompts/profile-extract.md for places outside React rendering (the
 * confirmation mail). Routes that call it ship the file via
 * next.config.ts outputFileTracingIncludes.
 */
export function profilePromptText(): string {
  cached ??= readFileSync(join(process.cwd(), "prompts", "profile-extract.md"), "utf8");
  return cached;
}
