import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PROFILE_START, PROFILE_END } from "./parse";
import { aiPrefillLinks } from "./prefill";

const prompt = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../prompts/profile-extract.md"), "utf8");

test("prompt markers match parse.ts constants", () => {
  assert.ok(prompt.includes(PROFILE_START));
  assert.ok(prompt.includes(PROFILE_END));
  assert.ok(prompt.indexOf(PROFILE_START) < prompt.indexOf(PROFILE_END));
});

test("prefill links encode the full prompt", () => {
  const links = aiPrefillLinks(prompt);
  for (const link of links) {
    const q = new URL(link.href).searchParams.get("q");
    assert.equal(q, prompt, link.label);
  }
});
