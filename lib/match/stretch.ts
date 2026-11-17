/**
 * "AI로 도전해 볼 일감" (2026-11-14 user decision): besides the three jobs
 * that fit the profile, two jobs the person hasn't done but could deliver
 * today with AI tools — a logo, a 3D model, a landing page or bot, generative
 * AI work. Only kinds where AI really produces the deliverable; each kind
 * leaves out the look-alikes found in real postings (interior and
 * architectural "design", mechanical CAD "3D", SEO, sales and finance "dev").
 *
 * Every personal limit still applies (personalLimits: region, languages,
 * English, avoid list, performer work, hours, pay); degree/licence jobs never
 * count as a stretch.
 */
import { CONCEPTS, codeLanguages } from "./concepts";
import type { WantedWork } from "../profile/parse";
import { jobText, personalLimits, SUMMARY_ONLY_FACTOR, toUsd, type FitJob, type ProfileSignals } from "./fit";

export type StretchKind = {
  id: string;
  label: string;
  aiHow: string;
  job: RegExp;
  not?: RegExp;
  /** Job categories the kind can come from when only the summary names it (the title decides otherwise). */
  categories: string[];
};

export const STRETCH_KINDS: StretchKind[] = [
  {
    id: "logo_graphics",
    categories: ["design"],
    label: "로고·그래픽 디자인",
    aiHow: "Midjourney·Ideogram으로 시안을 뽑고 Illustrator·Canva로 다듬기",
    job: /\blogo|로고|branding\s*kit|brand\s*identity|브랜드\s*아이덴티티|illustrat|삽화|일러스트|t-?shirt|티셔츠|poster|포스터|banner|배너|flyer|전단|sticker|스티커|\bicons?\b|아이콘|vector|벡터|\bpng\b|social\s*media\s*(?:post|graphic|design)|소셜\s*미디어\s*(?:디자인|그래픽)|book\s*cover|표지|mock-?up|목업|infographic|인포그래픽|template\s*design|템플릿\s*디자인/i,
    not: /interior|인테리어|architect|건축|주택|평면도|floor\s*plan|도면|\bcad\b|revit|remodel|리모델링|객실|\broom\b|방\s*디자인|ceiling|천장|garment|원단|jacket|재킷|fashion|패션|jewel|주얼리|tattoo|문신/i,
  },
  {
    id: "three_d",
    categories: ["motion_3d", "design"],
    label: "3D 모델·렌더",
    aiHow: "Meshy·Tripo 같은 AI 3D 생성으로 초안을 만들고 Blender로 다듬기",
    job: /\b3d\b|blender|블렌더|render|렌더|game\s*asset|게임\s*에셋|character\s*model|캐릭터\s*모델|\bstl\b|3d\s*print|3d\s*프린팅|figurine|피규어|low[- ]?poly|로우\s*폴리/i,
    not: /\bcad\b|solidworks|솔리드웍스|revit|리빗|autocad|archicad|기계\s*부품|mechanical|engineering\s*drawing|도면|주택|건축|architect|interior|인테리어|평면도|floor\s*plan|jewel|주얼리|\bbim\b/i,
  },
  {
    id: "web_bot",
    categories: ["dev"],
    label: "웹·봇·자동화 개발",
    aiHow: "Claude Code 같은 AI 코딩 도구로 빠르게 만들기",
    job: /website|웹사이트|landing\s*page|랜딩|web\s*app|웹\s*앱|chat\s*bot|chatbot|챗봇|\bbot\b|(?:^|[^로])봇|automat|자동화|\bscript\b|스크립트|scrap|크롤|integration|연동|plugin|플러그인|browser\s*extension|확장\s*프로그램|bug\s*fix|버그\s*수정|prototype|프로토타입|\bmvp\b|mobile\s*app|모바일\s*앱|앱\s*개발|wordpress|워드프레스|shopify|쇼피파이/i,
    not: /\bseo\b|검색\s*(?:엔진\s*)?최적화|google\s*ads|구글\s*(?:광고|애즈)|광고\s*캠페인|\bsales\b|영업|cold\s*call|콜드\s*콜|telemarket|financial\s*model|재무\s*모델|trading|트레이더|트레이딩|recruit|채용|founding|창립|senior|시니어|\blead\b|\bcto\b|full[- ]?time|정규직|security\s*audit|보안\s*감사|blockchain|블록체인|smart\s*contract|\bcrm\b|amazon\s*fba|아마존\s*fba|listing|\berp\b|infor\b|\bsap\b|oracle|netsuite|salesforce|odoo|zoho|hubspot|dynamics\s*365|\bpim\b|customer\s*support|고객\s*(?:지원|응대)|virtual\s*assistant|가상\s*비서|\bqa\b|테스트\s*자동화|test\s*automation|data\s*entry|데이터\s*입력/i,
  },
  {
    // 2026-11-16 user decision: the office worker's AI job. Converting PDFs and scans, cleaning
    // spreadsheets and making slides take hours by hand and an evening with AI.
    id: "office_docs",
    categories: ["dev", "writing", "design", "other"],
    label: "AI 문서 작업",
    aiHow: "ChatGPT·Claude로 표와 내용을 뽑아 엑셀·워드로 정리하고, 슬라이드는 Gamma 같은 AI 도구로 초안을 만들어 다듬기",
    job: /\bpdf\b|엑셀|excel|spreadsheet|스프레드시트|google\s*(?:sheets?|docs?)|구글\s*(?:시트|문서)|ms\s*word|(?:to|into)\s*word\b|워드\s*(?:파일|변환|문서)|docx|power\s*point|파워\s*포인트|\bppt\b|pitch\s*deck|presentation|발표\s*자료|제안서|slide\s*deck|슬라이드|typing|타이핑/i,
    not: /full[- ]?time|정규직|virtual\s*assistant|가상\s*비서|\bongoing\b|daily\s*(?:data\s*entry|tasks)|매일\s*(?:입력|업무)/i,
  },
  {
    id: "ai_content",
    categories: ["video", "design", "writing", "other", "motion_3d"],
    label: "생성형 AI 작업",
    aiHow: "생성형 AI 도구로 결과물을 만들고 직접 손봐서 완성하기",
    job: /\bai[- ](?:generated|image|art|video|avatar|voice|content|influencer|music)|ai\s*(?:이미지|영상|콘텐츠|아바타|그림|음악)|생성형|generative|midjourney|stable\s*diffusion|prompt\s*engineer|프롬프트\s*(?:작성|엔지니어)|custom\s*gpt|gpts\b/i,
    not: /\blabel|라벨링|annotat|어노테이션|\brater\b|평가자|transcri|전사/i,
  },
];

