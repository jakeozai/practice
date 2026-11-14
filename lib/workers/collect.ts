/**
 * Collect postings from every active source into raw_postings (spec §7).
 * Called by workers/fetch-sources.ts (CLI) and /api/cron/collect.
 *
 * Per source: fetch → upsert new/changed postings (body_hash) → jobs of
 * postings that disappeared get missing_count + 1 and close at 2 → on
 * failure fail_count + 1, mail the admins at 3 in a row.
 *
 * `freelancer` sources (lib/sources/freelancer.ts) run a preset of searches on
 * the Freelancer.com API. Its terms allow data only as a cache refreshed
 * within 24 hours, so projects that drop out of the listing are deleted
 * (with their jobs) instead of being closed.
 *
 * `page` sources (lib/sources/pages.ts) are read from the site's sitemap;
 * only pages not stored yet are fetched, ≥1 s apart, robots.txt checked.
 * When the deadline nears, page fetching stops and the rest waits for the
 * next run.
 */
import type { ServiceClient } from "../supabase/service";
import { adminEmails } from "../env";
import { fetchJson, fetchText, SourceFetchError } from "../sources/http";
import { PAGE_FETCH_CAP, PAGE_FETCH_INTERVAL_MS, PAGE_SITES, listJobUrls, loadRobots, parseJobPage } from "../sources/pages";
import { parseSource, sourceUrl } from "../sources/adapters";
import { FREELANCER_PRESETS, freelancerUrl, parseFreelancer, selectProjects, toPosting } from "../sources/freelancer";
import { isFetchableKind, type FetchableKind, type SourcePosting } from "../sources/types";
import { nextMissing, planSync, type ExistingRaw } from "../sources/sync";
import { bodyHash } from "../sources/text";
import { sendEmail } from "../email/send";
import { seoulDate } from "../time";
import { BRAND } from "../brand";
import { chunks, pastDeadline, sleep, type RunOptions } from "./run";

const PAGE = 1000;
const BATCH = 100;
const FAIL_ALERT_AT = 3;
const PAUSE_BETWEEN_SOURCES_MS = 1000;
/** Stop fetching pages this long before the deadline (the bookkeeping after it needs time). */
const PAGE_DEADLINE_MARGIN_MS = 20_000;

export type CollectSource = { id: string; name: string; kind: FetchableKind | "page" | "freelancer"; endpoint: string; fail_count: number };

/** Pause between Freelancer.com searches (one run makes ~40 requests). */
const FREELANCER_QUERY_INTERVAL_MS = 1000;

async function fetchFreelancer(endpoint: string, userAgent: string, log: RunOptions["log"]): Promise<SourcePosting[]> {
  const preset = FREELANCER_PRESETS[endpoint];
  if (!preset) throw new Error(`Unknown Freelancer preset: ${endpoint}`);
  const now = new Date();
  const lists = [];
  for (const query of preset.queries) {
    // One failed search fails the source: a partial listing would delete projects that are still open.
    lists.push(parseFreelancer(await fetchJson(freelancerUrl(query, preset, now), { userAgent })));
    await sleep(FREELANCER_QUERY_INTERVAL_MS);
  }
  const { kept, skipped } = selectProjects(lists, preset.maxPerRun);
  const why = Object.entries(skipped).map(([k, v]) => `${k} ${v}`).join(", ");
  log(`    Freelancer.com: ${preset.queries.length} searches → ${kept.length} kept${why ? ` (left out: ${why})` : ""}`);
  return kept.map(toPosting);
}

/** Delete postings and their jobs (Freelancer.com data may only be kept as a fresh cache). */
async function purgeRaw(db: ServiceClient, rawIds: string[]): Promise<number> {
  for (const ids of chunks(rawIds, BATCH)) {
    const { error: jErr } = await db.from("jobs").delete().in("raw_posting_id", ids);
    if (jErr) throw new Error(`purge jobs: ${jErr.message}`);
    const { error: rErr } = await db.from("raw_postings").delete().in("id", ids);
    if (rErr) throw new Error(`purge raw_postings: ${rErr.message}`);
  }
  return rawIds.length;
}

export async function fetchPostings(kind: FetchableKind, endpoint: string, userAgent: string): Promise<SourcePosting[]> {
  return parseSource(kind, await fetchJson(sourceUrl(kind, endpoint), { userAgent }));
}

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

async function alertAdmins(source: CollectSource, failCount: number, message: string, log: RunOptions["log"]) {
  const admins = adminEmails();
  if (!admins.length) return;
  for (const to of admins) {
    try {
      await sendEmail({
        to,
        subject: `[${BRAND.name}] 공고 수집 ${failCount}회 연속 실패: ${source.name}`,
        text: `${source.name} (${source.kind}:${source.endpoint}) 수집이 ${failCount}회 연속 실패했어요.\n\n마지막 오류: ${message}\n\n보드 주소가 바뀌었거나 사라졌는지 확인해 주세요.`,
        html: `<p>${source.name} (${source.kind}:${source.endpoint}) 수집이 ${failCount}회 연속 실패했어요.</p><p>마지막 오류: ${message.replace(/[<>&]/g, "")}</p><p>보드 주소가 바뀌었거나 사라졌는지 확인해 주세요.</p>`,
        headers: {},
        idempotencyKey: `source-fail-${source.id}-${seoulDate()}-${to}`,
      });
    } catch (e) {
      log(`  ! alert mail to ${to} failed: ${(e as Error).message}`);
    }
  }
}

