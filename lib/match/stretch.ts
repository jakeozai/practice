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
import { jobText, personalLimits, toUsd, type FitJob, type ProfileSignals } from "./fit";

export type StretchKind = { id: string; label: string; aiHow: string; job: RegExp; not?: RegExp };

export const STRETCH_KINDS: StretchKind[] = [
  {
    id: "logo_graphics",
    label: "로고·그래픽 디자인",
    aiHow: "Midjourney·Ideogram으로 시안을 뽑고 Illustrator·Canva로 다듬기",
    job: /\blogo|로고|branding\s*kit|brand\s*identity|브랜드\s*아이덴티티|illustrat|삽화|일러스트|t-?shirt|티셔츠|poster|포스터|banner|배너|flyer|전단|sticker|스티커|\bicons?\b|아이콘|vector|벡터|\bpng\b|social\s*media\s*(?:post|graphic|design)|소셜\s*미디어\s*(?:디자인|그래픽)|book\s*cover|표지|mock-?up|목업|infographic|인포그래픽|template\s*design|템플릿\s*디자인/i,
    not: /interior|인테리어|architect|건축|주택|평면도|floor\s*plan|도면|\bcad\b|revit|remodel|리모델링|객실|\broom\b|방\s*디자인|ceiling|천장|garment|원단|jacket|재킷|fashion|패션|jewel|주얼리|tattoo|문신/i,
  },
  {
    id: "three_d",
    label: "3D 모델·렌더",
    aiHow: "Meshy·Tripo 같은 AI 3D 생성으로 초안을 만들고 Blender로 다듬기",
    job: /\b3d\b|blender|블렌더|render|렌더|game\s*asset|게임\s*에셋|character\s*model|캐릭터\s*모델|\bstl\b|3d\s*print|3d\s*프린팅|figurine|피규어|low[- ]?poly|로우\s*폴리/i,
    not: /\bcad\b|solidworks|솔리드웍스|revit|리빗|autocad|archicad|기계\s*부품|mechanical|engineering\s*drawing|도면|주택|건축|architect|interior|인테리어|평면도|floor\s*plan|jewel|주얼리|\bbim\b/i,
  },
  {
    id: "web_bot",
    label: "웹·봇·자동화 개발",
    aiHow: "Claude Code 같은 AI 코딩 도구로 빠르게 만들기",
    job: /website|웹사이트|landing\s*page|랜딩|web\s*app|웹\s*앱|chat\s*bot|chatbot|챗봇|\bbot\b|(?:^|[^로])봇|automat|자동화|\bscript\b|스크립트|scrap|크롤|integration|연동|plugin|플러그인|browser\s*extension|확장\s*프로그램|bug\s*fix|버그\s*수정|prototype|프로토타입|\bmvp\b|mobile\s*app|모바일\s*앱|앱\s*개발|wordpress|워드프레스|shopify|쇼피파이/i,
    not: /\bseo\b|검색\s*(?:엔진\s*)?최적화|google\s*ads|구글\s*(?:광고|애즈)|광고\s*캠페인|\bsales\b|영업|cold\s*call|콜드\s*콜|telemarket|financial\s*model|재무\s*모델|trading|트레이더|트레이딩|recruit|채용|founding|창립|senior|시니어|\blead\b|\bcto\b|full[- ]?time|정규직|security\s*audit|보안\s*감사|blockchain|블록체인|smart\s*contract|\bcrm\b|amazon\s*fba|아마존\s*fba|listing/i,
  },
  {
    id: "ai_content",
    label: "생성형 AI 작업",
    aiHow: "생성형 AI 도구로 결과물을 만들고 직접 손봐서 완성하기",
    job: /\bai[- ](?:generated|image|art|video|avatar|voice|content|influencer|music)|ai\s*(?:이미지|영상|콘텐츠|아바타|그림|음악)|생성형|generative|midjourney|stable\s*diffusion|prompt\s*engineer|프롬프트\s*(?:작성|엔지니어)|custom\s*gpt|gpts\b/i,
    not: /\blabel|라벨링|annotat|어노테이션|\brater\b|평가자|transcri|전사/i,
  },
];

/** Categories a stretch may come from (language, labeling and expert-domain work are never a stretch). */
const STRETCH_CATEGORIES = new Set(["design", "motion_3d", "dev", "video", "other", "writing"]);
/** (제안값) Fixed-price budgets under this (USD) aren't worth a first try. */
const STRETCH_MIN_BUDGET_USD = 50;

export type StretchRanked<J extends FitJob> = { job: J; score: number; kind: string; kindLabel: string; aiHow: string };

export function stretchKindOf(job: FitJob): StretchKind | null {
  if (!job.category || !STRETCH_CATEGORIES.has(job.category)) return null;
  const text = jobText(job);
  for (const k of STRETCH_KINDS) {
    if (k.job.test(text) && !k.not?.test(text)) return k;
  }
  return null;
}

/** Stretch candidates, best first; `exclude` holds the jobs already offered as profile fits. */
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
    // Closer to what the person already does is an easier first try (thumbnails → social graphics, web dev → landing pages).
    const near = CONCEPTS.reduce((best, c) => {
      const h = sig.concepts.get(c.id);
      return h && c.job.test(text) ? Math.max(best, h.weight) : best;
    }, 0);
    score += Math.min(near * 0.4, 2);
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

    out.push({ job, score: Math.round(score * 100) / 100, kind: kind.id, kindLabel: kind.label, aiHow: kind.aiHow });
  }
  return out.sort((a, b) => b.score - a.score || b.job.first_seen_at.localeCompare(a.job.first_seen_at));
}

/** The model's stretch candidates: the best few, at most `perKind` of each kind so it can offer two different tries. */
export function stretchPool<J extends FitJob>(ranked: StretchRanked<J>[], size: number, perKind = 2): StretchRanked<J>[] {
  const count = new Map<string, number>();
  const out: StretchRanked<J>[] = [];
  for (const r of ranked) {
    if (out.length >= size) break;
    const n = count.get(r.kind) ?? 0;
    if (n >= perKind) continue;
    count.set(r.kind, n + 1);
    out.push(r);
  }
  return out;
}
