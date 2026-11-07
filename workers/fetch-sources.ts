/**
 * Collect postings from every active source into raw_postings (spec §7).
 *
 *   npm run collect                       # all active sources in the DB
 *   npm run collect -- --source rws       # one source (name or endpoint)
 *   npm run collect -- --dry-run          # no DB: fetch the seed list and report what would be stored
 *
 * Per source: fetch → upsert new/changed postings (body_hash) → jobs of
 * postings that disappeared get missing_count + 1 and close at 2 → on
 * failure fail_count + 1, mail the admins at 3 in a row.
 *
 * `page` sources (lib/sources/pages.ts) are read from the site's sitemap;
 * only pages not stored yet are fetched, ≥1 s apart, robots.txt checked.
 */
import { parseArgs } from "node:util";
import { createServiceClient, type ServiceClient } from "../lib/supabase/service";
import { adminEmails, appEnv } from "../lib/env";
import { fetchJson, fetchText, botUserAgent, SourceFetchError } from "../lib/sources/http";
import { PAGE_FETCH_CAP, PAGE_FETCH_INTERVAL_MS, PAGE_SITES, listJobUrls, loadRobots, parseJobPage } from "../lib/sources/pages";
import { parseSource, sourceUrl } from "../lib/sources/adapters";
import { isFetchableKind, type FetchableKind, type SourcePosting } from "../lib/sources/types";
import { SEED_SOURCES } from "../lib/sources/seeds";
import { nextMissing, planSync, type ExistingRaw } from "../lib/sources/sync";
import { bodyHash } from "../lib/sources/text";
import { matchesJobKeywords } from "../lib/jobs/keywords";
import { koreaEligibleFromLocation } from "../lib/eligibility";
import { sendEmail } from "../lib/email/send";
import { seoulDate } from "../lib/time";

const PAGE = 1000;
const BATCH = 100;
const FAIL_ALERT_AT = 3;
const PAUSE_BETWEEN_SOURCES_MS = 1000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const chunks = <T>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

type Source = { id: string; name: string; kind: FetchableKind | "page"; endpoint: string; fail_count: number };

async function fetchPostings(kind: FetchableKind, endpoint: string, userAgent: string): Promise<SourcePosting[]> {
  return parseSource(kind, await fetchJson(sourceUrl(kind, endpoint), { userAgent }));
}

// ── dry run ──────────────────────────────────────────────────────────────
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
    await sleep(PAUSE_BETWEEN_SOURCES_MS);
  }
  console.log(`\n${total} postings from ${sources.length} sources; ${candidates} would go to processing (keyword match, Korea yes/unknown).`);
  if (lines.length) console.log(`\nExamples a Korea resident can apply to (any posting language):\n${lines.join("\n")}`);
}

// ── real run ─────────────────────────────────────────────────────────────
async function loadExisting(db: ServiceClient, sourceId: string): Promise<ExistingRaw[]> {
  const out: ExistingRaw[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("raw_postings")
      .select("id, external_id, body_hash, url, title, location_raw")
      .eq("source_id", sourceId)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`load raw_postings: ${error.message}`);
    out.push(...data);
    if (data.length < PAGE) return out;
  }
}

async function markSeen(db: ServiceClient, rawIds: string[], now: string) {
  for (const ids of chunks(rawIds, BATCH)) {
    const { error } = await db.from("jobs").update({ missing_count: 0, last_seen_at: now }).in("raw_posting_id", ids);
    if (error) throw new Error(`mark seen: ${error.message}`);
  }
}

async function markMissing(db: ServiceClient, rawIds: string[]): Promise<number> {
  let closed = 0;
  for (const ids of chunks(rawIds, BATCH)) {
    const { data, error } = await db
      .from("jobs")
      .select("id, missing_count, status")
      .in("raw_posting_id", ids)
      .neq("status", "closed");
    if (error) throw new Error(`load missing jobs: ${error.message}`);
    for (const job of data) {
      const next = nextMissing(job.missing_count);
      const { error: uErr } = await db
        .from("jobs")
        .update({ missing_count: next.missing_count, ...(next.close ? { status: "closed" as const } : {}) })
        .eq("id", job.id);
      if (uErr) throw new Error(`mark missing: ${uErr.message}`);
      if (next.close) closed++;
    }
  }
  return closed;
}

async function alertAdmins(source: Source, failCount: number, message: string) {
  const admins = adminEmails();
  if (!admins.length) return;
  for (const to of admins) {
    try {
      await sendEmail({
        to,
        subject: `[AI잡5] 공고 수집 ${failCount}회 연속 실패: ${source.name}`,
        text: `${source.name} (${source.kind}:${source.endpoint}) 수집이 ${failCount}회 연속 실패했어요.\n\n마지막 오류: ${message}\n\n보드 주소가 바뀌었거나 사라졌는지 확인해 주세요.`,
        html: `<p>${source.name} (${source.kind}:${source.endpoint}) 수집이 ${failCount}회 연속 실패했어요.</p><p>마지막 오류: ${message.replace(/[<>&]/g, "")}</p><p>보드 주소가 바뀌었거나 사라졌는지 확인해 주세요.</p>`,
        headers: {},
        idempotencyKey: `source-fail-${source.id}-${seoulDate()}-${to}`,
      });
    } catch (e) {
      console.error(`  ! alert mail to ${to} failed: ${(e as Error).message}`);
    }
  }
}