/** New pages only; listed-but-stored pages count as seen, unlisted ones as missing. */
async function collectPageSource(db: ServiceClient, source: CollectSource, userAgent: string, now: string, opts: RunOptions) {
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
  let fetched = 0;
  for (const url of toFetch) {
    if (pastDeadline(opts.deadline, PAGE_DEADLINE_MARGIN_MS)) break;
    await sleep(PAGE_FETCH_INTERVAL_MS);
    fetched++;
    let post: SourcePosting | null = null;
    try {
      const html = await get(url);
      post = html ? parseJobPage(url, html) : null;
    } catch (e) {
      opts.log(`    ! ${url}: ${(e as Error).message}`);
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
  const backlog = listed.length - existing.length - fetched;
  opts.log(
    `  ✔ ${source.name}: ${listed.length} listed, ${stored} new stored, ${missingRawIds.length} gone (${closed} jobs closed)` +
      (backlog > 0 ? `, ${backlog} left for the next run` : ""),
  );
}

async function collectOne(db: ServiceClient, source: CollectSource, userAgent: string, opts: RunOptions): Promise<boolean> {
  const now = new Date().toISOString();
  let posts: SourcePosting[];
  try {
    if (source.kind === "page") {
      await collectPageSource(db, source, userAgent, now, opts);
      await db.from("sources").update({ fail_count: 0, last_fetched_at: now }).eq("id", source.id);
      return true;
    }
    posts =
      source.kind === "freelancer"
        ? await fetchFreelancer(source.endpoint, userAgent, opts.log)
        : await fetchPostings(source.kind, source.endpoint, userAgent);
  } catch (e) {
    const failCount = source.fail_count + 1;
    const message = e instanceof SourceFetchError || e instanceof Error ? e.message : String(e);
    await db.from("sources").update({ fail_count: failCount }).eq("id", source.id);
    opts.log(`  ✖ ${source.name}: ${message} (fail ${failCount})`);
    if (failCount === FAIL_ALERT_AT) await alertAdmins(source, failCount, message, opts.log);
    return false;
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
  const cacheOnly = source.kind === "freelancer";
  const closed = cacheOnly ? await purgeRaw(db, plan.missingRawIds) : await markMissing(db, plan.missingRawIds);
  await db.from("sources").update({ fail_count: 0, last_fetched_at: now }).eq("id", source.id);

  opts.log(
    `  ✔ ${source.name}: ${posts.length} postings, ${plan.newCount} new, ${plan.upserts.length - plan.newCount} changed, ${plan.missingRawIds.length} gone (${closed} ${cacheOnly ? "deleted" : "jobs closed"})`,
  );
  return true;
}

export type CollectResult = { sources: number; failed: number; notReached: number };

export async function collectSources(
  db: ServiceClient,
  opts: RunOptions & { userAgent: string; only?: string },
): Promise<CollectResult> {
  const { data, error } = await db.from("sources").select("id, name, kind, endpoint, fail_count").eq("active", true).order("name");
  if (error) throw new Error(`load sources: ${error.message}`);

  const sources: CollectSource[] = [];
  for (const s of data) {
    if (opts.only && s.name !== opts.only && s.endpoint !== opts.only) continue;
    if (s.kind === "manual") continue;
    if (s.kind === "freelancer" && s.endpoint && FREELANCER_PRESETS[s.endpoint]) {
      sources.push({ ...s, kind: "freelancer", endpoint: s.endpoint });
      continue;
    }
    if (s.kind === "page" && s.endpoint && PAGE_SITES[s.endpoint]) {
      sources.push({ ...s, kind: "page", endpoint: s.endpoint });
      continue;
    }
    if (!isFetchableKind(s.kind) || !s.endpoint) {
      opts.log(`  - skip ${s.name}: no adapter for kind "${s.kind}" / endpoint "${s.endpoint}"`);
      continue;
    }
    sources.push({ ...s, kind: s.kind, endpoint: s.endpoint });
  }

  // API boards first: they are quick, so a tight deadline only ever cuts page fetching short.
  sources.sort((a, b) => Number(a.kind === "page") - Number(b.kind === "page"));

  let failed = 0;
  let done = 0;
  for (const s of sources) {
    if (pastDeadline(opts.deadline, PAGE_DEADLINE_MARGIN_MS)) break;
    try {
      if (!(await collectOne(db, s, opts.userAgent, opts))) failed++;
    } catch (e) {
      failed++;
      opts.log(`  ✖ ${s.name}: ${(e as Error).message}`);
    }
    done++;
    await sleep(PAUSE_BETWEEN_SOURCES_MS);
  }
  opts.log(`Collected ${done - failed}/${sources.length} sources` + (done < sources.length ? ` (${sources.length - done} left for the next run)` : "") + ".");
  return { sources: sources.length, failed, notReached: sources.length - done };
}
