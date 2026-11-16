import { test } from "node:test";
import assert from "node:assert/strict";
import { ProfileSchema } from "../profile/parse";
import { buildSignals, type FitJob } from "./fit";
import { kindAffinity, rankStretch, stretchKindOf, stretchPool } from "./stretch";

const NOW = new Date("2026-11-15T00:00:00Z");
const sig = buildSignals(
  ProfileSchema.parse({
    languages: [
      { code: "ko", level: "native" },
      { code: "en", level: "conversational" },
    ],
    fields: ["영상 편집·후반작업", "웹 앱 개발(바이브코딩)"],
    skills: ["Adobe Premiere Pro", "Next.js"],
    weekly_hours: 10,
    min_hourly_usd: 10,
    avoid: ["단순 반복 작업"],
    notes_ko: "썸네일 제작 우선 추천",
  }),
);

let n = 0;
function job(partial: Partial<FitJob> & Pick<FitJob, "title">): FitJob {
  n++;
  return {
    id: `s${n}`,
    title_ko: null,
    summary_ko: [],
    category: "design",
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
    url: `https://www.freelancer.com/projects/x/${n}`,
    ...partial,
  };
}

test("only kinds AI can deliver, without their look-alikes", () => {
  assert.equal(stretchKindOf(job({ title: "Clean modern logo for apparel" }))?.id, "logo_graphics");
  assert.equal(stretchKindOf(job({ title: "Hotel room interior design", summary_ko: ["객실 리모델링"] })), null);
  assert.equal(stretchKindOf(job({ title: "Bull head 3D model for casting", category: "motion_3d" }))?.id, "three_d");
  assert.equal(stretchKindOf(job({ title: "Mechanical part 3D CAD modeling", category: "motion_3d" })), null);
  assert.equal(stretchKindOf(job({ title: "AI email support bot", category: "dev" }))?.id, "web_bot");
  assert.equal(stretchKindOf(job({ title: "Google Ads and SEO for an online store", category: "dev" })), null);
  assert.equal(stretchKindOf(job({ title: "Cold caller for a film directory", category: "dev" })), null);
  assert.equal(stretchKindOf(job({ title: "Japanese translation", category: "language" })), null);
});

test("personal limits still apply; closer to the profile and fresher ranks higher", () => {
  const social = job({ title: "Social media post design for a cafe", summary_ko: ["인스타그램 이미지 게시물 10개"] });
  const logo = job({ title: "Small business logo", first_seen_at: "2026-11-01T00:00:00Z" });
  const german = job({ title: "German poster design", languages: ["de"] });
  const licensed = job({ title: "Certified engineer 3D model", category: "motion_3d", requires_credential: true });
  const tiny = job({ title: "Logo for my shop", pay_max: 20 });
  const ranked = rankStretch([logo, german, licensed, tiny, social], sig, NOW);
  assert.deepEqual(
    ranked.map((r) => r.job.id),
    [social.id, logo.id, tiny.id],
  );
  assert.ok(ranked[0].score > ranked[1].score);
  assert.equal(rankStretch([social], sig, NOW, new Set([social.id])).length, 0, "jobs already offered as fits are left out");
});

test("pool offers one of each kind, a second of a kind only when kinds run short", () => {
  const ranked = rankStretch(
    [
      job({ title: "Logo A" }),
      job({ title: "Logo B" }),
      job({ title: "Logo C" }),
      job({ title: "Landing page for a bakery", category: "dev" }),
      job({ title: "Low poly character 3D model", category: "motion_3d" }),
    ],
    sig,
    NOW,
  );
  const pool = stretchPool(ranked, 4);
  assert.deepEqual(pool.map((r) => r.kind).sort(), ["logo_graphics", "three_d", "web_bot"]);
  const logosOnly = stretchPool(ranked.filter((r) => r.kind === "logo_graphics"), 4);
  assert.equal(logosOnly.length, 2, "one kind only: two of it");
});