/** New pages only; listed-but-stored pages count as seen, unlisted ones as missing. */
async function collectPageSource(db: ServiceClient, source: Source, userAgent: string, now: string) {
  const site = PAGE_SITES[source.endpoint];
  if (!site) throw new Error(`no page site config for ${source.endpoint}`);
  const get = (u: string) => fetchText(u, { userAgent });
  const robots = await loadRobots(source.endpoint, get);
  const listed = await listJobUrls(source.endpoint, site, robots, get);
  const existing = await loadExisting(db, source.id);
  const byExternal = new Map(existing.map((e) => [e.external_id, e]));
  const listedSet = new Set(listed);

  const seenRawIds = existing.filter((e) => listedSet.has(e.external_id)).map((e) => e.id);
  const missingRawIds = existing.filter((e) => !listedSet.has(e.external_id)).map((e) => e.id);
  const toFetch = listed.filter((u) => !byExternal.has(u)).slice(0, PAGE_FETCH_CAP);

  let stored = 0;
  for (const url of toFetch) {
    await sleep(PAGE_FETCH_INTERVAL_MS);
    let post: SourcePosting | null = null;
    try {
      const html = await get(url);
      post = html ? parseJobPage(url, html) : null;
    } catch (e) {
      console.warn(`    ! ${url}: ${(e as Error).message}`);
    }
    if (!post) continue;
    const { error } = await db
      .from("raw_postings")
      .upsert({ source_id: source.id, ...post, body_hash: bodyHash(post.body), fetched_at: now }, { onConflict: "source_id,external_id" });
    if (error) throw new Error(`upsert raw_postings: ${error.message}`);
    stored++;
  }
  await markSeen(db, seenRawIds, now);
  const closed = await markMissing(db, missingRawIds);
  const backlog = listed.length - existing.length - toFetch.length;
  console.log(
    `  ✔ ${source.name}: ${listed.length} listed, ${stored} new stored, ${missingRawIds.length} gone (${closed} jobs closed)` +
      (backlog > 0 ? `, ${backlog} left for the next run` : ""),
  );
}

async function collectOne(db: ServiceClient, source: Source, userAgent: string) {
  const now = new Date().toISOString();
  let posts: SourcePosting[];
  try {
    if (source.kind === "page") {
      await collectPageSource(db, source, userAgent, now);
      await db.from("sources").update({ fail_count: 0, last_fetched_at: now }).eq("id", source.id);
      return { ok: true as const };
    }
    posts = await fetchPostings(source.kind, source.endpoint, userAgent);
  } catch (e) {
    const failCount = source.fail_count + 1;
    const message = e instanceof SourceFetchError || e instanceof Error ? e.message : String(e);
    await db.from("sources").update({ fail_count: failCount }).eq("id", source.id);
    console.error(`  ✖ ${source.name}: ${message} (fail ${failCount})`);
    if (failCount === FAIL_ALERT_AT) await alertAdmins(source, failCount, message);
    return { ok: false as const };
  }

  const plan = planSync(await loadExisting(db, source.id), posts);
  for (const rows of chunks(plan.upserts, BATCH)) {
    const { error } = await db.from("raw_postings").upsert(
      rows.map((r) => ({ source_id: source.id, ...r, fetched_at: now })),
      { onConflict: "source_id,external_id" },
    );
    if (error) throw new Error(`upsert raw_postings: ${error.message}`);
  }
  await markSeen(db, plan.seenRawIds, now);
  const closed = await markMissing(db, plan.missingRawIds);
  await db.from("sources").update({ fail_count: 0, last_fetched_at: now }).eq("id", source.id);

  console.log(
    `  ✔ ${source.name}: ${posts.length} postings, ${plan.newCount} new, ${plan.upserts.length - plan.newCount} changed, ${plan.missingRawIds.length} gone (${closed} jobs closed)`,
  );
  return { ok: true as const };
}

async function main() {
  const { values } = parseArgs({
    options: { "dry-run": { type: "boolean", default: false }, source: { type: "string" } },
  });
  if (values["dry-run"]) return dryRun(values.source);

  const userAgent = botUserAgent(appEnv().APP_URL);
  const db = createServiceClient();
  const { data, error } = await db.from("sources").select("id, name, kind, endpoint, fail_count").eq("active", true).order("name");
  if (error) throw new Error(`load sources: ${error.message}`);

  const sources: Source[] = [];
  for (const s of data) {
    if (values.source && s.name !== values.source && s.endpoint !== values.source) continue;
    if (s.kind === "manual") continue;
    if (s.kind === "page" && s.endpoint && PAGE_SITES[s.endpoint]) {
      sources.push({ ...s, kind: "page", endpoint: s.endpoint });
      continue;
    }
    if (!isFetchableKind(s.kind) || !s.endpoint) {
      console.warn(`  - skip ${s.name}: no adapter for kind "${s.kind}" / endpoint "${s.endpoint}"`);
      continue;
    }
    sources.push({ ...s, kind: s.kind, endpoint: s.endpoint });
  }

  let failed = 0;
  for (const s of sources) {
    const r = await collectOne(db, s, userAgent);
    if (!r.ok) failed++;
    await sleep(PAUSE_BETWEEN_SOURCES_MS);
  }
  console.log(`\nDone: ${sources.length - failed}/${sources.length} sources collected.`);
  if (failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