/** Kinds a writing-category job can be: generative AI work, or document work done with AI. */
const WRITING_KINDS = new Set(["ai_content", "office_docs"]);

/** Categories a stretch may come from (language, labeling and expert-domain work are never a stretch; writing only as AI or document work). */
const STRETCH_CATEGORIES = new Set(["design", "motion_3d", "dev", "video", "other", "writing"]);

/**
 * Freelancer.com files each project under a category in its URL
 * (/projects/customer-service/…). These are people's time, not something AI
 * builds, whatever words the title uses ("Email & Chat Support Assistants"). (제안값)
 */
const NOT_STRETCH_SLUG =
  /\/projects\/(?:customer-service|customer-support|technical-support|virtual-assistant|telemarketing|sales|lead-generation|seo|internet-marketing|social-media-marketing|accounting|bookkeeping|finance|legal|translation|transcription|recruitment|project-management|article-writing|copywriting|research|ghostwriting)\//i;
/** Document and spreadsheet projects: by hand they are data entry; with AI they are an evening's try ("AI 문서 작업" only). */
const OFFICE_SLUG = /\/projects\/(?:data-entry|data-processing|excel|copy-typing|typing|pdf|word|powerpoint)\//i;

/** A person doing the work by hand, even when the words sound technical — unless the posting asks to build the tool ("AI email support bot"). */
const HUMAN_SERVICE = /support\s*(?:assistant|agent|specialist|representative)|chat\s*support|email\s*support|지원\s*보조|상담원|상담\s*업무|응대\s*업무|moderator|모더레이터/i;
const BUILDS_TOOL = /\bbot\b|chat\s*bot|chatbot|챗봇|automat|자동화|develop|개발|\bbuild|구축|integration|연동/i;

/**
 * A role, not a deliverable: "AI Engineer (contract)", "GTM Engineer", "Project Manager". Fine as
 * work, but there is nothing to make with AI today and attach (2026-11-16 persona run). (제안값)
 */
const ROLE_TITLE =
  /\b(?:engineer|manager|director|lead|head\s+of|scientist|researcher|analyst|consultant|architect|executive|coordinator|officer|strategist|recruiter)\b|엔지니어|매니저|디렉터|리드|과학자|연구원|분석가|컨설턴트|아키텍트|임원|코디네이터|전략가/i;

/** One small, clear deliverable is a fair first try with AI; a platform or app is not. (제안값) */
const SMALL_DELIVERABLE =
  /\bpdf\b|spreadsheet|스프레드시트|pitch\s*deck|presentation|파워\s*포인트|\bppt\b|제안서|\blogo|로고|\bicons?\b|아이콘|sticker|스티커|t-?shirt|티셔츠|poster|포스터|banner|배너|flyer|전단|thumbnail|썸네일|illustrat|삽화|일러스트|book\s*cover|표지|3d\s*model|3d\s*모델|figurine|피규어|character\s*model|landing\s*page|랜딩|one[- ]page|원\s*페이지|website|웹사이트|chat\s*bot|chatbot|챗봇|\bscript\b|스크립트/i;
