/**
 * Collect postings from every active source into raw_postings (spec §7).
 * The same job runs daily from Vercel Cron (/api/cron/collect).
 *
 *   npm run collect                       # all active sources in the DB
 *   npm run collect -- --source rws       # one source (name or endpoint)
 *   npm run collect -- --dry-run          # no DB: fetch the seed list and report what would be stored
 */
import { parseArgs } from "node:util";
import { createServiceClient } from "../lib/supabase/service";
import { appEnv } from "../lib/env";
import { fetchText, botUserAgent } from "../lib/sources/http";
import { PAGE_FETCH_INTERVAL_MS, PAGE_SITES, listJobUrls, loadRobots, parseJobPage } from "../lib/sources/pages";
import type { SourcePosting } from "../lib/sources/types";
import { SEED_SOURCES } from "../lib/sources/seeds";
import { matchesJobKeywords } from "../lib/jobs/keywords";
import { koreaEligibleFromLocation } from "../lib/eligibility";
import { collectSources, fetchPostings } from "../lib/workers/collect";
import { sleep } from "../lib/workers/run";

const DRY_RUN_PAGE_SAMPLE = 15;

/** Page sources in a dry run: count sitemap URLs, parse only a small sample. */
async function samplePages(host: string, ua: string, lines: string[]): Promise<SourcePosting[]> {
  const site = PAGE_SITES[host];
  if (!site) throw new Error(`unknown page site ${host}`);
  const get = (u: string) => fetchText(u, { userAgent: ua });
  const robots = await loadRobots(host, get);
  const urls = await listJobUrls(host, site, robots, get);
  lines.push(`  [${site.name}] sitemap lists ${urls.length} work pages; sampled ${Math.min(urls.length, DRY_RUN_PAGE_SAMPLE)}`);
  const posts: SourcePosting[] = [];
  for (const url of urls.slice(0, DRY_RUN_PAGE_SAMPLE)) {
    await sleep(PAGE_FETCH_INTERVAL_MS);
    const html = await get(url);
    const p = html ? parseJobPage(url, html) : null;
    if (p) posts.push(p);
  }
  return posts;
}

async function dryRun(filter: string | undefined) {
  const ua = botUserAgent(process.env.APP_URL);
  const sources = SEED_SOURCES.filter((s) => !filter || s.name === filter || s.endpoint === filter);
  let total = 0;
  let candidates = 0;
  const lines: string[] = [];
  // "korea=yes": the location says a Korea resident can apply (Korea, worldwide, APAC…), whatever the
  // posting's language. "unknown": the LLM reads the body to decide.
  console.log(`${"source".padEnd(34)} ${"postings".padStart(8)} ${"keyword".padStart(8)} ${"korea=yes".padStart(9)} ${"unknown".padStart(8)}`);
  for (const s of sources) {
    try {
      const posts = s.kind === "page" ? await samplePages(s.endpoint, ua, lines) : await fetchPostings(s.kind, s.endpoint, ua);
      const kw = posts.filter((p) => matchesJobKeywords(p.title, p.body));
      const yes = kw.filter((p) => koreaEligibleFromLocation(p.location_raw) === true);
      const unknown = kw.filter((p) => koreaEligibleFromLocation(p.location_raw) === null);
      total += posts.length;
      candidates += yes.length + unknown.length;
      console.log(`${s.name.padEnd(34)} ${String(posts.length).padStart(8)} ${String(kw.length).padStart(8)} ${String(yes.length).padStart(9)} ${String(unknown.length).padStart(8)}`);
      for (const p of yes.slice(0, 5)) lines.push(`  [${s.name}] ${p.title} | ${p.location_raw}`);
    } catch (e) {
      console.log(`${s.name.padEnd(34)} FAILED: ${(e as Error).message}`);
    }
    await sleep(1000);
  }
  console.log(`\n${total} postings from ${sources.length} sources; ${candidates} would go to processing (keyword match, Korea yes/unknown).`);
  if (lines.length) console.log(`\nExamples a Korea resident can apply to (any posting language):\n${lines.join("\n")}`);
}

async function main() {
  const { values } = parseArgs({
    options: { "dry-run": { type: "boolean", default: false }, source: { type: "string" } },
  });
  if (values["dry-run"]) return dryRun(values.source);

  const result = await collectSources(createServiceClient(), {
    log: console.log,
    userAgent: botUserAgent(appEnv().APP_URL),
    only: values.source,
  });
  if (result.failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
