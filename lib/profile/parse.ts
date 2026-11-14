/**
 * 사용자가 자기 AI(ChatGPT·Claude·Gemini)에서 받아 붙여넣은 답변에서
 * 프로필 블록을 꺼내 검증한다.
 *
 * 원칙
 * - 붙여넣은 원문은 저장하지 않는다. 이 모듈이 돌려주는 Profile만 저장한다.
 * - 원문은 데이터다. LLM 프롬프트에 넣지 않는다.
 * - 정해진 필드 밖의 값은 버리고, 길이·개수를 자른다.
 */
import { z } from "zod";

export const PROFILE_START = "<<AIJOB5_PROFILE_V1>>";
export const PROFILE_END = "<<END_AIJOB5_PROFILE>>";
export const MAX_INPUT_CHARS = 20_000;

export const ENGLISH_LEVELS = ["none", "reading", "conversational", "business", "native"] as const;
export type EnglishLevel = (typeof ENGLISH_LEVELS)[number];

export const PREFERRED_TIMES = ["morning", "daytime", "evening", "night", "any"] as const;
export type PreferredTime = (typeof PREFERRED_TIMES)[number];

/** 프롬프트 템플릿의 자리표시자. AI가 그대로 두면 빈 값으로 본다. */
const PLACEHOLDERS = new Set([
  "관심·경험 분야, 최대 5개",
  "다룰 수 있는 도구·기술, 최대 10개",
  "전문 지식 분야, 없으면 빈 배열",
  "경력 요약 2~3문장, 회사 이름 없이",
  "하기 싫은 일 유형, 예: 음성 녹음, 얼굴 촬영",
  "공고에서 나를 찾을 검색어 8~15개",
  "지원할 때 보여줄 수 있는 내 작업물, 최대 5개",
  // Simplified prompt (2026-11-14); the lines above stay for copies of the older prompt.
  "돈 받고 할 수 있는 일, 잘하는 순서로 최대 5개",
  "써 본 도구·기술, AI 도구 포함 최대 10개",
  "깊이 아는 전문 분야, 없으면 빈 배열",
  "실제로 해 온 일 2~3문장",
  "해외 공고 검색어 8~15개, 영어 2~3단어",
  "보여줄 수 있는 개인 작업물·채널·앱, 최대 5개",
  "하기 싫은 일, 예: 음성 녹음, 얼굴 촬영",
  "덕잡이 먼저 추천하면 좋을 일과 이유 1~2문장",
]);

/** 템플릿을 그대로 붙여넣었는지 판별하는 표지 */
const TEMPLATE_SIGNATURE = "none|reading|conversational|business|native";

// ─────────────────────────────────────────────
// 필드 정제기
// ─────────────────────────────────────────────

function cleanText(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  const s = v
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!s || PLACEHOLDERS.has(s)) return "";
  return s.slice(0, max);
}

const textField = (max: number) => z.unknown().optional().transform((v) => cleanText(v, max));

const listField = (maxItems: number, maxLen = 60) =>
  z.unknown().optional().transform((v): string[] => {
    if (!Array.isArray(v)) return [];
    const out: string[] = [];
    for (const item of v) {
      const s = cleanText(item, maxLen);
      if (s && !out.includes(s)) out.push(s);
      if (out.length >= maxItems) break;
    }
    return out;
  });

function pickEnum<T extends readonly string[]>(values: T, v: unknown): T[number] | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  return (values as readonly string[]).includes(s) ? (s as T[number]) : null;
}

const numberField = (min: number, max: number) =>
  z.unknown().optional().transform((v): number | null => {
    const n =
      typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : Number.NaN;
    if (!Number.isFinite(n) || n < min || n > max) return null;
    return Math.round(n * 100) / 100;
  });

const languagesField = z.unknown().optional().transform((v) => {
  const out: { code: string; level: EnglishLevel | null }[] = [];
  if (!Array.isArray(v)) return out;
  for (const item of v) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const code = cleanText(rec.code, 5).toLowerCase();
    if (!/^[a-z]{2,3}$/.test(code) || out.some((l) => l.code === code)) continue;
    out.push({ code, level: pickEnum(ENGLISH_LEVELS, rec.level) });
    if (out.length >= 5) break;
  }
  return out;
});

export const ProfileSchema = z.object({
  version: z.unknown().optional().transform(() => 1 as const),
  country: z.unknown().optional().transform((v) => {
    const s = cleanText(v, 2).toUpperCase();
    return /^[A-Z]{2}$/.test(s) ? s : "KR";
  }),
  languages: languagesField,
  fields: listField(5),
  skills: listField(10),
  domain_expertise: listField(5),
  experience_summary_ko: textField(300),
  weekly_hours: numberField(1, 80),
  preferred_time: z.unknown().optional().transform((v) => pickEnum(PREFERRED_TIMES, v)),
  min_hourly_usd: numberField(1, 500),
  has_desktop: z.unknown().optional().transform((v) => (typeof v === "boolean" ? v : null)),
  avoid: listField(10),
  notes_ko: textField(300),
  /** Search terms for postings, mostly English (postings are), most important first. Added 2026-11-14. */
  job_keywords: listField(15, 40),
  /** Personal work the person can attach when applying (no in-house material). Added 2026-11-14. */
  portfolio_ko: listField(5, 80),
});