const BIG_SCOPE =
  /platform|플랫폼|marketplace|마켓플레이스|enterprise|엔터프라이즈|integration\s*hub|데이터\s*통합|migration|마이그레이션|mobile\s*app|모바일\s*앱|e-?commerce\s*app|이커머스\s*앱|앱\s*개발|\bgame\b|게임|\bsaas\b|full[- ]?stack|풀스택|long[- ]term|장기/i;
/** (제안값) Fixed-price budgets under this (USD) aren't worth a first try. */
const STRETCH_MIN_BUDGET_USD = 50;

/**
 * (제안값) How close each kind of try is to what the profile shows (concept id → share), so the
 * two tries differ by person instead of being the day's newest for everyone (2026-11-16: 7 of
 * 10 personas got the same chatbot job). A translator leans to generative-AI content, a
 * marketer to graphics, anyone who codes with AI to web and bots.
 */
export const KIND_AFFINITY: Record<string, Record<string, number>> = {
  logo_graphics: { logo_brand: 1, thumbnail_graphics: 1, ui_ux: 0.6, photo: 0.6, marketing: 0.5, web_builder: 0.4, short_form: 0.3 },
  three_d: { three_d: 1, motion: 0.8, genai_media: 0.4, engineering: 0.3 },
  office_docs: { finance: 0.8, marketing: 0.6, data_scraping: 0.6, automation_ai: 0.5, edu_content: 0.5, writing: 0.5, labeling: 0.4, translation: 0.4 },
  web_bot: { web_fullstack: 1, automation_ai: 1, data_scraping: 1, web_builder: 1, ai_eval_code: 0.7, ui_ux: 0.5, finance: 0.3 },
  ai_content: {
    genai_media: 1,
    video_edit: 0.6,
    short_form: 0.6,
    voice_tts: 0.6,
    ai_eval_media: 0.6,
    writing: 0.6,
    marketing: 0.5,
    edu_content: 0.5,
    english_media: 0.4,
    translation: 0.4,
    ai_eval_text: 0.4,
    language_eval: 0.3,
    labeling: 0.3,
  },
};
/** Kinds of work the person says they want (profile wanted_work) → closeness to a kind of try. */
const WANTED_KIND: Record<string, Partial<Record<string, number>>> = {
  logo_graphics: { design: 0.8 },
  three_d: { motion_3d: 0.8 },
  web_bot: { dev: 0.8 },
  office_docs: { office: 1 },
  ai_content: { video: 0.6, writing: 0.5 },
};
/** (제안값) Someone who has only tried AI shouldn't get a coding try first, unless they code. */
const BEGINNER_WEB_PENALTY = 2;

/** Anyone who writes code (or builds with an AI coding tool) is this close to web and bot work. */
const CODER_WEB_AFFINITY = 0.8;
/** (제안값) Score added for a kind the profile is fully close to. */
const AFFINITY_BONUS = 3;
/** Weight of the strongest profile section (fields[0]); affinities scale against it. */
const TOP_WEIGHT = 5;

/** 0–1: how close a kind of try is to this person's profile. */
export function kindAffinity(kindId: string, sig: ProfileSignals): number {
  let best = kindId === "web_bot" && sig.code.size > 0 ? CODER_WEB_AFFINITY : kindId === "office_docs" && sig.officeDocs ? 1 : 0;
  for (const [concept, share] of Object.entries(KIND_AFFINITY[kindId] ?? {})) {
    const h = sig.concepts.get(concept);
    if (h) best = Math.max(best, share * Math.min(h.weight / TOP_WEIGHT, 1));
  }
  for (const [wanted, share] of Object.entries(WANTED_KIND[kindId] ?? {})) {
    if (sig.wantedWork.has(wanted as WantedWork)) best = Math.max(best, share ?? 0);
  }
  return best;
}

export type StretchRanked<J extends FitJob> = {
  job: J;
  score: number;
  kind: string;
  kindLabel: string;
  aiHow: string;
  /** Profile wording the job is near (its strongest shared concept), for the reason line. */
  link?: string;
};

