/**
 * `page` sources: AI work platforms that publish their open work as public
 * pages with a sitemap and schema.org JobPosting JSON-LD (spec §7 step 5,
 * CLAUDE.md rule 11).
 *
 * - robots.txt is checked for every sitemap and page URL
 * - at least PAGE_FETCH_INTERVAL_MS between page requests, identifying User-Agent
 * - only pages not already stored are fetched; the rest are just marked seen
 */
import { robotsAllows } from "./robots";
import { canonicalUrl, parseSitemap } from "./sitemap";
import { findJobPosting, jobPostingLocation, jobPostingToText } from "./jsonld";
import type { SourcePosting } from "./types";

export type PageSite = {
  name: string;
  /** Sitemaps (or sitemap indexes) that list the work pages. */
  sitemaps: string[];
  /** Which sitemap URLs are work pages. */
  jobUrl: RegExp;
};

/** Keyed by sources.endpoint for kind = 'page'. Checked 2026-11-07 (docs/supply-check-2026-11-07.md). */
export const PAGE_SITES: Record<string, PageSite> = {
  "work.mercor.com": {
    name: "Mercor",
    sitemaps: ["https://work.mercor.com/sitemap.xml"],
    jobUrl: /^https:\/\/work\.mercor\.com\/jobs\/list_[A-Za-z0-9_-]+\/[a-z0-9-]+$/,
  },
  "www.opentrain.ai": {
    name: "OpenTrain AI",
    // English sitemap only; the per-language sitemaps list translations of the same jobs.
    sitemaps: ["https://www.opentrain.ai/sitemap-jobs.xml"],
    jobUrl: /^https:\/\/www\.opentrain\.ai\/jobs\/[a-z0-9-]+$/,
  },
  "www.oneforma.com": {
    name: "OneForma",
    sitemaps: ["https://www.oneforma.com/job-sitemap.xml"],
    jobUrl: /^https:\/\/www\.oneforma\.com\/projects\/[a-z0-9-]+$/,
  },
};

/** ≥ 1 s between requests to the same site (spec §7). */
export const PAGE_FETCH_INTERVAL_MS = 1100;
/** New pages fetched per site per run; the rest wait for the next run. */
export const PAGE_FETCH_CAP = 400;
const MAX_CHILD_SITEMAPS = 50;

export type FetchText = (url: string) => Promise<string | null>;

export class RobotsDisallowedError extends Error {}

/** robots.txt for the site; a missing file allows everything. */
export async function loadRobots(host: string, fetchText: FetchText): Promise<string> {
  return (await fetchText(`https://${host}/robots.txt`)) ?? "";
}

/** All work-page URLs (canonical) the site lists in its sitemaps and robots.txt allows. */
export async function listJobUrls(host: string, site: PageSite, robots: string, fetchText: FetchText): Promise<string[]> {
  const found = new Set<string>();
  const visit = async (sitemapUrl: string, depth: number) => {
    if (!robotsAllows(robots, sitemapUrl)) throw new RobotsDisallowedError(`robots.txt disallows ${sitemapUrl}`);
    const xml = await fetchText(sitemapUrl);
    if (!xml) return;
    const { isIndex, locs } = parseSitemap(xml);
    if (isIndex) {
      if (depth > 0) return;
      for (const child of locs.slice(0, MAX_CHILD_SITEMAPS)) {
        if (new URL(child).host === host) await visit(child, depth + 1);
      }
      return;
    }
    for (const loc of locs) {
      let url: string;
      try {
        url = canonicalUrl(loc);
      } catch {
        continue;
      }
      if (site.jobUrl.test(url) && robotsAllows(robots, url)) found.add(url);
    }
  };
  for (const s of site.sitemaps) await visit(s, 0);
  return [...found];
}

/** One work page → SourcePosting, or null if it has no JobPosting data. */
export function parseJobPage(url: string, html: string): SourcePosting | null {
  const job = findJobPosting(html);
  if (!job) return null;
  const { title, body } = jobPostingToText(job);
  if (!title) return null;
  return { external_id: url, url, title, location_raw: jobPostingLocation(job), body };
}
