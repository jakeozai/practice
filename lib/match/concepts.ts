/**
 * What a profile (written in Korean by the user's own AI) and a job (English
 * title + our Korean title/summary) can have in common. Each concept fires on
 * the profile side and on the job side separately, so "영상 편집·후반작업" in
 * a profile meets "Video Editor for YouTube Shorts" in a job.
 *
 * A concept only counts when the PROFILE names it: nothing here is a default
 * interest. Patterns are (제안값) and grow with real postings; keep them
 * specific enough that a stray word ("editor", "agent") doesn't drag in
 * unrelated work.
 */
import type { JobCategoryValue } from "../jobs/categories";

export type Concept = {
  id: string;
  /** Short Korean label used in rule-based reasons. */
  label: string;
  /** Job categories this kind of work usually lands in. */
  categories: JobCategoryValue[];
  profile: RegExp;
  job: RegExp;
};

export const CONCEPTS: Concept[] = [
  {
    id: "video_edit",
    label: "영상 편집",
    categories: ["video"],
    profile: /영상|동영상|편집|후반\s*작업|프리미어|premiere|final\s*cut|파이널\s*컷|다빈치|davinci|사내\s*방송|브이로그|vlog|\bvideos?\b/i,
    job: /\bvideos?\b(?!\s*games?)|영상|동영상|premiere|final\s*cut|davinci|post[- ]?production|후반\s*작업|footage|촬영본|\breels?\b|릴스|\bshorts\b|쇼츠|숏폼|short[- ]form|tiktok|틱톡|youtube|유튜브|vlog|브이로그|자막|subtitl|컷\s*편집/i,
  },
  {
    id: "short_form",
    label: "유튜브·숏폼 콘텐츠",
    categories: ["video"],
    profile: /유튜브|youtube|숏폼|쇼츠|\bshorts\b|릴스|\breels\b|틱톡|tiktok|콘텐츠\s*기획/i,
    job: /youtube|유튜브|\bshorts\b|쇼츠|숏폼|short[- ]form|\breels?\b|릴스|tiktok|틱톡|instagram|인스타그램|social\s*media\s*(?:content|video)|sns\s*(?:콘텐츠|영상)|content\s*creat|콘텐츠\s*(?:기획|제작)|채널\s*운영|channel\s*(?:growth|manag)/i,
  },
  {
    id: "genai_media",
    label: "생성형 AI 영상·이미지",
    categories: ["video", "design"],
    profile:
      /생성형|generative|ai\s*(?:영상|이미지|비디오|내레이션|보이스|아트)|midjourney|미드저니|runway|런웨이|\bsora\b|kling|클링|elevenlabs|일레븐랩스|\btts\b|보이스\s*클로닝|stable\s*diffusion|heygen|synthesia/i,
    job: /\bai[- ](?:generated|video|image|art|avatar|voice|animation|influencer|ugc)|ai\s*(?:영상|이미지|아바타|음성|보이스|그림)|생성형|generative|midjourney|runway|\bsora\b|kling|elevenlabs|text[- ]to[- ](?:video|speech|image)|voice\s*clon|\btts\b|stable\s*diffusion|heygen|synthesia|dall[- ]?e|comfyui|\bveo\b/i,
  },
  {
    id: "thumbnail_graphics",
    label: "썸네일·그래픽",
    categories: ["design"],
    profile: /썸네일|thumbnail|그래픽|포토샵|photoshop|일러스트|illustrator|figma|피그마|canva|캔바/i,
    // Deliverables, not tools: a logo job that lists Photoshop isn't thumbnail work.
    job: /thumbnail|썸네일|banner|배너|poster|포스터|social\s*media\s*(?:post|graphic|design)|이미지\s*게시물|carousel|카드\s*뉴스|infographic|인포그래픽|youtube\s*(?:art|graphics?)/i,
  },
  {
    id: "edu_content",
    label: "교육 콘텐츠",
    categories: ["video", "writing"],
    profile: /교육|이러닝|e-?learning|마이크로\s*러닝|micro-?learning|강의|사내\s*방송|튜토리얼|tutorial/i,
    // Teaching material as video or content to produce; designing a curriculum or writing articles isn't it.
    job: /(?:e-?learning|이러닝|교육|\bcourses?\b|강의|training|tutorial|튜토리얼|explainer|instructional|lesson|\blms\b|micro-?learning|마이크로\s*러닝).{0,40}(?:\bvideos?\b|영상|animation|애니메이션|콘텐츠\s*제작)|(?:\bvideos?\b|영상).{0,40}(?:e-?learning|이러닝|교육|\bcourses?\b|강의|training|tutorial|튜토리얼|lesson|micro-?learning)/i,
  },
  {
    id: "corporate_video",
    label: "기업·홍보 영상",
    categories: ["video"],
    profile: /사내\s*방송|기업\s*(?:영상|홍보|교육)|홍보\s*영상|corporate|해외\s*법인/i,
    job: /corporate\s*(?:video|film)|기업\s*(?:영상|홍보)|promo(?:tional)?\s*video|홍보\s*영상|product\s*(?:video|demo)|제품\s*(?:영상|소개\s*영상)|commercial|광고\s*영상|brand\s*(?:video|film)|explainer\s*video|company\s*video|testimonial\s*video/i,
  },
  {
    id: "english_media",
    label: "영어 영상 콘텐츠",
    categories: ["video", "writing"],
    profile: /영어\s*(?:다큐|콘텐츠|교육|유튜브)|english\s*(?:content|documentary|youtube)/i,
    job: /documentar|다큐|english\s*(?:video|content|youtube)|narrat|내레이션|script\s*writ|대본/i,
  },
  {
    id: "voice_tts",
    label: "AI 내레이션·보이스",
    categories: ["video"],
    profile: /elevenlabs|일레븐랩스|\btts\b|보이스\s*클로닝|ai\s*내레이션|voice\s*clon/i,
    job: /elevenlabs|\btts\b|text[- ]to[- ]speech|voice\s*clon|ai\s*(?:voice|narrat)|ai\s*(?:음성|내레이션|보이스)/i,
  },
  {
    id: "web_fullstack",
    label: "웹·앱 개발",
    categories: ["dev"],
    profile: /풀스택|full[- ]?stack|웹|앱|next\.?js|react|supabase|prisma|vercel|바이브\s*코딩|vibe\s*cod|typescript|javascript|\bsaas\b|\bmvp\b|프론트엔드|백엔드/i,
    job: /next\.?js|\breact\b(?!\s*native)|supabase|prisma|vercel|full[- ]?stack|풀스택|web\s*app|웹\s*앱|웹사이트|website|landing\s*page|랜딩\s*페이지|typescript|javascript|node\.?js|\bsaas\b|\bmvp\b|front[- ]?end|프론트엔드|back[- ]?end|백엔드|firebase|tailwind|web\s*develop|웹\s*개발/i,
  },
  {
    id: "automation_ai",
    label: "AI 자동화·챗봇",
    categories: ["dev"],
    profile: /자동화|automation|에이전트|ai\s*agent|워크플로|workflow|n8n|zapier|make\.com|챗봇|chatbot|\bllm\b|api\s*연동|claude|gemini|openai|\bgpt\b/i,
    job: /automat|자동화|\bn8n\b|zapier|make\.com|ai\s*agents?|agentic|에이전트|chatbot|챗봇|\bllms?\b|\bgpt\b|openai|claude|gemini|langchain|\brag\b|workflow|워크플로|api\s*integration|api\s*연동|ai\s*(?:tool|app|integration|assistant)|ai\s*(?:도구|앱|연동|비서)/i,
  },
  {
    id: "data_scraping",
    label: "데이터 수집 자동화",
    categories: ["dev"],
    profile: /apify|크롤|스크래핑|scrap|데이터\s*수집|data\s*api|youtube\s*data/i,
    job: /scrap|스크래핑|크롤|crawl|apify|data\s*(?:extraction|mining|pipeline)|데이터\s*추출/i,
  },
  {
    id: "ai_eval_code",
    label: "AI 코딩 결과물 평가",
    categories: ["dev", "domain", "language"],
    profile: /코딩\s*결과(?:물)?\s*평가|코드\s*평가|ai\s*코딩|coding\s*evaluat/i,
    job: /(?:coding|code|software|programming|python|javascript|typescript|\bswe\b).{0,40}(?:trainer|evaluat|review|rlhf|specialist|annotat|tutor)|(?:trainer|evaluat|rlhf).{0,30}(?:coding|code|software|python)|코딩.{0,12}(?:평가|트레이너|전문가|검수)|코드\s*(?:평가|검수|리뷰)/i,
  },
  {
    id: "ai_eval_media",
    label: "AI 영상·이미지 결과 평가",
    categories: ["video", "design", "labeling", "domain"],
    profile: /(?:영상|이미지|비디오|video|image|생성).{0,20}(?:결과\s*)?평가/i,
    job: /(?:video|image|visual|multimodal|creative|영상|이미지|멀티모달|시각).{0,40}(?:evaluat|rater|rating|judg|평가|검수)|(?:evaluat|rater|평가).{0,30}(?:video|image|visual|영상|이미지)/i,
  },
  {
    id: "ai_eval_text",
    label: "AI 답변 평가·학습 데이터",
    categories: ["language", "labeling", "writing"],
    profile:
      /ai\s*(?:답변|응답|모델|챗봇|출력|결과)\s*(?:평가|검수|비교|작성)|\brlhf\b|ai\s*학습\s*데이터|ai\s*(?:트레이닝|트레이너|튜터)|ai\s*(?:trainer|tutor)|프롬프트\s*(?:작성|평가|엔지니어)|prompt\s*(?:writ|engineer)|llm\s*(?:평가|evaluat)/i,
    job: /\brlhf\b|\bai\s*(?:trainer|tutor|rater|evaluator)|(?:response|output|answer|chatbot|model|llm)s?\s*(?:evaluat|rating|ranking|review|quality)|prompt\s*(?:writ|engineer|creat)|preference\s*(?:data|ranking)|red[- ]?team|ai\s*(?:답변|응답|모델|챗봇)\s*(?:평가|검수)|ai\s*학습\s*데이터|ai\s*트레이너|프롬프트\s*작성/i,
  },
  // Below: kinds of work that only count for profiles that name them.
  {
    id: "logo_brand",
    label: "로고·브랜딩",
    categories: ["design"],
    profile: /로고|\blogo|브랜딩|branding|브랜드\s*아이덴티티/i,
    job: /\blogo|로고|branding|브랜딩|brand\s*identity|브랜드\s*아이덴티티/i,
  },
  {
    id: "motion",
    label: "모션그래픽·애니메이션",
    categories: ["motion_3d", "video"],
    profile: /모션|motion|애프터\s*이펙트|after\s*effects|애니메이션|animation/i,
    job: /motion\s*graphic|모션\s*그래픽|after\s*effects|애프터\s*이펙트|animat|애니메이션|kinetic|lottie/i,
  },
  {
    id: "three_d",
    label: "3D",
    categories: ["motion_3d"],
    profile: /\b3d\b|블렌더|blender|c4d|cinema\s*4d|\bmaya\b|3d\s*모델링|렌더링/i,
    job: /\b3d\b|blender|블렌더|c4d|cinema\s*4d|\bmaya\b|렌더링|rendering|unreal|\bunity\b/i,
  },
  {
    id: "photo",
    label: "사진·보정",
    categories: ["design"],
    profile: /사진|photo|보정|retouch|라이트룸|lightroom/i,
    job: /\bphoto|사진|retouch|보정|lightroom|라이트룸/i,
  },
  {
    id: "writing",
    label: "글쓰기",
    categories: ["writing"],
    profile: /글쓰기|작문|카피라이|copywrit|블로그|\bblog|기사\s*작성|article|\bwriter\b|작가/i,
    job: /\bwrit(?:e|er|ing)\b|글쓰기|copywrit|카피|\bblog|블로그|article|기사|ghostwrit|content\s*writ/i,
  },
  {
    id: "translation",
    label: "번역",
    categories: ["language", "writing"],
    profile: /번역|translat|통역|현지화|locali[sz]/i,
    job: /translat|번역|locali[sz]|현지화/i,
  },
  {
    id: "labeling",
    label: "데이터 라벨링",
    categories: ["labeling"],
    profile: /라벨링|labeling|annotation|어노테이션|데이터\s*(?:가공|작업)|태깅/i,
    job: /\blabel(?:ing|er)|라벨링|annotat|어노테이션|tagging|태깅/i,
  },
  {
    id: "language_eval",
    label: "언어 평가",
    categories: ["language"],
    profile: /언어\s*평가|원어민\s*평가|linguist|언어학|검색\s*(?:품질\s*)?평가|search\s*evaluat|ai\s*트레이너|ai\s*trainer/i,
    job: /linguist|언어\s*(?:평가|전문가)|language\s*(?:expert|specialist|evaluat)|search\s*(?:engine\s*)?evaluat|검색\s*(?:엔진\s*)?평가|ads?\s*quality|광고\s*품질|\brater\b|korean\s*(?:language|linguist|speaker|native|evaluator|expert|specialist|reviewer|annotator|data)|한국어\s*(?:평가|전문가|원어민|데이터|검수|화자)/i, // not "AI trainer": that's every kind of AI work
  },
  {
    id: "marketing",
    label: "마케팅",
    categories: ["other", "writing"],
    profile: /마케팅|marketing|\bseo\b|퍼포먼스|광고\s*운영|그로스/i,
    job: /marketing|마케팅|\bseo\b|google\s*ads|광고\s*운영|campaign|캠페인/i,
  },
  {
    id: "audio",
    label: "오디오·음악",
    categories: ["other"],
    profile: /오디오|음향|\baudio\b|사운드|\bsound\b|음악|\bmusic\b|믹싱|mixing/i,
    job: /\baudio\b|오디오|\bsound\b|사운드|음향|\bmusic\b|음악|mixing|믹싱|mastering|podcast|팟캐스트/i,
  },
  // Specialist knowledge (AI training and review for experts, consulting). See DOMAIN_CONCEPTS.
  {
    id: "law",
    label: "법률",
    categories: ["domain"],
    profile: /법률|법학|법무|변호사|법조|\blegal\b|\blaw(?:yer)?\b|paralegal|계약서\s*검토/i,
    job: /\blegal\b|\blaw\b|lawyer|attorney|paralegal|법률|법무|변호사|contract\s*review|계약서\s*검토|compliance|규정\s*준수/i,
  },
  {
    id: "medical",
    label: "의료·보건",
    categories: ["domain"],
    profile: /의료|의학|간호|약학|약사|의사|임상|보건|치위생|물리\s*치료|medical|nurs|pharma|clinical|healthcare/i,
    job: /medical|medicine|의료|의학|\bnurs|간호|pharma|약학|clinical|임상|health\s*care|healthcare|헬스케어|physician|doctor|radiolog|dental|치과|patient|환자/i,
  },
  {
    id: "finance",
    label: "회계·금융",
    categories: ["domain"],
    profile: /회계|재무|세무|금융|투자|증권|보험|accounting|financ|\btax\b|\bcpa\b|bookkeep/i,
    job: /accounting|회계|financ|재무|금융|\btax\b|세무|\bcpa\b|bookkeep|investment|투자|banking|은행|insurance|보험|actuar|equity|trading/i,
  },
  {
    id: "chemistry",
    label: "화학",
    categories: ["domain"],
    profile: /화학|chemi/i,
    job: /chemi|화학/i,
  },
  {
    id: "biology",
    label: "생명과학",
    categories: ["domain"],
    profile: /생물|생명\s*과학|생명공학|biolog|biotech|biochem|유전/i,
    job: /biolog|생물|생명\s*과학|biotech|biochem|genetic|유전|molecular|분자/i,
  },
  {
    id: "physics",
    label: "물리",
    categories: ["domain"],
    profile: /물리학|physics/i,
    job: /physics|물리학|astrophys|quantum|양자/i,
  },
  {
    id: "math",
    label: "수학·통계",
    categories: ["domain"],
    profile: /수학|통계|math|statistic|계리/i,
    job: /\bmath|수학|statistic|통계|calculus|미적분|algebra|대수|probability|확률/i,
  },
  {
    id: "teaching",
    label: "교육·튜터링",
    categories: ["domain", "language"],
    profile: /교사|교육학|강사|튜터|과외|학원|tutor|teach|교직/i,
    job: /tutor|튜터|teach|교사|강사|과외|curriculum|교육\s*과정|lesson\s*plan|수업\s*자료/i,
  },
  {
    id: "engineering",
    label: "공학",
    categories: ["domain"],
    profile: /기계\s*공학|전기|전자\s*공학|토목|건축\s*공학|화공|산업\s*공학|mechanical|electrical|civil\s*engineer/i,
    job: /mechanical\s*engineer|electrical\s*engineer|civil\s*engineer|기계\s*공학|전기\s*공학|전자\s*공학|토목|structural|circuit|회로/i,
  },
  {
    id: "psychology",
    label: "심리",
    categories: ["domain"],
    profile: /심리|psycholog|상담\s*(?:심리|사)/i,
    job: /psycholog|심리|mental\s*health|정신\s*건강|counsel/i,
  },
];