export function stretchKindOf(job: FitJob): StretchKind | null {
  if (!job.category || !STRETCH_CATEGORIES.has(job.category)) return null;
  if (NOT_STRETCH_SLUG.test(job.url)) return null;
  const officeOnly = OFFICE_SLUG.test(job.url);
  const title = `${job.title}\n${job.title_ko ?? ""}`;
  if (ROLE_TITLE.test(title)) return null;
  const text = jobText(job);
  if (HUMAN_SERVICE.test(text) && !BUILDS_TOOL.test(text)) return null;
  const allowed = STRETCH_KINDS.filter(
    (k) => (!officeOnly || k.id === "office_docs") && !(job.category === "writing" && !WRITING_KINDS.has(k.id)) && !k.not?.test(text),
  );
  // The title says what the job is; a word in the summary ("with a banner") only counts in the kind's own categories.
  return allowed.find((k) => k.job.test(title)) ?? allowed.find((k) => k.categories.includes(job.category!) && k.job.test(text)) ?? null;
}

/** Stretch candidates, best first; `exclude` holds the jobs that already fit the profile (they are not a stretch). */
export function rankStretch<J extends FitJob>(jobs: J[], sig: ProfileSignals, now: Date = new Date(), exclude: Set<string> = new Set()): StretchRanked<J>[] {
  const out: StretchRanked<J>[] = [];
  for (const job of jobs) {
    if (exclude.has(job.id) || job.requires_credential || job.status === "closed") continue;
    const kind = stretchKindOf(job);
    if (!kind) continue;
    const limits = personalLimits(job, sig);
    if (!limits.ok) continue;
    const text = jobText(job);

    let score = 3 - limits.penalty;
    // Closer to what the person already does is an easier first try (thumbnails → social graphics, web dev → landing pages,
    // a nurse → a clinic's website).
    // Only a link the job's title shows is named in the reason; a summary word still helps the score a little.
    const title = `${job.title}\n${job.title_ko ?? ""}`;
    let near: { weight: number; trigger: string; inTitle: boolean } | null = null;
    for (const c of CONCEPTS) {
      const h = sig.concepts.get(c.id);
      if (!h || !c.job.test(text)) continue;
      const inTitle = c.job.test(title);
      const w = inTitle ? h.weight : h.weight * SUMMARY_ONLY_FACTOR;
      if (w > (near?.weight ?? 0)) near = { weight: w, trigger: h.trigger, inTitle };
    }
    score += Math.min((near?.weight ?? 0) * 0.4, 2);
    score += AFFINITY_BONUS * kindAffinity(kind.id, sig);
    if (kind.id === "web_bot" && sig.aiLevel === "beginner" && sig.code.size === 0) score -= BEGINNER_WEB_PENALTY;
    if (kind.id === "web_bot") {
      const langs = codeLanguages(text);
      if (langs.size > 0 && ![...langs].some((l) => sig.code.has(l))) score -= 1.5;
    }
    const usd = toUsd(job.pay_max ?? job.pay_min, job.pay_currency);
    if (usd !== null) {
      if (job.pay_unit === "hour") score += sig.minHourlyUsd !== null && usd >= sig.minHourlyUsd ? 0.5 : 0;
      else if (usd < STRETCH_MIN_BUDGET_USD) score -= 2;
      else if (usd >= 300) score += 1;
      else if (usd >= 100) score += 0.5;
    }
    const ageHours = (now.getTime() - new Date(job.first_seen_at).getTime()) / 3_600_000;
    if (ageHours <= 36) score += 1;
    else if (ageHours <= 96) score += 0.5;
    if (job.status === "pool") score -= 1;
    if (SMALL_DELIVERABLE.test(text)) score += 1;
    if (BIG_SCOPE.test(text)) score -= 1.5;

    out.push({ job, score: Math.round(score * 100) / 100, kind: kind.id, kindLabel: kind.label, aiHow: kind.aiHow, ...(near?.inTitle ? { link: near.trigger } : {}) });
  }
  return out.sort((a, b) => b.score - a.score || b.job.first_seen_at.localeCompare(a.job.first_seen_at));
}

/**
 * The model's stretch candidates: the best of each kind (logo, 3D, web, AI
 * work), so the two tries in a mail are of different kinds. Only when fewer
 * than `minKinds` kinds have a candidate does a second of a kind come in (at
 * most `perKind`). Best first within the result.
 */
export function stretchPool<J extends FitJob>(ranked: StretchRanked<J>[], size: number, perKind = 2, minKinds = 2): StretchRanked<J>[] {
  const out: StretchRanked<J>[] = [];
  for (let round = 0; round < perKind && out.length < size; round++) {
    if (round > 0 && out.length >= minKinds) break;
    const seen = new Map<string, number>();
    for (const r of ranked) {
      if (out.length >= size) break;
      const n = seen.get(r.kind) ?? 0;
      seen.set(r.kind, n + 1);
      if (n === round && !out.includes(r)) out.push(r);
    }
  }
  return out.sort((a, b) => b.score - a.score);
}
