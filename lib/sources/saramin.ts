/**
 * 사람인 official Open API (https://oapi.saramin.co.kr/guide/job-search).
 * Korean sites are used only through official APIs: crawling job boards'
 * listings is the case where Korean courts found database-right infringement
 * (서울고법 2016나2019365, 잡코리아 v. 사람인).
 *
 * Terms (oapi.saramin.co.kr/caution, 2026-11-07): ≤ 500 calls/day; no fees or
 * any consideration from the service's users; don't misrepresent the source.
 *
 * The API returns metadata only (no description), so the posting body is
 * assembled from the fields. Field names follow the documented sample
 * response; check them against a real response once a key is configured.
 */
import { z } from "zod";
import type { SourcePosting } from "./types";

export const SARAMIN_API = "https://oapi.saramin.co.kr/job-search";
export const SARAMIN_DAILY_CALL_LIMIT = 500;

/** Keywords searched one at a time (several words in one call are ANDed). 제안값 */
export const SARAMIN_KEYWORDS = [
  "AI",
  "인공지능",
  "데이터 라벨링",
  "라벨링",
  "학습데이터",
  "어노테이션",
  "생성형",
  "프롬프트",
  "챗GPT",
  "챗봇",
  "AI 영상",
] as const;

/**
 * Short-term engagement codes (근무형태 코드표): 2 계약직, 5 아르바이트, 6 파견직,
 * 8 위촉직, 9 프리랜서, 14 파트. Excludes 정규직, internships and 해외취업.
 */
export const SARAMIN_SHORT_TERM_JOB_TYPES = ["2", "5", "6", "8", "9", "14"] as const;
export const SARAMIN_PAGE_SIZE = 110; // documented maximum
export const SARAMIN_MAX_PAGES_PER_KEYWORD = 3;

/** Search presets by sources.endpoint. */
export const SARAMIN_PRESETS: Record<string, { keywords: readonly string[]; jobTypes: readonly string[] }> = {
  "ai-short-term": { keywords: SARAMIN_KEYWORDS, jobTypes: SARAMIN_SHORT_TERM_JOB_TYPES },
};

export function saraminSearchUrl(accessKey: string, keyword: string, jobTypes: readonly string[], page: number): string {
  const q = new URLSearchParams({
    "access-key": accessKey,
    keywords: keyword,
    job_type: jobTypes.join(","),
    count: String(SARAMIN_PAGE_SIZE),
    start: String(page),
    sort: "pd",
    fields: "posting-date,expiration-date",
  });
  return `${SARAMIN_API}?${q}`;
}

const named = z.object({ name: z.union([z.string(), z.number()]).nullish() }).nullish();
const num = z.union([z.number(), z.string()]);

const SaraminJob = z.object({
  id: num,
  url: z.string(),
  active: num.nullish(),
  company: z.object({ detail: z.object({ name: z.string().nullish() }).nullish() }).nullish(),
  position: z.object({
    title: z.string(),
    industry: named,
    location: named,
    "job-type": named,
    "job-code": named,
    "experience-level": named,
    "required-education-level": named,
  }),
  keyword: z.string().nullish(),
  salary: named,
  "posting-date": z.string().nullish(),
  "expiration-date": z.string().nullish(),
});

const SaraminResponse = z.object({
  jobs: z.object({ total: num.nullish(), job: z.array(SaraminJob).default([]) }),
});

const SaraminError = z.object({ code: num, message: z.string().nullish() });

export class SaraminApiError extends Error {
  override name = "SaraminApiError";
}

/** Strip tracking parameters so the same posting always has the same URL. */
export function canonicalSaraminUrl(url: string): string {
  const u = new URL(url.replace(/^http:/, "https:"));
  for (const k of [...u.searchParams.keys()]) if (k.startsWith("utm_")) u.searchParams.delete(k);
  return u.toString();
}

export function parseSaramin(json: unknown): { total: number; postings: SourcePosting[] } {
  const err = SaraminError.safeParse(json);
  if (err.success && !(json as { jobs?: unknown }).jobs) {
    throw new SaraminApiError(`사람인 API error ${err.data.code}: ${err.data.message ?? ""}`.trim());
  }
  const { jobs } = SaraminResponse.parse(json);
  const postings = jobs.job
    .filter((j) => j.active === undefined || j.active === null || String(j.active) === "1")
    .map((j): SourcePosting => {
      const p = j.position;
      const name = (x: { name?: string | number | null } | null | undefined) => (x?.name ? String(x.name) : null);
      const lines = [
        j.company?.detail?.name ? `회사: ${j.company.detail.name}` : null,
        name(p["job-type"]) ? `근무형태: ${name(p["job-type"])}` : null,
        name(p.location) ? `근무지: ${name(p.location)}` : null,
        name(p["experience-level"]) ? `경력: ${name(p["experience-level"])}` : null,
        name(p["required-education-level"]) ? `학력: ${name(p["required-education-level"])}` : null,
        name(j.salary) ? `급여: ${name(j.salary)}` : null,
        name(p.industry) ? `업종: ${name(p.industry)}` : null,
        name(p["job-code"]) ? `직무: ${name(p["job-code"])}` : null,
        j.keyword ? `키워드: ${j.keyword}` : null,
        j["posting-date"] ? `게시: ${j["posting-date"]}` : null,
        j["expiration-date"] ? `마감: ${j["expiration-date"]}` : null,
      ].filter(Boolean);
      return {
        external_id: String(j.id),
        url: canonicalSaraminUrl(j.url),
        title: p.title.trim(),
        // Saramin locations are Korean regions ("서울 > 관악구"), so Korea residents can apply.
        location_raw: [name(p.location), "South Korea"].filter(Boolean).join(" / "),
        body: lines.join("\n"),
      };
    });
  return { total: Number(jobs.total ?? postings.length), postings };
}
