/**
 * Source adapters. Each turns one public job-board API response into
 * SourcePosting[]. Field names were checked against live responses on
 * 2026-11-07 (spec §7: "실제 응답으로 확인해 어댑터에 고정").
 */
import { z } from "zod";
import { escapedHtmlToText, htmlToText } from "./text";
import { SLUG_PATTERN, type FetchableKind, type SourcePosting } from "./types";

const str = z.string().nullish();
const joinLocations = (parts: (string | null | undefined)[]) => {
  const seen = new Set<string>();
  for (const p of parts) {
    const s = p?.trim();
    if (s) seen.add(s);
  }
  return seen.size ? [...seen].join(" / ") : null;
};

// ── Greenhouse: GET https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true
const GreenhouseResponse = z.object({
  jobs: z.array(
    z.object({
      id: z.union([z.number(), z.string()]),
      title: z.string(),
      absolute_url: z.string(),
      location: z.object({ name: str }).nullish(),
      content: str, // HTML-escaped HTML
    }),
  ),
});

export function parseGreenhouse(json: unknown): SourcePosting[] {
  return GreenhouseResponse.parse(json).jobs.map((j) => ({
    external_id: String(j.id),
    url: j.absolute_url,
    title: j.title.trim(),
    location_raw: joinLocations([j.location?.name]),
    body: escapedHtmlToText(j.content),
  }));
}

// ── Lever: GET https://api.lever.co/v0/postings/{company}?mode=json
const LeverResponse = z.array(
  z.object({
    id: z.string(),
    text: z.string(),
    hostedUrl: z.string(),
    categories: z
      .object({ location: str, allLocations: z.array(z.string()).nullish(), commitment: str })
      .nullish(),
    country: str,
    workplaceType: str,
    descriptionPlain: str,
    description: str,
    lists: z.array(z.object({ text: str, content: str })).nullish(),
    additionalPlain: str,
  }),
);

export function parseLever(json: unknown): SourcePosting[] {
  return LeverResponse.parse(json).map((j) => {
    const lists = (j.lists ?? []).map((l) => [l.text?.trim(), htmlToText(l.content)].filter(Boolean).join("\n"));
    const body = [j.descriptionPlain?.trim() || htmlToText(j.description), ...lists, j.additionalPlain?.trim()]
      .filter(Boolean)
      .join("\n\n");
    return {
      external_id: j.id,
      url: j.hostedUrl,
      title: j.text.trim(),
      location_raw: joinLocations([
        ...(j.categories?.allLocations ?? []),
        j.categories?.location,
        j.country,
        j.workplaceType && j.workplaceType !== "unspecified" ? j.workplaceType : null,
      ]),
      body,
    };
  });
}

// ── Ashby: GET https://api.ashbyhq.com/posting-api/job-board/{board}
const AshbyResponse = z.object({
  jobs: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      location: str,
      secondaryLocations: z.array(z.object({ location: str })).nullish(),
      isRemote: z.boolean().nullish(),
      isListed: z.boolean().nullish(),
      jobUrl: z.string(),
      descriptionPlain: str,
      descriptionHtml: str,
    }),
  ),
});

export function parseAshby(json: unknown): SourcePosting[] {
  return AshbyResponse.parse(json)
    .jobs.filter((j) => j.isListed !== false)
    .map((j) => ({
      external_id: j.id,
      url: j.jobUrl,
      title: j.title.trim(),
      location_raw: joinLocations([
        j.location,
        ...(j.secondaryLocations ?? []).map((s) => s.location),
        j.isRemote ? "Remote" : null,
      ]),
      body: j.descriptionPlain?.trim() || htmlToText(j.descriptionHtml),
    }));
}

// ── Recruitee: GET https://{company}.recruitee.com/api/offers/
const RecruiteeResponse = z.object({
  offers: z.array(
    z.object({
      id: z.union([z.number(), z.string()]),
      title: z.string(),
      careers_url: z.string(),
      location: str,
      country: str,
      country_code: str,
      remote: z.boolean().nullish(),
      status: str,
      description: str,
      requirements: str,
    }),
  ),
});

export function parseRecruitee(json: unknown): SourcePosting[] {
  return RecruiteeResponse.parse(json)
    .offers.filter((o) => !o.status || o.status === "published")
    .map((o) => ({
      external_id: String(o.id),
      url: o.careers_url,
      title: o.title.trim(),
      location_raw: joinLocations([o.location, o.country, o.country_code, o.remote ? "Remote" : null]),
      body: [htmlToText(o.description), htmlToText(o.requirements)].filter(Boolean).join("\n\n"),
    }));
}

const ADAPTERS: Record<FetchableKind, { url: (slug: string) => string; parse: (json: unknown) => SourcePosting[] }> = {
  greenhouse: {
    url: (s) => `https://boards-api.greenhouse.io/v1/boards/${s}/jobs?content=true`,
    parse: parseGreenhouse,
  },
  lever: { url: (s) => `https://api.lever.co/v0/postings/${s}?mode=json`, parse: parseLever },
  ashby: { url: (s) => `https://api.ashbyhq.com/posting-api/job-board/${s}`, parse: parseAshby },
  recruitee: { url: (s) => `https://${s}.recruitee.com/api/offers/`, parse: parseRecruitee },
};

export function sourceUrl(kind: FetchableKind, endpoint: string): string {
  if (!SLUG_PATTERN.test(endpoint)) throw new Error(`Invalid ${kind} endpoint: ${endpoint}`);
  return ADAPTERS[kind].url(endpoint);
}

export function parseSource(kind: FetchableKind, json: unknown): SourcePosting[] {
  // Drop entries without a usable http(s) link; they can't be shown or deduplicated.
  return ADAPTERS[kind].parse(json).filter((p) => /^https?:\/\//.test(p.url) && p.title !== "");
}
