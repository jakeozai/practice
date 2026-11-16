import { test } from "node:test";
import assert from "node:assert/strict";
import { ProfileSchema } from "../profile/parse";
import { assessJob, buildSignals, quoteProfile, rankForProfile, ruleNote, toUsd, type FitJob } from "./fit";
import { toolTokens } from "./concepts";

const NOW = new Date("2026-11-15T00:00:00Z");

/** A video editor who also builds small web apps (synthetic). */
const profile = ProfileSchema.parse({
  languages: [
    { code: "ko", level: "native" },
    { code: "en", level: "conversational" },
  ],
  fields: ["생성형 AI 영상 제작", "영상 편집·후반작업", "AI 자동화 구축", "웹 앱 개발(바이브코딩)", "유튜브 숏폼 기획"],
  skills: ["Adobe Premiere Pro", "Next.js", "Supabase", "ElevenLabs(TTS)"],
  domain_expertise: ["사내방송·교육영상 제작"],
  experience_summary_ko: "회사에서 사내방송을 편집하고 AI 내레이션으로 영어 유튜브를 운영한다.",
  weekly_hours: 10,
  min_hourly_usd: 15,
  avoid: ["변주 없는 단순 반복 작업", "실명이 공개되는 일"],
  notes_ko: "AI 영상 결과 평가, 썸네일 제작을 우선 추천.",
});
const sig = buildSignals(profile);

let n = 0;
function job(partial: Partial<FitJob> & Pick<FitJob, "title">): FitJob {
  n++;
  return {
    id: `j${n}`,
    title_ko: null,
    summary_ko: [],
    category: null,
    languages: ["en"],
    english_level: "reading",
    requires_credential: false,
    hours_per_week_min: null,
    pay_min: null,
    pay_max: null,
    pay_currency: null,
    pay_unit: null,
    status: "open",
    first_seen_at: "2026-11-14T10:00:00Z",
    url: `https://example.com/${n}`,
    ...partial,
  };
}

test("profile signals: fields outrank skills, avoid and tools are read", () => {
  assert.equal(sig.concepts.get("genai_media")?.weight, 5);
  assert.equal(sig.concepts.get("video_edit")?.weight, 5); // "생성형 AI 영상 제작" already says 영상
  assert.equal(sig.concepts.get("web_fullstack")?.weight, 3.8);
  assert.equal(sig.concepts.get("thumbnail_graphics")?.weight, 4); // from notes_ko
  assert.ok(sig.avoid.has("repetitive"));
  assert.ok(sig.avoid.has("public_identity"));
  assert.equal(sig.english, "conversational");
  assert.deepEqual(toolTokens(["Adobe Premiere Pro", "Next.js", "Vercel·Cloudflare R2"]), ["premiere", "next.js", "vercel", "cloudflare"]);
});

test("video editing ranks first; labeling, other languages and performer work are out", () => {
  const edit = job({
    title: "Edit 10 YouTube Shorts from raw footage",
    title_ko: "유튜브 쇼츠 10개 편집",
    summary_ko: ["원본 촬영본으로 쇼츠 편집", "Premiere Pro 사용"],
    category: "video",
    pay_max: 400,
    pay_currency: "USD",
    pay_unit: "project",
    url: "https://www.freelancer.com/projects/video-editing/shorts",
  });
  const nextjs = job({ title: "Fix a Next.js + Supabase landing page", category: "dev", pay_max: 300, pay_currency: "USD", pay_unit: "project" });
  const labeling = job({ title: "Image Annotation Specialist", summary_ko: ["이미지 라벨링 작업"], category: "labeling" });
  const japanese = job({ title: "Japanese video subtitle editor", languages: ["ja", "en"], category: "video" });
  const voice = job({ title: "Voice-over artist for YouTube video", category: "video" });
  const logo = job({ title: "Clean modern logo", summary_ko: ["로고 디자인", "포토샵, 일러스트레이터 필요"], category: "design" });

  const ranked = rankForProfile([labeling, nextjs, japanese, voice, logo, edit], sig, NOW);
  assert.deepEqual(
    ranked.map((r) => r.job.id),
    [edit.id, nextjs.id],
  );
  assert.ok(ranked[0].tools.includes("premiere"));
  assert.equal((assessJob(labeling, sig, NOW) as { why: string }).why, "avoid:repetitive");
  assert.equal((assessJob(japanese, sig, NOW) as { why: string }).why, "language:ja");
  assert.equal((assessJob(voice, sig, NOW) as { why: string }).why, "performer");
  assert.equal((assessJob(logo, sig, NOW) as { why: string }).why, "craft:logo_brand");
});

test("avoid list removes otherwise matching work", () => {
  const annotate = job({ title: "Video annotation for AI training", summary_ko: ["영상 프레임 라벨링"], category: "labeling" });
  assert.equal((assessJob(annotate, sig, NOW) as { why: string }).why, "avoid:repetitive");
  const onCamera = job({ title: "UGC creator: short videos for our app", summary_ko: ["직접 출연하는 숏폼 영상"], category: "video" });
  assert.equal((assessJob(onCamera, sig, NOW) as { why: string }).why, "performer");
});