/**
 * Specialist fields. A job filed as specialist work ("domain") that names one
 * in its title goes only to people whose profile has it: a chemistry AI
 * trainer job isn't for a generalist AI evaluator.
 */
export const DOMAIN_CONCEPTS = new Set(["law", "medical", "finance", "chemistry", "biology", "physics", "math", "teaching", "engineering", "psychology"]);

/**
 * Work where the person themselves is the product (their voice, face or name).
 * Never matched by skills alone: only when the profile says the person does it.
 */
export const PERFORMER_JOB =
  /voice[- ]?over\s*(?:artist|talent|actor)|voice\s*actor|성우|더빙|dubbing|on[- ]camera|presenter|spokes(?:person|model)|ugc\s*creator|influencer|인플루언서|출연|talking\s*head|selfie|셀카|(?:video|audio)\s*recorder|자기\s*(?:촬영|녹음)|record\s*(?:yourself|your\s*voice)|모델\s*(?:모집|촬영)/i;
export const PERFORMER_PROFILE = /성우|목소리\s*녹음|보이스\s*오버|voice[- ]?over|출연|방송인|유튜버로\s*활동|인플루언서|모델\s*활동|on[- ]camera/i;

/** Kinds of work a profile's `avoid` list can rule out: avoid wording → job pattern. */
export const AVOID_RULES: { id: string; avoid: RegExp; job: RegExp }[] = [
  {
    id: "repetitive",
    avoid: /단순\s*반복|반복\s*작업|단순\s*작업|repetitive|데이터\s*입력|data\s*entry|타이핑/i,
    job: /data\s*entry|데이터\s*입력|copy[- ]?paste|복사\s*붙여|repetitive|단순\s*반복|transcri|전사|\blabel(?:ing|er)|라벨링|annotat|어노테이션|tagging|태깅|captcha|survey\s*taking|설문\s*참여|contact\s*(?:details|info)|연락처\s*(?:정보|조사)|lead\s*list|리드\s*리스트/i,
  },
  {
    id: "public_identity",
    avoid: /실명|소속|신원|얼굴|공개되는|on[- ]camera|촬영\s*출연/i,
    job: /on[- ]camera|얼굴|face\s*(?:video|recording|data)|selfie|셀카|real\s*name|실명|presenter|출연|talking\s*head|ugc\s*creator|influencer|인플루언서|spokes(?:person|model)|record\s*(?:yourself|your\s*face)|자기\s*촬영/i,
  },
  {
    id: "voice_recording",
    avoid: /음성\s*녹음|녹음|목소리/i,
    job: /voice[- ]?over|voice\s*actor|성우|더빙|dubbing|녹음|speech\s*data|audio\s*record|record\s*your\s*voice/i,
  },
  {
    id: "phone_sales",
    avoid: /전화|영업|콜드|세일즈|sales|cold\s*call|텔레마케팅/i,
    job: /cold\s*call|telemarket|sales\s*(?:rep|agent|representative)|영업|appointment\s*setting|전화\s*(?:상담|영업)|outbound\s*call/i,
  },
  {
    id: "night",
    avoid: /새벽|야간|밤샘|night\s*shift/i,
    job: /night\s*shift|야간\s*근무|overnight\s*shift|새벽\s*근무/i,
  },
];

