/**
 * Remote job boards that list many named companies (2026-11-14 supply check,
 * docs/supply-check-2026-11-14.md): every posting names the hiring company,
 * which Freelancer.com's anonymous clients don't (직업안정법 시행령 제28조).
 *
 * - Jobicy: https://jobicy.com/api/v2/remote-jobs. Terms (API notice): credit
 *   Jobicy with a direct link, apply buttons go to the feed's own job URL, at
 *   most one call an hour. We call once a day.
 * - Himalayas: https://himalayas.app/jobs/api/search. Terms §113: commercial
 *   use allowed; apply through `applicationLink`, credit the source, show only
 *   in our own service, drop expired jobs. A free key (HIMALAYAS_API_KEY)
 *   lifts the rate limit; without it the listing can't be read completely, so
 *   the source waits for the key (see lib/workers/collect.ts).
 *
 * Field names were checked against live responses on 2026-11-14.
 */
import { z } from "zod";
import { htmlToText } from "./text";
import type { SourcePosting } from "./types";

export const AGGREGATOR_KINDS = ["jobicy", "himalayas"] as const;
export type AggregatorKind = (typeof AGGREGATOR_KINDS)[number];
export function isAggregatorKind(kind: string): kind is AggregatorKind {
  return (AGGREGATOR_KINDS as readonly string[]).includes(kind);
}

/** What a fetch returns: the postings, and whether that is the whole listing (only then may missing ones be closed). */
export type Listing = { posts: SourcePosting[]; complete: boolean };

// ── shared ─────────────────────────────────────────────────────────────

/** Short-term work only; open-ended full-time and internships are out of scope. */
const SHORT_TERM = /contract|part[\s-]?time|freelance|temporary/i;

/** "Company: …" is the first line of every aggregator body; the job's company comes from it, not the board's name. */
export function companyFromBody(body: string | null | undefined): string | null {
  const m = /^Company: (.+)$/m.exec(body ?? "");
  return m ? m[1].trim() : null;
}

function payLine(min: number | null | undefined, max: number | null | undefined, currency: string | null | undefined, period: string | null | undefined): string | null {
  if (min == null && max == null) return null;
  const range = min != null && max != null && min !== max ? `${min}-${max}` : String(min ?? max);
  const per = period ? ` per ${period.replace(/ly$/, "").replace(/^dai$/, "day")}` : "";
  return `Pay: ${currency ?? ""} ${range}${per}`.replace(/\s+/g, " ").trim();
}

/**
 * Companies we already collect straight from their own hiring board
 * (Welo, TransPerfect, Invisible…): the boards re-list them, so those copies
 * are skipped. Keyed by the first word of the name.
 */
export function coveredCompanyKeys(sourceNames: string[]): Set<string> {
  const keys = new Set<string>();
  for (const name of sourceNames) {
    const k = firstWord(name);
    if (k && k.length >= 3) keys.add(k);
  }
  return keys;
}

function firstWord(s: string): string {
  return (s.toLowerCase().match(/[a-z0-9가-힣]+/) ?? [""])[0];
}

export function isCovered(company: string, keys: Set<string>): boolean {
  return keys.has(firstWord(company));
}

// ── Jobicy ─────────────────────────────────────────────────────────────

/** One request returns up to this many jobs; a full page may mean more exist. */
export const JOBICY_COUNT = 100;

export function jobicyUrl(geo: string): string {
  return `https://jobicy.com/api/v2/remote-jobs?count=${JOBICY_COUNT}&geo=${encodeURIComponent(geo)}`;
}

const JobicyJob = z.object({
  id: z.number(),
  url: z.string(),
  jobTitle: z.string(),
  companyName: z.string(),
  jobGeo: z.string().nullish(),
  jobType: z.array(z.string()).nullish(),
  jobDescription: z.string().nullish(),
  jobExcerpt: z.string().nullish(),
  salaryMin: z.number().nullish(),
  salaryMax: z.number().nullish(),
  salaryCurrency: z.string().nullish(),
  salaryPeriod: z.string().nullish(),
});
type JobicyJob = z.infer<typeof JobicyJob>;

