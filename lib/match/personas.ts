/**
 * Made-up subscribers of different kinds, written the way a user's AI fills
 * prompts/profile-extract.md. Used to check that every kind of person gets
 * mail as closely fitted as the first users' (2026-11-14 user decision), in
 * unit tests and in the production dry run /api/cron/picks-personas.
 * Nothing here is a real person.
 */
import { ProfileSchema, type Profile } from "../profile/parse";

export type Persona = { id: string; label: string; profile: Profile };

const raw: { id: string; label: string; profile: Record<string, unknown> }[] = [
  {
    id: "translator",
    label: "영→한 번역가",
    profile: {
      languages: [
        { code: "ko", level: "native" },
        { code: "en", level: "business" },
      ],
      fields: ["영→한 번역", "한국어 현지화 검수", "한국어 AI 답변 평가"],
      skills: ["Trados", "MemoQ", "Google Sheets"],
      domain_expertise: ["IT·게임"],
      experience_summary_ko: "게임·IT 회사에서 5년간 영→한 번역과 현지화 검수를 했어요. 용어집 관리와 QA 체크리스트 작성에 익숙해요.",
      job_keywords: ["english to korean translation", "korean localization", "korean proofreading", "game localization", "korean linguist", "korean ai evaluation"],
      portfolio_ko: ["번역 샘플 3종(게임·IT·마케팅)"],
      weekly_hours: 15,
      preferred_time: "evening",
      min_hourly_usd: 15,
      avoid: ["음성 녹음", "전화 영업"],
      notes_ko: "한국어 현지화·번역 검수 일을 먼저 추천. 게임 용어 경험이 강점이에요.",
    },
  },
  {
    id: "designer",
    label: "로고·SNS 디자이너",
    profile: {
      languages: [
        { code: "ko", level: "native" },
        { code: "en", level: "reading" },
      ],
      fields: ["로고 디자인", "SNS 카드뉴스·배너 디자인", "상세페이지 디자인"],
      skills: ["Adobe Illustrator", "Photoshop", "Figma", "Canva"],
      experience_summary_ko: "소상공인 로고와 인스타그램 카드뉴스를 3년간 외주로 만들었어요.",
      job_keywords: ["logo design", "brand identity", "social media graphics", "banner design", "flyer design", "packaging design", "canva templates"],
      portfolio_ko: ["비핸스 로고 포트폴리오", "카드뉴스 작업 모음 PDF"],
      weekly_hours: 20,
      preferred_time: "daytime",
      min_hourly_usd: null,
      avoid: ["단순 반복 작업"],
      notes_ko: "로고·브랜딩 일을 먼저 추천.",
    },
  },
  {
    id: "python_dev",
    label: "파이썬 자동화 개발자",
    profile: {
      languages: [
        { code: "ko", level: "native" },
        { code: "en", level: "conversational" },
      ],
      fields: ["Python 데이터 스크래핑", "업무 자동화 스크립트", "웹사이트 버그 수정"],
      skills: ["Python", "Selenium", "Pandas", "Django", "n8n"],
      experience_summary_ko: "사내 데이터팀에서 크롤러와 리포트 자동화를 만들었어요. 개인적으로 n8n 워크플로를 운영해요.",
      job_keywords: ["python web scraping", "data extraction", "automation script", "selenium bot", "django bug fix", "n8n workflow", "google sheets automation"],
      portfolio_ko: ["깃허브 스크래퍼 저장소", "n8n 자동화 데모 영상"],
      weekly_hours: 12,
      preferred_time: "night",
      min_hourly_usd: 20,
      avoid: ["전화 영업"],
      notes_ko: "스크래핑·자동화 일을 먼저 추천.",
    },
  },
  {
    id: "nurse",
    label: "간호사(의료 AI 평가)",
    profile: {
      languages: [
        { code: "ko", level: "native" },
        { code: "en", level: "business" },
      ],
      fields: ["간호 지식 기반 의료 AI 답변 평가", "의료 문서 영→한 번역"],
      skills: ["EMR", "Excel"],
      domain_expertise: ["간호학", "임상 간호"],
      experience_summary_ko: "종합병원 병동 간호사로 7년 일했어요. 의학 영어 문서를 읽고 정리하는 일이 익숙해요.",
      job_keywords: ["medical ai evaluation", "nursing expert", "healthcare ai trainer", "clinical annotation", "medical translation"],
      portfolio_ko: [],
      weekly_hours: 10,
      preferred_time: "any",
      min_hourly_usd: 25,
      avoid: ["얼굴 촬영"],
      notes_ko: "의료·간호 전문 AI 평가 일을 먼저 추천.",
    },
  },
  {
    id: "ko_ai_worker",
    label: "한국어 AI 데이터 작업자",
    profile: {
      languages: [
        { code: "ko", level: "native" },
        { code: "en", level: "reading" },
      ],
      fields: ["한국어 AI 답변 평가", "한국어 데이터 라벨링", "한국어 검색 품질 평가"],
      skills: ["Google Sheets"],
      experience_summary_ko: "온라인 설문·데이터 검수 부업을 2년 했어요.",
      job_keywords: ["korean ai evaluation", "korean data annotation", "korean rater", "korean search evaluation"],
      portfolio_ko: [],
      weekly_hours: 15,
      preferred_time: "any",
      min_hourly_usd: null,
      avoid: [],
      notes_ko: "한국어로 하는 AI 평가·라벨링 일을 추천.",
    },
  },
  {
    id: "copywriter",
    label: "카피라이터·블로거",
    profile: {
      languages: [
        { code: "ko", level: "native" },
        { code: "en", level: "business" },
      ],
      fields: ["블로그·SEO 글쓰기", "광고 카피라이팅", "인스타그램 콘텐츠 기획"],
      skills: ["Notion", "WordPress", "Canva"],
      experience_summary_ko: "마케팅 에이전시에서 블로그 원고와 광고 카피를 4년 썼어요.",
      job_keywords: ["blog writing", "seo content writing", "copywriting", "social media content", "product description writing"],
      portfolio_ko: ["개인 블로그(여행·IT)", "광고 카피 샘플 모음"],
      weekly_hours: 15,
      preferred_time: "daytime",
      min_hourly_usd: null,
      avoid: ["전화 영업"],
      notes_ko: "영어 블로그·카피 일을 먼저 추천.",
    },
  },
  {
    id: "3d_artist",
    label: "3D·모션 아티스트",
    profile: {
      languages: [
        { code: "ko", level: "native" },
        { code: "en", level: "reading" },
      ],
      fields: ["3D 제품 모델링·렌더링", "모션그래픽"],
      skills: ["Blender", "After Effects", "Cinema 4D"],
      experience_summary_ko: "제품 렌더링과 짧은 광고 모션을 프리랜서로 2년 만들었어요.",
      job_keywords: ["3d product rendering", "blender modeling", "3d animation", "motion graphics", "product visualization"],
      portfolio_ko: ["아트스테이션 제품 렌더 모음"],
      weekly_hours: 20,
      preferred_time: "night",
      min_hourly_usd: null,
      avoid: [],
      notes_ko: "제품 3D 렌더링 일을 먼저 추천.",
    },
  },
  {
    id: "nurse_builder",
    label: "AI로 웹앱 만드는 간호사",
    profile: {
      languages: [
        { code: "ko", level: "native" },
        { code: "en", level: "conversational" },
      ],
      fields: ["Claude Code로 만드는 웹앱·랜딩 페이지 개발", "간호 지식 기반 의료 AI 답변 평가"],
      skills: ["Claude Code", "Supabase", "Vercel"],
      domain_expertise: ["간호학"],
      experience_summary_ko: "병원 간호사로 일하면서 퇴근 후 Claude Code로 웹앱을 만들며 개발을 공부하고 있어요. 병동 업무용 체크리스트 앱을 직접 만들었어요.",
      job_keywords: ["web app development", "landing page", "website build", "medical ai evaluation", "healthcare website"],
      portfolio_ko: ["직접 만든 병동 체크리스트 웹앱"],
      weekly_hours: 10,
      preferred_time: "evening",
      min_hourly_usd: null,
      avoid: ["얼굴 촬영"],
      notes_ko: "AI로 만드는 웹앱·랜딩 페이지 일을 먼저 추천. 의료 쪽이면 더 좋아요.",
    },
  },
  {
    id: "ai_motion",
    label: "Claude Code로 모션그래픽 만드는 사람",
    profile: {
      languages: [
        { code: "ko", level: "native" },
        { code: "en", level: "reading" },
      ],
      fields: ["Claude Code로 만드는 모션그래픽 영상", "AI 영상 편집"],
      skills: ["Claude Code", "Remotion", "CapCut"],
      experience_summary_ko: "디자인 전공은 아니지만 Claude Code와 Remotion으로 코드 기반 모션그래픽과 설명 애니메이션을 만들어 왔어요.",
      job_keywords: ["motion graphics", "animated explainer", "kinetic typography", "remotion", "text animation"],
      portfolio_ko: ["Remotion으로 만든 설명 애니메이션 3편"],
      weekly_hours: 15,
      preferred_time: "night",
      min_hourly_usd: null,
      avoid: [],
      notes_ko: "모션그래픽·설명 애니메이션 일을 먼저 추천.",
    },
  },
  {
    id: "accountant",
    label: "회계사(금융 AI 평가)",
    profile: {
      languages: [
        { code: "ko", level: "native" },
        { code: "en", level: "business" },
      ],
      fields: ["회계·재무 전문 AI 답변 평가", "엑셀 재무 모델링"],
      skills: ["Excel", "QuickBooks"],
      domain_expertise: ["회계", "세무"],
      experience_summary_ko: "회계법인에서 감사와 세무 조정을 6년 했어요.",
      job_keywords: ["accounting ai trainer", "finance expert", "excel financial model", "bookkeeping", "tax expert"],
      portfolio_ko: [],
      weekly_hours: 8,
      preferred_time: "evening",
      min_hourly_usd: 30,
      avoid: ["전화 영업"],
      notes_ko: "회계·재무 전문 AI 평가 일을 먼저 추천.",
    },
  },
];

export const PERSONAS: Persona[] = raw.map((p) => ({ id: p.id, label: p.label, profile: ProfileSchema.parse(p.profile) }));