test("English, hours, pay and credential rules", () => {
  const native = job({ title: "Video editor (native English)", english_level: "native", category: "video" });
  assert.equal((assessJob(native, sig, NOW) as { why: string }).why, "english:native");

  const business = job({ title: "Video editor", english_level: "business", category: "video" });
  const reading = job({ title: "Video editor", english_level: "reading", category: "video" });
  const b = assessJob(business, sig, NOW);
  const r = assessJob(reading, sig, NOW);
  assert.ok(b.ok && r.ok && b.score < r.score, "one level above is kept with a penalty");

  const longHours = job({ title: "Video editor", hours_per_week_min: 25, category: "video" });
  assert.equal((assessJob(longHours, sig, NOW) as { why: string }).why, "hours:25");

  const cheap = job({ title: "Video editor", pay_max: 600, pay_currency: "INR", pay_unit: "hour", category: "video" });
  assert.equal((assessJob(cheap, sig, NOW) as { why: string }).why, "pay:7");

  const credential = job({ title: "Licensed lawyer to review AI video scripts", requires_credential: true, category: "domain", summary_ko: ["영어 다큐 대본 검토"] });
  const credentialVideo = job({ title: "Certified video editor for AI video", requires_credential: true, category: "video" });
  assert.ok(assessJob(credentialVideo, sig, NOW).ok, "same kind of work as the first field: kept");
  // A lawyer job is specialist work outside this person's specialty, before its licence is even weighed.
  assert.equal((assessJob(credential, sig, NOW) as { why: string }).why, "domain");
  const credentialWriting = job({ title: "Licensed lawyer to review AI video scripts", requires_credential: true, category: "writing", summary_ko: ["영어 다큐 대본 검토"] });
  assert.equal((assessJob(credentialWriting, sig, NOW) as { why: string }).why, "credential");
});

test("fresh, well-paid hourly work scores above stale talent pools", () => {
  const fresh = job({ title: "AI video generation evaluator", category: "video", pay_max: 30, pay_currency: "USD", pay_unit: "hour", first_seen_at: "2026-11-14T20:00:00Z" });
  const pool = job({ title: "AI video generation evaluator", category: "video", status: "pool", first_seen_at: "2026-10-01T00:00:00Z" });
  const [a, b] = rankForProfile([pool, fresh], sig, NOW);
  assert.equal(a.job.id, fresh.id);
  assert.ok(a.score - b.score >= 2);
});

test("rule note cites the profile and suits the way to apply", () => {
  const gig = job({
    title: "Edit YouTube Shorts",
    category: "video",
    url: "https://www.freelancer.com/projects/video/x",
    first_seen_at: "2026-11-14T12:00:00Z",
    summary_ko: ["Premiere Pro로 쇼츠 편집"],
  });
  const [r] = rankForProfile([gig], sig, NOW);
  const note = ruleNote(r, profile, NOW);
  assert.match(note.reason, /^내 분석의 ‘생성형 AI 영상 제작’ 그대로 할 수 있는 영상 편집 일이에요/);
  assert.match(note.reason, /\(Adobe Premiere Pro 사용\)$/, "the tool as the profile spells it");
  assert.match(note.today, /견적 입찰/);
});

test("currency conversion for pay checks", () => {
  assert.equal(toUsd(100, "USD"), 100);
  assert.equal(Math.round(toUsd(10_000, "INR")!), 120);
  assert.equal(toUsd(100, "XXX"), null);
  assert.equal(toUsd(null, "USD"), null);
});

test("software work only in a language the profile uses", () => {
  const java = job({ title: "Java Coding Specialist - Freelance AI Trainer", summary_ko: ["Java 코드 평가"], category: "dev" });
  const jsts = job({ title: "AI coding evaluator (JavaScript/TypeScript)", category: "dev" });
  const wordpress = job({ title: "WordPress website fixes", summary_ko: ["워드프레스 웹사이트 수정"], category: "dev" });
  assert.ok(sig.code.has("js"), "Next.js in skills implies JavaScript/TypeScript");
  assert.equal((assessJob(java, sig, NOW) as { why: string }).why, "unrelated");
  assert.equal((assessJob(wordpress, sig, NOW) as { why: string }).why, "unrelated");
  assert.ok(assessJob(jsts, sig, NOW).ok);
});

test("education means video or content to produce, not course design or articles", () => {
  const courseDesign = job({ title: "Design 40-Hour AI Safety Course", summary_ko: ["교육 과정 설계", "그래픽 디자인 필요"], category: "design" });
  const trainingVideos = job({ title: "Edit 5 training videos for our e-learning course", category: "video" });
  assert.equal((assessJob(courseDesign, sig, NOW) as { why: string }).why, "unrelated");
  const fit = assessJob(trainingVideos, sig, NOW);
  assert.ok(fit.ok && fit.hits.some((h) => h.id === "edu_content"));
});