export type Profile = z.output<typeof ProfileSchema>;

/** 매칭 품질에 꼭 필요한데 비어 있는 항목. 확인 화면에서 사용자에게 채우게 한다. */
export type MissingField = "english_level" | "fields" | "weekly_hours";

export type ParseError = "EMPTY" | "TOO_LARGE" | "NO_BLOCK" | "INVALID_JSON" | "TEMPLATE_ONLY";

export type ParseResult =
  | { ok: true; profile: Profile; missing: MissingField[] }
  | { ok: false; error: ParseError };

/** UI에 그대로 보여줄 한국어 오류 문구 */
export const PARSE_ERROR_MESSAGES_KO: Record<ParseError, string> = {
  EMPTY: "붙여넣은 내용이 비어 있어요.",
  TOO_LARGE: "내용이 너무 길어요. AI 답변만 붙여넣어 주세요.",
  NO_BLOCK: "프로필 블록을 찾지 못했어요. AI 답변 전체를 그대로 붙여넣어 주세요.",
  INVALID_JSON: "프로필 형식이 깨져 있어요. AI에게 \"블록 형식 그대로 다시 출력해줘\"라고 요청해 주세요.",
  TEMPLATE_ONLY: "AI 답변이 아니라 프롬프트를 붙여넣은 것 같아요. AI가 답한 내용을 붙여넣어 주세요.",
};

// ─────────────────────────────────────────────
// 추출
// ─────────────────────────────────────────────

function stripFences(s: string): string {
  return s
    .trim()
    .replace(/^```[a-zA-Z]*\s*/, "")
    .replace(/```\s*$/, "")
    .trim();
}

function braceSlice(s: string): string | null {
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  return first !== -1 && last > first ? s.slice(first, last + 1) : null;
}

/** 붙여넣은 텍스트에서 JSON 문자열을 꺼낸다. 마지막 블록을 우선한다. */
export function extractProfileJson(text: string): string | null {
  const start = text.lastIndexOf(PROFILE_START);
  if (start !== -1) {
    const after = text.slice(start + PROFILE_START.length);
    const end = after.indexOf(PROFILE_END);
    const region = stripFences(end === -1 ? after : after.slice(0, end));
    return braceSlice(region);
  }
  // 표식 없이 JSON만 붙여넣은 경우
  const candidate = braceSlice(stripFences(text));
  if (candidate && /"(version|languages|fields)"\s*:/.test(candidate)) return candidate;
  return null;
}

function parseLenient(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    // 흔한 손상만 복구: 둥근 따옴표, 끝 쉼표
    const repaired = json
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(repaired); // 실패하면 호출부에서 INVALID_JSON
  }
}

export function parseProfileText(input: string): ParseResult {
  const text = (input ?? "").trim();
  if (!text) return { ok: false, error: "EMPTY" };
  if (text.length > MAX_INPUT_CHARS) return { ok: false, error: "TOO_LARGE" };

  const json = extractProfileJson(text);
  if (!json) return { ok: false, error: "NO_BLOCK" };
  if (json.includes(TEMPLATE_SIGNATURE)) return { ok: false, error: "TEMPLATE_ONLY" };

  let raw: unknown;
  try {
    raw = parseLenient(json);
  } catch {
    return { ok: false, error: "INVALID_JSON" };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "INVALID_JSON" };
  }

  const profile = ProfileSchema.parse(raw);
  return { ok: true, profile, missing: missingFields(profile) };
}

// ─────────────────────────────────────────────
// 저장·매칭 도우미
// ─────────────────────────────────────────────

export function englishLevelOf(p: Profile): EnglishLevel | null {
  return p.languages.find((l) => l.code === "en")?.level ?? null;
}

export function missingFields(p: Profile): MissingField[] {
  const missing: MissingField[] = [];
  if (!englishLevelOf(p)) missing.push("english_level");
  if (p.fields.length + p.domain_expertise.length + p.skills.length === 0) missing.push("fields");
  if (p.weekly_hours === null) missing.push("weekly_hours");
  return missing;
}

/** profiles 테이블 컬럼으로 펼친다. */
export function toProfileColumns(p: Profile) {
  const fields = [...new Set([...p.fields, ...p.domain_expertise])];
  return {
    profile_json: p,
    english_level: englishLevelOf(p),
    fields,
    skills: p.skills,
    avoid: p.avoid,
    weekly_hours: p.weekly_hours,
    min_hourly_usd: p.min_hourly_usd,
    has_desktop: p.has_desktop,
  };
}

/** 임베딩 입력 텍스트. 공고 쪽(lib/match.ts의 jobEmbeddingText)과 같은 틀을 쓴다. */
export function profileEmbeddingText(p: Profile): string {
  const langs = p.languages.map((l) => `${l.code}(${l.level ?? "unknown"})`).join(", ");
  return [
    `languages: ${langs}`,
    `fields: ${p.fields.join(", ")}`,
    `domain: ${p.domain_expertise.join(", ")}`,
    `skills: ${p.skills.join(", ")}`,
    `experience: ${p.experience_summary_ko}`,
  ].join("\n");
}
