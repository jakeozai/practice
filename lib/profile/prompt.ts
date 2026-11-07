import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife } from "next/cache";

/** prompts/profile-extract.md as a string. Markers must match parse.ts (see prompt.test.ts). */
export async function getProfilePrompt(): Promise<string> {
  "use cache";
  cacheLife("max");
  return readFile(path.join(process.cwd(), "prompts", "profile-extract.md"), "utf8");
}