/**
 * Rough USD value of one unit of each currency (제안값, 2026-11). Only used to
 * compare pay with the profile's minimum hourly rate and to spot tiny budgets.
 */
export const USD_PER_UNIT: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  CHF: 1.13,
  CAD: 0.72,
  AUD: 0.65,
  NZD: 0.59,
  SGD: 0.75,
  HKD: 0.128,
  JPY: 0.0067,
  KRW: 0.00072,
  CNY: 0.14,
  INR: 0.012,
  PKR: 0.0036,
  PHP: 0.017,
  IDR: 0.000063,
  MYR: 0.22,
  THB: 0.029,
  VND: 0.00004,
  AED: 0.27,
  SAR: 0.27,
  ILS: 0.27,
  TRY: 0.029,
  ZAR: 0.055,
  NGN: 0.00065,
  KES: 0.0077,
  EGP: 0.02,
  BRL: 0.18,
  MXN: 0.055,
  PLN: 0.25,
  SEK: 0.095,
  NOK: 0.093,
  DKK: 0.145,
};

/**
 * Crafts that can't be picked up on the spot. When a job's title names one the
 * profile doesn't, the job is about that craft ("3D Modeling & Python
 * Specialist" is a 3D job even if it also mentions JavaScript).
 */
export const TITLE_CRAFTS = new Set(["three_d", "motion", "logo_brand", "photo", "audio", "translation", "labeling", "language_eval"]);

