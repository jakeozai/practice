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
  requires_credential: false,
  first_seen_at: "2026-11-12T10:00:00Z",
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

test("feedback link opens the confirmation page with a feedback token for this job", async () => {
  const mail = await composeDigestEmail(input);
  const m = /https:\/\/aijob5\.example\/feedback\?t=([\w-]+\.[\w-]+)/.exec(mail.html);
  assert.ok(m, "feedback link present");
  const r = verifyLink(m[1], "feedback", SECRET, new Date("2026-11-08T00:00:00Z"));
  assert.equal(r.ok && r.payload.jobId, JOB_ID);
  assert.match(mail.html, /관심 없어요·신고/);
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

test("personal picks: reason, today's first step and own subject", async () => {
  const mail = await composeDigestEmail({
    ...input,
    reasons: new Map([[JOB_ID, "사내방송 편집 실력 그대로 쓰는 일이에요"]]),
    todays: new Map([[JOB_ID, "오늘 저녁 30분: 편집본 링크 붙여 지원"]]),
    subject: "영상 편집 실력으로 오늘 할 일감 1개",
  });
  assert.equal(mail.subject, "영상 편집 실력으로 오늘 할 일감 1개 · 11월 8일");
  for (const part of ["사내방송 편집 실력 그대로 쓰는 일이에요", "오늘 할 일", "오늘 저녁 30분: 편집본 링크 붙여 지원", "내 AI가 분석한 프로필에 딱 맞는"]) {
    assert.ok(mail.html.includes(part), `html has ${part}`);
  }
});

test("AI stretches get their own section and chip", async () => {
  const stretchJob = { ...job, id: "1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d", title: "Logo for a cafe", title_ko: "카페 로고 디자인" };
  const mail = await composeDigestEmail({
    ...input,
    jobs: [job, stretchJob],
    reasons: new Map([
      [JOB_ID, "맞는 이유"],
      [stretchJob.id, "Ideogram 시안으로 해볼 만해요"],
    ]),
    stretchIds: new Set([stretchJob.id]),
  });
  for (const part of ["AI로 도전해 볼 일감 1개", "AI로 도전", "카페 로고 디자인", "딱 맞는 일감 1개와 AI로 도전해 볼 1개"]) {
    assert.ok(mail.html.includes(part), `html has ${part}`);
  }
});
