import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PROFILE_START, PROFILE_END } from "./parse";
import { AI_ASSISTANTS, assistantUrl } from "./prefill";

const prompt = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../prompts/profile-extract.md"), "utf8");

test("prompt markers match parse.ts constants", () => {
  assert.ok(prompt.includes(PROFILE_START));
  assert.ok(prompt.includes(PROFILE_END));
  assert.ok(prompt.indexOf(PROFILE_START) < prompt.indexOf(PROFILE_END));
});

test("prompt asks the AI to analyze without quizzing the user", () => {
  assert.match(prompt, /질문하지 말고 바로 분석/);
});

test("prompt asks for one code block, so the AI shows a copy button", () => {
  assert.match(prompt, /코드 블록 하나/);
});

test("prompt also asks the user's AI for an English resume PDF, without inventing anything", () => {
  assert.match(prompt, /영어 이력서 PDF/);
  assert.match(prompt, /resume_en\.pdf/);
  assert.match(prompt, /절대 만들지 마/);
  // The profile block comes first and stays the only code block, so the copy button grabs it.
  assert.ok(prompt.indexOf("<<END_AIJOB5_PROFILE>>") < prompt.indexOf("[2] 영어 이력서 PDF ("));
  assert.match(prompt, /이력서 쪽에는 코드 블록을 쓰지 마/);
});

test("assistant URLs: prefill carries the whole prompt where supported", () => {
  for (const a of AI_ASSISTANTS) {
    const url = new URL(assistantUrl(a.id, prompt));
    if (a.prefills) assert.equal(url.searchParams.get("q"), prompt, a.label);
    else assert.equal(url.search, "", a.label);
  }
});
