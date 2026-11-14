import { test } from "node:test";
import assert from "node:assert/strict";
import { ProfileSchema } from "../profile/parse";
import { buildSignals, rankForProfile } from "./fit";
import { choosePicks, parsePick, pickMessage, ruleSubject, type PickJob } from "./pick";
import type { MessagesClient } from "../llm/extractJob";

const NOW = new Date("2026-11-15T00:00:00Z");
const profile = ProfileSchema.parse({
  languages: [
    { code: "ko", level: "native" },
    { code: "en", level: "conversational" },
  ],
  fields: ["영상 편집·후반작업", "웹 앱 개발"],
  skills: ["Adobe Premiere Pro", "Next.js"],
  weekly_hours: 10,
  avoid: ["단순 반복 작업"],
  notes_ko: "썸네일 제작 우선 추천",
});

function job(id: string, title: string, extra: Partial<PickJob> = {}): PickJob {
  return {
    id,
    company: "Client",
    title,
    title_ko: null,
    summary_ko: [],
    category: "video",
    languages: ["en"],
    english_level: "reading",
    requires_credential: false,
    hours_per_week_min: null,
    pay_min: 100,
    pay_max: 300,
    pay_currency: "USD",
    pay_unit: "project",
    status: "open",
    first_seen_at: "2026-11-14T12:00:00Z",
    url: `https://www.freelancer.com/projects/${id}`,
    ...extra,
  };
}

const jobs = [
  job("a", "Edit YouTube Shorts", { summary_ko: ["쇼츠 편집 <b>지금</b>"] }),
  job("b", "Wedding video edit"),
  job("c", "Thumbnail design for YouTube channel", { category: "design" }),
  job("d", "Next.js bug fix", { category: "dev" }),
  job("e", "Data entry from PDFs", { category: "other" }),
];
const ranked = rankForProfile(jobs, buildSignals(profile), NOW);

function fakeClient(answer: string | Error): MessagesClient & { calls: number } {
  const c = {
    calls: 0,
    messages: {
      create: async () => {
        c.calls++;
        if (answer instanceof Error) throw answer;
        return { content: [{ type: "text", text: answer }] };
      },
    },
  };
  return c;
}

test("candidates exclude what doesn't fit and the message carries only validated data", () => {
  assert.ok(!ranked.some((r) => r.job.id === "e"), "data entry is on the avoid list");
  const msg = pickMessage(profile, ranked, NOW);
  assert.match(msg, /<profile>[\s\S]*"fields"[\s\S]*<\/profile>/);
  assert.match(msg, /\[c1\]/);
  assert.match(msg, /올라온 지: 12시간 전/);
  assert.match(msg, /견적 입찰\(경쟁\)/);
  assert.doesNotMatch(msg.split("<candidates>")[1], /<b>/, "no tags from posting data");
});

test("parsePick keeps valid, unique ids in order and trims long text", () => {
  const text = JSON.stringify({
    picks: [
      { id: "c2", reason_ko: "이유", today_ko: "오늘" },
      { id: "c2", reason_ko: "중복", today_ko: "중복" },
      { id: "c9", reason_ko: "없는 후보", today_ko: "x" },
      { id: "c1", reason_ko: "가".repeat(200), today_ko: "오늘 저녁 30분" },
    ],
    subject_ko: "영상 편집 일감 3개",
  });
  const p = parsePick(text, 4, 3)!;
  assert.deepEqual(
    p.picks.map((x) => x.index),
    [1, 0],
  );
  assert.ok(p.picks[1].reason.length <= 90);
  assert.equal(p.subject, "영상 편집 일감 3개");
  assert.equal(parsePick("not json", 4, 3), null);
  assert.equal(parsePick(JSON.stringify({ picks: [], subject_ko: "x" }), 4, 3), null);
});

test("model picks come first; missing ones are filled from the rule order", async () => {
  const client = fakeClient(
    JSON.stringify({ picks: [{ id: "c3", reason_ko: "썸네일 추천과 맞아요", today_ko: "오늘 시안 1개" }], subject_ko: "영상 편집 실력으로 할 일감" }),
  );
  const r = await choosePicks(ranked, profile, { size: 3, now: NOW, client, model: "m" });
  assert.equal(r.method, "llm");
  assert.equal(r.jobIds.length, 3);
  assert.ok(r.jobIds.includes(ranked[2].job.id));
  assert.equal(r.notes[ranked[2].job.id].reason, "썸네일 추천과 맞아요");
  assert.match(r.notes[ranked[0].job.id].reason, /AI 분석의/); // rule-written fill
  assert.equal(r.subject, "영상 편집 실력으로 할 일감");
});

test("model failure or no model: rule picks, rule notes, rule subject", async () => {
  const down = fakeClient(Object.assign(new Error("rate limited"), { status: 429 }));
  const r = await choosePicks(ranked, profile, { size: 3, now: NOW, client: down, model: "m" });
  assert.equal(down.calls, 1, "a service failure isn't retried");
  assert.equal(r.method, "rules");
  assert.deepEqual(
    r.jobIds,
    ranked.slice(0, 3).map((x) => x.job.id),
  );
  assert.equal(r.subject, ruleSubject(profile, 3));
  assert.equal(r.subject, "영상 편집에 맞춘 오늘의 일감 3개");

  const none = await choosePicks([], profile, { size: 3, now: NOW });
  assert.deepEqual(none.jobIds, []);
});

test("final order is the rule order even when the model lists a weaker fit first", async () => {
  const client = fakeClient(
    JSON.stringify({
      picks: [
        { id: "c3", reason_ko: "세 번째", today_ko: "오늘" },
        { id: "c1", reason_ko: "첫 번째", today_ko: "오늘" },
      ],
      subject_ko: "제목",
    }),
  );
  const r = await choosePicks(ranked, profile, { size: 2, now: NOW, client, model: "m" });
  assert.deepEqual(r.jobIds, [ranked[0].job.id, ranked[2].job.id]);
});