test("a title naming a craft the profile lacks rules the job out", () => {
  const threeD = job({ title: "3D Modeling & Python Specialist - Freelance AI Trainer", summary_ko: ["JavaScript 사용"], category: "motion_3d" });
  assert.equal((assessJob(threeD, sig, NOW) as { why: string }).why, "craft:three_d");
  const audio = job({ title: "Audio Editor for Dialogue", summary_ko: ["유튜브 영상 대사 오디오 정리"], category: "other" });
  assert.equal((assessJob(audio, sig, NOW) as { why: string }).why, "craft:audio");
  const shorts = job({ title: "Edit YouTube Shorts", summary_ko: ["자막과 간단한 모션 그래픽 포함"], category: "video" });
  assert.ok(assessJob(shorts, sig, NOW).ok, "craft words outside the title don't rule out (motion only in the body)");
});

test("jobs for other countries' residents and credential jobs outside the person's own fields are out", () => {
  const usOnly = job({ title: "AI video evaluator", summary_ko: ["AI 영상 평가", "미국 거주자만 지원 가능합니다."], category: "video" });
  assert.equal((assessJob(usOnly, sig, NOW) as { why: string }).why, "region");

  // Matches only through the AI's recommendation line (notes_ko), not the person's own fields.
  const seniorEval = job({ title: "Senior AI video quality evaluator", requires_credential: true, category: "labeling", summary_ko: ["AI 영상 결과 평가"] });
  assert.equal((assessJob(seniorEval, sig, NOW) as { why: string }).why, "credential");
});

test("UI/UX and website work reach designers; localization 'UI content review' doesn't", () => {
  const designer = buildSignals(
    ProfileSchema.parse({
      languages: [
        { code: "ko", level: "native" },
        { code: "en", level: "reading" },
      ],
      fields: ["UI/UX 디자인", "웹사이트 제작(워드프레스·웹플로우)"],
      skills: ["Figma", "Webflow"],
      domain_expertise: [],
      experience_summary_ko: "앱 화면과 랜딩 페이지를 피그마로 디자인해 왔다.",
      weekly_hours: 10,
      min_hourly_usd: null,
      avoid: [],
      notes_ko: "",
    }),
  );
  assert.ok(designer.concepts.has("ui_ux"));
  assert.ok(designer.concepts.has("web_builder"));
  const app = assessJob(job({ title: "Mobile app UI design in Figma", category: "design", summary_ko: ["피그마로 앱 화면 12장 디자인"] }), designer, NOW);
  assert.equal(app.ok, true, JSON.stringify(app));
  const wp = assessJob(job({ title: "WordPress landing page for a cafe", category: "dev", summary_ko: ["워드프레스로 랜딩 페이지 제작"] }), designer, NOW);
  assert.equal(wp.ok, true, "a WordPress site doesn't need PHP in the profile: " + JSON.stringify(wp));
  const l10n = assessJob(
    job({ title: "English to Latvian UI, Marketing & Product Content Review Lead", category: "language", languages: ["en", "lv"], summary_ko: ["UI·마케팅 콘텐츠 번역 검수"] }),
    designer,
    NOW,
  );
  assert.equal(l10n.ok, false);
});

test("a video call is not video editing; student-only roles are out", () => {
  const editing = job({ title: "Edit YouTube videos", category: "video" });
  const call = job({ title: "Video Call API Automation", title_ko: "화상 통화 API 자동화 스크립트 개발", summary_ko: ["영상 통화 API 연동"], category: "dev" });
  const ambassador = job({ title: "Cengage Student Ambassador", summary_ko: ["대학생 대상, 콘텐츠 제작"], category: "writing" });
  assert.ok(assessJob(editing, sig, NOW).ok);
  const callFit = assessJob(call, sig, NOW);
  assert.ok(!callFit.ok || !callFit.hits.some((h) => h.id === "video_edit"), "a video call doesn't count as editing");
  assert.equal((assessJob(ambassador, sig, NOW) as { why: string }).why, "student");
});

test("a match only in the summary ranks below one in the title", () => {
  const inTitle = job({ id: "t", title: "Edit YouTube Shorts", category: "video", summary_ko: ["쇼츠 편집"], first_seen_at: "2026-11-14T12:00:00Z" });
  const inSummary = job({ id: "s", title: "Korean coding evaluator", category: "other", summary_ko: ["AI가 쓴 코드를 평가하고 쇼츠 편집 경험이 있으면 우대"], first_seen_at: "2026-11-14T12:00:00Z" });
  const ranked = rankForProfile([inSummary, inTitle], sig, NOW);
  assert.deepEqual(ranked.map((r) => r.job.id), ["t", "s"], "both stay related, the title match first");
  const s = ranked.find((r) => r.job.id === "s")!;
  assert.ok(s.hits.every((h) => h.weight < 5), "summary-only weight is discounted");
});

test("quotes of the profile break at a natural point", () => {
  assert.equal(quoteProfile("Claude Code로 만드는 웹앱·랜딩페이지·자동화", 22), "Claude Code로 만드는 웹앱");
  assert.equal(quoteProfile("회계·재무 전문 AI 답변 평가", 22), "회계·재무 전문 AI 답변 평가");
});
