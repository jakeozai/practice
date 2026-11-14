import { test } from "node:test";
import assert from "node:assert/strict";
import { ProfileSchema } from "../profile/parse";
import { buildSignals, type FitJob } from "./fit";
import { rankStretch, stretchKindOf, stretchPool } from "./stretch";

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

test("pool keeps at most two of a kind so the mail can offer two different tries", () => {
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
  assert.equal(pool.filter((r) => r.kind === "logo_graphics").length, 2);
  assert.equal(pool.length, 4);
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