test("enterprise systems, support roles and writing aren't AI stretches; small deliverables rank above big builds", () => {
  assert.equal(stretchKindOf(job({ title: "Infor CSD–PIM Data Integration", category: "dev", summary_ko: ["Infor PIM 데이터 연동"] })), null);
  assert.equal(stretchKindOf(job({ title: "Email/chat support assistant", category: "dev", summary_ko: ["고객 응대 챗봇 운영 보조"] })), null);
  assert.equal(stretchKindOf(job({ title: "Engaging social media content writing", category: "writing", summary_ko: ["소셜 미디어 게시물 글 작성"] })), null);
  assert.equal(stretchKindOf(job({ title: "AI-generated blog images and captions", category: "writing" }))?.id, "ai_content");

  const logo = job({ title: "Small business logo design" });
  const app = job({ title: "E-commerce mobile app development", category: "dev" });
  const [first, second] = rankStretch([app, logo], sig, NOW);
  assert.equal(first.job.id, logo.id);
  assert.ok(first.score - second.score >= 2);
});

test("people's time isn't an AI stretch, whatever the title says; the pool covers each kind first", () => {
  assert.equal(
    stretchKindOf(job({ title: "Email & Chat Support Assistants", category: "dev", url: "https://www.freelancer.com/projects/customer-service/Email-Chat-Support" })),
    null,
  );
  assert.equal(stretchKindOf(job({ title: "Live chat support agent for a SaaS", category: "dev" })), null);
  assert.equal(stretchKindOf(job({ title: "AI email support bot development", category: "dev", url: "https://www.freelancer.com/projects/python/AI-Email-Bot" }))?.id, "web_bot");

  const ranked = rankStretch(
    [
      job({ title: "Logo A", pay_max: 900 }),
      job({ title: "Logo B", pay_max: 900 }),
      job({ title: "Logo C", pay_max: 900 }),
      job({ title: "Low poly character 3D model", category: "motion_3d" }),
      job({ title: "Landing page for a bakery", category: "dev" }),
    ],
    sig,
    NOW,
  );
  const pool = stretchPool(ranked, 3);
  assert.deepEqual(new Set(pool.map((r) => r.kind)), new Set(["logo_graphics", "three_d", "web_bot"]));
});

test("the two tries follow the person: same jobs, different first choice by profile", () => {
  const person = (fields: string[], skills: string[] = []) =>
    buildSignals(ProfileSchema.parse({ languages: [{ code: "ko", level: "native" }, { code: "en", level: "conversational" }], fields, skills, avoid: [] }));
  const translator = person(["영→한 번역(게임·IT)"]);
  const marketer = person(["SNS 마케팅·광고 운영"]);
  const coder = person(["업무 자동화"], ["Python"]);
  const logo = job({ title: "Logo for a bakery" });
  const bot = job({ title: "Chatbot for a website", category: "dev" });
  const aiVideo = job({ title: "AI generated video ads", category: "video" });
  const first = (sig: ReturnType<typeof person>) => rankStretch([logo, bot, aiVideo], sig, NOW)[0].kind;
  assert.equal(first(translator), "ai_content");
  assert.equal(first(marketer), "logo_graphics");
  assert.equal(first(coder), "web_bot");
  assert.equal(kindAffinity("three_d", translator), 0, "no closeness is invented");
});

test("a try names the profile only when it shares a concept with it", () => {
  const nurse = buildSignals(
    ProfileSchema.parse({ languages: [{ code: "ko", level: "native" }, { code: "en", level: "conversational" }], fields: ["병동 간호 7년(의료·보건)"], avoid: [] }),
  );
  const clinic = job({ title: "Website for a small clinic", category: "dev", summary_ko: ["병원 웹사이트 제작"] });
  const logo = job({ title: "Logo for a bakery" });
  const [a, b] = [clinic, logo].map((j) => rankStretch([j], nurse, NOW)[0]);
  assert.ok(a.link, "clinic site links to nursing");
  assert.equal(b.link, undefined);
});

test("a role is not a try, and a summary word doesn't change what the job is", () => {
  assert.equal(stretchKindOf(job({ title: "AI Engineer (contract)", category: "dev", summary_ko: ["생성형 AI 챗봇 구축"] })), null);
  assert.equal(stretchKindOf(job({ title: "GTM Engineer", category: "other", summary_ko: ["생성형 검색 콘텐츠"] })), null);
  const podcast = job({ title: "Podcast video editor", category: "video", summary_ko: ["유튜브 썸네일과 배너도 함께"] });
  assert.equal(stretchKindOf(podcast), null, "video work isn't a graphics try because the summary mentions a banner");
  assert.equal(stretchKindOf(job({ title: "Logo for a bakery" }))?.id, "logo_graphics");
});
