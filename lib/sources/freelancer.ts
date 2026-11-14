/**
 * Freelancer.com public API (2026-11-14, scope C: every short-term gig where
 * AI may be used or doesn't matter). GET
 * https://www.freelancer.com/api/projects/0.1/projects/active/?query=…
 * Field names were checked against a live response on 2026-11-14.
 *
 * API terms (freelancer.com/about/apiterms): cached data must be refreshed at
 * least every 24 hours and kept only as a cache. Collection runs daily and
 * deletes projects that drop out of the listing (lib/workers/collect.ts), so
 * nothing older than the query window is kept.
 */
import { z } from "zod";
import type { SourcePosting } from "./types";

export const FREELANCER_API = "https://www.freelancer.com/api/projects/0.1/projects/active/";

export type FreelancerPreset = {
  /** Search terms; each is one request. Order = priority when the cap cuts the list. */
  queries: readonly string[];
  /** Only projects posted within this many hours (bidding is most worthwhile early). */
  windowHours: number;
  /** Results per query (API maximum is 100). */
  perQuery: number;
  /** Newest projects kept per run after filtering, to bound LLM calls (5 a minute on the free Gateway tier). */
  maxPerRun: number;
};

/** (제안값) `sources.endpoint` names a preset, so the query list lives in code and in tests. */
export const FREELANCER_PRESETS: Record<string, FreelancerPreset> = {
  gigs: {
    queries: [
      // video
      "video editing", "video production", "youtube", "thumbnail", "subtitles", "reels",
      // motion and 3D
      "motion graphics", "after effects", "animation", "3d modeling", "3d animation", "blender",
      // design and photo
      "photoshop", "photo editing", "graphic design", "illustration", "logo design", "canva", "ui design",
      // AI work
      "ai video", "ai image", "ai content", "midjourney", "prompt", "chatbot", "ai automation", "n8n", "ai agent",
      // Korean, writing, voice
      "korean", "translation", "content writing", "copywriting", "voice over",
      // building with code
      "next.js", "react", "website", "web scraping",
    ],
    windowHours: 48,
    perQuery: 50,
    maxPerRun: 150,
  },
};

/** (제안값) Below these budgets a gig isn't worth a subscriber's time. USD equivalents. */
export const MIN_FIXED_BUDGET_USD = 30;
export const MIN_HOURLY_RATE_USD = 8;

/** Adult work is never sent; the LLM also checks (adult_content). */
const ADULT = /\b(?:nsfw|adult|porn\w*|xxx|onlyfans|erotic\w*|nude|nudity|sexy|fetish|hentai|camgirl)\b/i;

const Project = z.object({
  id: z.number(),
  title: z.string(),
  seo_url: z.string().nullish(),
  description: z.string().nullish(),
  preview_description: z.string().nullish(),
  type: z.enum(["fixed", "hourly"]).nullish(),
  status: z.string().nullish(),
  local: z.boolean().nullish(),
  hireme: z.boolean().nullish(),
  nonpublic: z.boolean().nullish(),
  deleted: z.boolean().nullish(),
  language: z.string().nullish(),
  time_submitted: z.number(),
  budget: z.object({ minimum: z.number().nullish(), maximum: z.number().nullish() }).nullish(),
  currency: z.object({ code: z.string(), exchange_rate: z.number().nullish() }).nullish(),
  jobs: z.array(z.object({ name: z.string().nullish() })).nullish(),
  bid_stats: z.object({ bid_count: z.number().nullish() }).nullish(),
});
export type FreelancerProject = z.infer<typeof Project>;

const Response = z.object({ result: z.object({ projects: z.array(Project) }) });

export function freelancerUrl(query: string, preset: FreelancerPreset, now: Date): string {
  const q = new URLSearchParams({
    query,
    limit: String(preset.perQuery),
    full_description: "true",
    job_details: "true",
    from_time: String(Math.floor(now.getTime() / 1000) - preset.windowHours * 3600),
  });
  return `${FREELANCER_API}?${q.toString()}`;
}

export function parseFreelancer(json: unknown): FreelancerProject[] {
  return Response.parse(json).result.projects;
}

/** Why a project is left out before any LLM call, or null to keep it. */
export function skipReason(p: FreelancerProject): string | null {
  if (p.deleted || p.status !== "active") return "not active";
  if (p.local) return "on-site only";
  if (p.hireme || p.nonpublic) return "private";
  if (!p.seo_url) return "no link";
  if (ADULT.test(`${p.title}\n${p.description ?? ""}`)) return "adult";
  const max = p.budget?.maximum ?? p.budget?.minimum ?? null;
  const rate = p.currency?.exchange_rate ?? (p.currency?.code === "USD" ? 1 : null);
  if (max !== null && rate) {
    const usd = max * rate;
    if (p.type === "hourly" ? usd < MIN_HOURLY_RATE_USD : usd < MIN_FIXED_BUDGET_USD) return "budget too low";
  }
  return null;
}

function money(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/**
 * The text the LLM reads: budget and skills first (so pay is extracted from
 * the source's own fields), then the client's description.
 */
export function toPosting(p: FreelancerProject): SourcePosting {
  const cur = p.currency?.code ?? "USD";
  const min = p.budget?.minimum;
  const max = p.budget?.maximum;
  const range = min != null && max != null ? `${money(min)}-${money(max)}` : min != null ? money(min) : max != null ? money(max) : null;
  const budget = range ? `Budget: ${cur} ${range} ${p.type === "hourly" ? "per hour" : "for the whole project (fixed price)"}` : "Budget: not stated";
  const skills = (p.jobs ?? []).map((j) => j.name).filter(Boolean).join(", ");
  return {
    external_id: String(p.id),
    url: `https://www.freelancer.com/projects/${p.seo_url}`,
    title: p.title.trim(),
    location_raw: "Worldwide (Freelancer.com, remote bidding)",
    body: [
      "Freelancer.com project open to bids from freelancers worldwide.",
      budget,
      skills ? `Skills: ${skills}` : null,
      "",
      (p.description ?? p.preview_description ?? "").trim(),
    ]
      .filter((l) => l !== null)
      .join("\n"),
  };
}

/** Merge per-query results: unique, kept, newest first, capped. */
export function selectProjects(lists: FreelancerProject[][], cap: number): { kept: FreelancerProject[]; skipped: Record<string, number> } {
  const byId = new Map<number, FreelancerProject>();
  for (const list of lists) for (const p of list) if (!byId.has(p.id)) byId.set(p.id, p);
  const skipped: Record<string, number> = {};
  const kept: FreelancerProject[] = [];
  for (const p of byId.values()) {
    const why = skipReason(p);
    if (why) skipped[why] = (skipped[why] ?? 0) + 1;
    else kept.push(p);
  }
  kept.sort((a, b) => b.time_submitted - a.time_submitted);
  if (kept.length > cap) skipped["over the per-run cap"] = kept.length - cap;
  return { kept: kept.slice(0, cap), skipped };
}
