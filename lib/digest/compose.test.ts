import { test } from "node:test";
import assert from "node:assert/strict";
import { composeDigestEmail, digestCard, type DigestJob } from "./compose";
import { verifyLink } from "../links";

const SECRET = "test-secret-test-secret-test-secret-0123";
const UID = "4f8c2a5e-1b3d-4c6e-8f9a-0b1c2d3e4f50";
const JOB_ID = "9a8b7c6d-5e4f-4a3b-8c1d-0e9f8a7b6c5d";

const job: DigestJob = {
  id: JOB_ID,
  company: "Example AI",
  title: "Korean AI Trainer",
  title_ko: "한국어 AI 답변 평가",
  summary_ko: ["한국어 AI 답변을 평가하는 일", "전 세계 원격 지원 가능", "시간당 30~35달러"],
  status: "open",
  category: "language",
  languages: ["ko", "en"],
  english_level: "reading",
  engagement: "freelance",
  url: "https://example.com/jobs/1",
  pay_min: 30,
  pay_max: 35,
  pay_currency: "USD",
  pay_unit: "hour",
  hours_per_week_min: 15,
};

const input = {
  recipient: { user_id: UID, email: "a@example.com" },
  jobs: [job],
  sendDate: "2026-11-08",
  appUrl: "https://aijob5.example",
  linkSecret: SECRET,
};

test("subject, card content and unsubscribe headers", async () => {
  const mail = await composeDigestEmail(input);
  assert.equal(mail.to, "a@example.com");
  assert.equal(mail.subject, "오늘의 일감 1개 · 11월 8일");
  assert.equal(mail.idempotencyKey, `digest-${UID}-2026-11-08`);
  assert.match(mail.headers["List-Unsubscribe"], /^<https:\/\/aijob5\.example\/api\/email\/unsubscribe\?t=[\w-]+\.[\w-]+>$/);
  assert.equal(mail.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  for (const part of [
    "11월 8일 일요일",
    "실제 프로젝트",
    "언어 작업",
    "한국어 AI 답변 평가",
    "Example AI · Korean AI Trainer",
    "시간당 $30~35",
    "주 15시간부터",
    "한국어, 영어",
    "읽기 수준",
    "프리랜서",
    "공고 보러 가기",
    "메일 그만 받기",
    "프로필 수정",
    "개인정보 처리방침",
  ]) {
    assert.ok(mail.html.includes(part), `html has ${part}`);
  }
  assert.ok(mail.text.includes("한국어 AI 답변을 평가하는 일"));
  assert.ok(mail.text.includes("a@example.com님이 덕잡 일일 메일을 구독해서"), "footer says why the mail came");
});

test("detail link is a signed click token for this user and job", async () => {
  const mail = await composeDigestEmail(input);
  const m = /https:\/\/aijob5\.example\/r\/([\w-]+\.[\w-]+)/.exec(mail.html);
  assert.ok(m);
  const r = verifyLink(m[1], "click", SECRET, new Date("2026-11-08T00:00:00Z"));
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.payload.uid, UID);
    assert.equal(r.payload.jobId, JOB_ID);
  }
});

test("same input renders the same payload (safe idempotent rerun)", async () => {
  const first = await composeDigestEmail(input);
  const second = await composeDigestEmail(input);
  assert.equal(first.html, second.html);
  assert.deepEqual(first.headers, second.headers);
});

test("card falls back to the original title when there is no Korean one", () => {
  const card = digestCard({ ...job, title_ko: null, category: "other" }, "https://x/r/t");
  assert.equal(card.headline, "Korean AI Trainer");
  assert.equal(card.originalTitle, null);
  assert.equal(card.category, null);
});

test("top line: the day's numbers when they make sense, else the plain intro", async () => {
  const withStats = await composeDigestEmail({ ...input, stats: { newPostings: 120, koreaJobs: 9 } });
  assert.ok(withStats.text.includes("지난 하루 새로 올라온 공고 120개 중 한국에서 할 수 있는 단기 일감 9개, 그중 1개를 골랐어요."));
  const plain = await composeDigestEmail(input);
  assert.ok(plain.text.includes("한국에서 할 수 있는 것만 골라"));
});
