import { test } from "node:test";
import assert from "node:assert/strict";
import { decideKoreaEligible, koreaEligibleFromLocation } from "./eligibility";
import { decideStatus } from "./status";
import { isScamRejected, scamScore } from "./scam";
import { matchesJobKeywords } from "./jobs/keywords";

test("korea eligibility from location text (real examples from the supply check)", () => {
  const cases: [string | null, boolean | null][] = [
    ["Seoul / KR / remote", true],
    ["South Korea", true],
    ["World Wide - Remote", true],
    ["South Korea / Remote - Europe / Remote, Worldwide", true],
    ["Remote, Worldwide", true],
    ["APAC", true],
    ["United States", false],
    ["Remote - US", false],
    ["Tokyo, Japan / Barcelona, Spain", false],
    ["New York City, New York, United States", false],
    ["Remote, International", null], // xAI: body restricts to US/UK/CA/AU → LLM decides
    ["Remote", null],
    [null, null],
    // OpenTrain-style applicant country lists
    ["Afghanistan / North Korea / South Korea / Zambia / Remote", true],
    ["Japan / North Korea / Remote", false],
    ["Korea, Republic of / Remote", true],
    ["Korea, Democratic People's Republic of", null],
    // ISO code lists (Mercor, OneForma)
    ["GBR / Remote", false],
    ["ZAF / Remote", false],
    ["MEX / CRI / SLV / GTM / Remote", false],
    ["KOR / Remote", true],
    ["CN / MX / NO / KR / GB / US", true],
    ["Remote", null],
  ];
  for (const [loc, expected] of cases) assert.equal(koreaEligibleFromLocation(loc), expected, String(loc));
});

test("rule beats LLM; LLM fills the gap; otherwise unknown", () => {
  assert.equal(decideKoreaEligible("United States", true), false);
  assert.equal(decideKoreaEligible("Remote, International", false), false);
  assert.equal(decideKoreaEligible("Remote", true), true);
  assert.equal(decideKoreaEligible("Remote", null), null);
});

test("status: talent pool or reposted 3+ times → pool", () => {
  assert.equal(decideStatus({ isTalentPool: false, sameTitleCount: 1 }), "open");
  assert.equal(decideStatus({ isTalentPool: false, sameTitleCount: 3 }), "pool");
  assert.equal(decideStatus({ isTalentPool: true, sameTitleCount: 1 }), "pool");
});

test("scam score: 25 per distinct signal, reject at 60", () => {
  assert.equal(scamScore([]), 0);
  assert.equal(scamScore(["upfront_payment", "upfront_payment"]), 25);
  assert.equal(scamScore(["upfront_payment", "messenger_only", "personal_account"]), 75);
  assert.equal(isScamRejected(50), false);
  assert.equal(isScamRejected(75), true);
});

test("keyword filter looks at title and body", () => {
  assert.equal(matchesJobKeywords("Korean Speaker - Freelance Project", ""), true);
  assert.equal(matchesJobKeywords("Specialist", "You will do data ANNOTATION tasks"), true);
  assert.equal(matchesJobKeywords("Account Manager", "Manage enterprise accounts."), false);
});

test("work language, not posting language, decides feasibility", async () => {
  const { languagesFeasible, missingLanguages, languageNameKo } = await import("./jobs/language");
  assert.equal(languagesFeasible([]), true, "language-neutral work");
  assert.equal(languagesFeasible(["en"]), true, "English work is fine for everyone");
  assert.equal(languagesFeasible(["ko", "en"]), true);
  assert.deepEqual(missingLanguages(["en", "lt"]), ["lt"]);
  assert.equal(languagesFeasible(["ja", "ko"], ["ko", "en", "ja"]), true, "Phase 2: profile languages count");
  assert.equal(languageNameKo("ja"), "일본어");
  assert.equal(languageNameKo("lt"), "LT");
});