export function parseJobicy(json: unknown): JobicyJob[] {
  return z.object({ jobs: z.array(JobicyJob) }).parse(json).jobs;
}

export function jobicyListing(jobs: JobicyJob[], covered: Set<string>): Listing {
  const posts = jobs
    .filter((j) => SHORT_TERM.test((j.jobType ?? []).join(" ")) && !isCovered(j.companyName, covered))
    .map(
      (j): SourcePosting => ({
        external_id: String(j.id),
        url: j.url,
        title: j.jobTitle.trim(),
        location_raw: j.jobGeo?.replace(/\s+/g, " ").trim() || null,
        body: [
          `Company: ${j.companyName.trim()}`,
          `Type: ${(j.jobType ?? []).join(", ")}`,
          j.jobGeo ? `Location: ${j.jobGeo.replace(/\s+/g, " ").trim()}` : null,
          payLine(j.salaryMin, j.salaryMax, j.salaryCurrency, j.salaryPeriod),
          "",
          htmlToText(j.jobDescription ?? j.jobExcerpt ?? ""),
        ]
          .filter((l) => l !== null)
          .join("\n"),
      }),
    );
  return { posts, complete: jobs.length < JOBICY_COUNT };
}

// ── Himalayas ──────────────────────────────────────────────────────────

/** Employment types asked for, in order. */
export const HIMALAYAS_TYPES = ["Contractor", "Part Time", "Temporary"] as const;
/** (제안값) Pages per type per run (20 jobs a page). If a type has more, the run is partial and nothing is closed. */
export const HIMALAYAS_MAX_PAGES = 40;
/** Between requests (a key allows 60 a minute). */
export const HIMALAYAS_INTERVAL_MS = 1_100;

export function himalayasUrl(country: string, type: string, page: number): string {
  const q = new URLSearchParams({ country, employment_type: type, page: String(page) });
  return `https://himalayas.app/jobs/api/search?${q.toString()}`;
}

const HimalayasJob = z.object({
  guid: z.string(),
  title: z.string(),
  companyName: z.string(),
  applicationLink: z.string(),
  employmentType: z.string().nullish(),
  locationRestrictions: z.array(z.string()).nullish(),
  description: z.string().nullish(),
  excerpt: z.string().nullish(),
  minSalary: z.number().nullish(),
  maxSalary: z.number().nullish(),
  currency: z.string().nullish(),
  salaryPeriod: z.string().nullish(),
  expiryDate: z.number().nullish(),
});
type HimalayasJob = z.infer<typeof HimalayasJob>;

export function parseHimalayas(json: unknown): HimalayasJob[] {
  return z.object({ jobs: z.array(HimalayasJob) }).parse(json).jobs;
}

/** No listed restriction isn't the same as "worldwide": the text may still say "U.S. based", so the extraction decides. */
export const HIMALAYAS_NO_RESTRICTION = "Remote (no location restriction listed)";

export function himalayasListing(pages: HimalayasJob[][], covered: Set<string>, complete: boolean, now: Date): Listing {
  const byGuid = new Map<string, HimalayasJob>();
  for (const page of pages) for (const j of page) if (!byGuid.has(j.guid)) byGuid.set(j.guid, j);
  const nowSec = now.getTime() / 1000;
  const posts = [...byGuid.values()]
    .filter((j) => !(j.expiryDate && j.expiryDate < nowSec) && !isCovered(j.companyName, covered))
    .map((j): SourcePosting => {
      const where = (j.locationRestrictions ?? []).map((l) => l.trim()).filter(Boolean);
      return {
        external_id: j.guid,
        url: j.applicationLink,
        title: j.title.trim(),
        location_raw: where.length ? where.join(" / ") : HIMALAYAS_NO_RESTRICTION,
        body: [
          `Company: ${j.companyName.trim()}`,
          j.employmentType ? `Type: ${j.employmentType}` : null,
          `Location: ${where.length ? where.join(", ") : "no restriction listed"}`,
          payLine(j.minSalary, j.maxSalary, j.currency, j.salaryPeriod),
          "",
          htmlToText(j.description ?? j.excerpt ?? ""),
        ]
          .filter((l) => l !== null)
          .join("\n"),
      };
    });
  return { posts, complete };
}