/** Concepts about writing software: they only count when the job's language is one the person uses. */
export const CODE_CONCEPTS = new Set(["web_fullstack", "ai_eval_code", "automation_ai", "data_scraping"]);

/**
 * Programming languages, so a Java or Kotlin trainer job doesn't reach a
 * Next.js/TypeScript person through "AI coding evaluation". Frameworks imply
 * their language (Next.js → JavaScript/TypeScript).
 */
export const CODE_LANGUAGES: { id: string; re: RegExp }[] = [
  { id: "js", re: /javascript|typescript|\bjs\b|\bts\b|node\.?js|next\.?js|\breact\b|\bvue\b|svelte|angular|supabase|vercel|prisma|express\.?js|타입스크립트|자바스크립트/i },
  { id: "python", re: /python|파이썬|django|flask|fastapi|pandas|pytorch/i },
  { id: "java", re: /\bjava\b(?!\s*script)|spring\s*boot|자바(?!스크립트)/i },
  { id: "kotlin", re: /kotlin|코틀린/i },
  { id: "csharp", re: /c#|\.net\b|asp\.net/i },
  { id: "cpp", re: /c\+\+|\bcpp\b/i },
  { id: "go", re: /\bgolang\b|\bgo\s+(?:developer|engineer|language)/i },
  { id: "rust", re: /\brust\b/i },
  { id: "php", re: /\bphp\b|laravel|wordpress|woocommerce|워드프레스/i },
  { id: "ruby", re: /\bruby\b|\brails\b/i },
  { id: "swift", re: /\bswift\b|swiftui/i },
  { id: "scala", re: /\bscala\b/i },
];

export function codeLanguages(text: string): Set<string> {
  return new Set(CODE_LANGUAGES.filter((l) => l.re.test(text)).map((l) => l.id));
}

/** Tool names in `skills` worth looking for verbatim in a job ("Premiere", "Supabase"). */
const GENERIC_TOOL_WORDS = new Set([
  "pro",
  "code",
  "api",
  "apis",
  "data",
  "services",
  "service",
  "cognitive",
  "external",
  "adobe",
  "microsoft",
  "google",
  "llm",
  "and",
  "the",
  "app",
  "web",
  "ai",
  "db",
]);

export function toolTokens(skills: string[]): string[] {
  const out = new Set<string>();
  for (const skill of skills) {
    for (const raw of skill.split(/[^A-Za-z0-9.+#]+/)) {
      const t = raw.replace(/^\.+|\.+$/g, "").toLowerCase();
      if (t.length >= 3 && !GENERIC_TOOL_WORDS.has(t) && /[a-z]/.test(t)) out.add(t);
    }
  }
  return [...out];
}

/** A one-word term from this list says too little on its own ("design", "video"). */
const GENERIC_KEYWORDS = new Set([
  "ai", "data", "design", "designer", "content", "contents", "editing", "editor", "writing", "writer", "development", "developer",
  "marketing", "video", "videos", "english", "korean", "remote", "freelance", "freelancer", "project", "projects", "work", "online",
  "research", "support", "management", "creative", "social", "media", "web", "app", "apps", "software", "job", "jobs",
  "task", "tasks", "service", "services", "business", "consulting", "assistant", "specialist", "expert", "analysis", "review",
]);
/** Terms made only of these never describe a kind of work ("remote work", "part time job"). */
const EMPTY_WORDS = new Set(["remote", "freelance", "freelancer", "online", "work", "job", "jobs", "project", "projects", "task", "tasks", "part", "time", "full", "ai", "it", "gig", "gigs"]);
const STOP_WORDS = new Set(["and", "or", "for", "of", "the", "to", "in", "on", "with", "a", "an", "&"]);

function stem(word: string): string {
  for (const suffix of ["ations", "ation", "ings", "ing", "ers", "er", "ors", "or", "ions", "ion", "ed", "es", "s"]) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 4) return word.slice(0, -suffix.length);
  }
  return word;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Between two words of a term: punctuation or spaces, and up to two other English words. */
const SEP = "[^a-z0-9가-힣]+";
const GAP = `(?:[a-z0-9]+${SEP}){0,2}?`;

/**
 * Search terms the person's AI wrote for postings (profile.job_keywords) as
 * patterns. English words take any ending and may have up to two words
 * between them ("video editing" meets "Video Editor", "logo design" meets
 * "Logo & Brand Designer"); Korean terms must appear as written. A one-word
 * generic term is dropped: it would match almost anything.
 */
export function keywordPattern(keyword: string): RegExp | null {
  const words = keyword
    .trim()
    .toLowerCase()
    .split(/[\s\-_/&,+.()]+/)
    .filter((w) => w && !STOP_WORDS.has(w));
  if (words.length === 0 || words.join("").length < 3) return null;
  if (words.every((w) => EMPTY_WORDS.has(w))) return null;
  if (words.length === 1 && (GENERIC_KEYWORDS.has(words[0]) || (!/[가-힣]/.test(words[0]) && words[0].length < 4))) return null;
  if (words.some((w) => /[가-힣]/.test(w))) return new RegExp(words.map(escapeRegExp).join("\\s*"), "i");
  const parts = words.map((w) => `\\b${escapeRegExp(stem(w))}[a-z]*`);
  return new RegExp(parts.join(SEP + GAP), "i");
}
