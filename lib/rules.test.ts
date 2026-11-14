import { test } from "node:test";
import assert from "node:assert/strict";
import { decideKoreaEligible, koreaEligibleFromLocation, residentsOnlyElsewhere } from "./eligibility";
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
    // Any single named country or a US "City, ST" (2026-11-12 collection)
    ["Qatar", false],
    ["Yangon, Myanmar (Burma)", false],
    ["Southaven, MS; Memphis, TN", false],
    ["Palo Alto, CA", false],
    ["Washington, DC", false],
    ["Hong Kong , Hong Kong / Hong Kong / HK", false],
    ["seoul, Seoul-teukbyeolsi, South Korea / South Korea / KR", true],
    // One country's residents only, or office work (2026-11-14 review queue)
    ["Rome / IT / remote", false],
    ["Belgrade / RS / remote", false],
    ["Reykjavik / Kópavogur / Hafnarfjörður / IS / remote", false],
    ["Mercor HQ, 181 Fremont Street", false],
    ["Hybrid, SanFrancisco", false],
    ["Hybrid, Seoul", true],
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
  assert.equal(matchesJobKeywords("Maintain the database", "He said so."), false, "'ai' inside words doesn't count");
  assert.equal(matchesJobKeywords("AI 영상 편집 프리랜서", ""), true);
  assert.equal(matchesJobKeywords("데이터 라벨링 재택 알바", ""), true);
  assert.equal(matchesJobKeywords("Video editor", "Create clips with generative tools."), true);
  // Scope C: creative and freelance work without any AI word
  assert.equal(matchesJobKeywords("2D Animator", ""), true);
  assert.equal(matchesJobKeywords("Photographer Specialist - Freelance Project", ""), true);
  assert.equal(matchesJobKeywords("Senior Photoshop Retoucher", ""), true);
});

test("work language is display-only", async () => {
  const { languageNameKo } = await import("./jobs/language");
  assert.equal(languageNameKo("ja"), "일본어");
  assert.equal(languageNameKo("lt"), "LT");
});

test("residents of another country only: summary or title says so", () => {
  for (const lines of [
    ["시간당 40-50달러의 보수를 지급하며, 미국 거주자만 지원 가능합니다."],
    ["시간당 20달러, 미국 거주자 대상 프리랜서 계약직"],
    ["캐나다 거주자를 대상으로 프랑스어 AI 데이터 관련 유연한 원격 프로젝트 참여자를 모집합니다."],
    ["프랑스, 스페인, 모로코 등 특정 국가 거주자만 지원 가능하며, 원격 근무입니다."],
    ["English Language Specialist (US Only) - Freelance AI Trainer"],
    ["Video editor, UK residents only"],
  ]) {
    assert.equal(residentsOnlyElsewhere(lines), true, lines[0]);
  }
  for (const lines of [
    ["한국 거주자만 지원 가능"],
    ["전 세계 거주자 대상 원격 일감"],
    ["원어민 수준의 한국어 필요", "시간당 30달러"],
    ["North Korea excluded; worldwide remote"],
    ["유튜브 쇼츠 편집 10개"],
  ]) {
    assert.equal(residentsOnlyElsewhere(lines), false, lines[0]);
  }
});
