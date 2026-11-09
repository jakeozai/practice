/**
 * Turn new or changed raw postings into jobs (spec §8).
 * Called by workers/process-postings.ts (CLI) and /api/cron/collect.
 *
 * Per posting: keyword + region triage → one LLM extraction (when a model
 * is configured, see lib/llm/client.ts) → rules → upsert jobs by
 * raw_posting_id → raw_postings.processed_hash = body_hash.
 * Without the LLM, or when it fails twice, candidates go to the review queue
 * as `pending` (CLAUDE.md rule 4). Embeddings come in Phase 2.
 */
import type { ServiceClient } from "../supabase/service";
import { createAnthropic, fastModelConfig } from "../llm/client";
import { extractJob, type JobExtract, type MessagesClient } from "../llm/extractJob";
import { buildJob, triage, type SourceInfo } from "../jobs/process";
import { normalizeTitle } from "../jobs/format";
import { REPOST_WINDOW_DAYS } from "../status";
import type { Tables } from "../supabase/database.types";
import { pastDeadline, type RunOptions } from "./run";

export const MAX_PER_RUN = 1000;
const PAGE = 100;
/** Parallel LLM calls. Keeps a cron run short without hammering the API. */
const CONCURRENCY = 4;
/** Don't start a posting this close to the deadline (an LLM call + retry can take a while). */
const DEADLINE_MARGIN_MS = 45_000;

async function sameTitleCount(db: ServiceClient, company: string, title: string, excludeRawId: string): Promise<number> {
  const since = new Date(Date.now() - REPOST_WINDOW_DAYS * 86_400_000).toISOString();
  const { count, error } = await db
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("company", company)
    .eq("title_normalized", normalizeTitle(title))
    .gte("first_seen_at", since)
    .neq("raw_posting_id", excludeRawId);
  if (error) throw new Error(`repost count: ${error.message}`);
  return (count ?? 0) + 1;
}

async function markProcessed(db: ServiceClient, raw: Tables<"raw_postings">) {
  const { error } = await db.from("raw_postings").update({ processed_hash: raw.body_hash }).eq("id", raw.id);
  if (error) throw new Error(`mark processed: ${error.message}`);
}

export type ProcessStats = {
  seen: number;
  skipKeyword: number;
  skipRegion: number;
  approved: number;
  pending: number;
  rejected: number;
  keptReviewed: number;
  llmCalls: number;
  llmFailed: number;
  errors: number;
};

export async function processPostings(db: ServiceClient, opts: RunOptions & { limit?: number }): Promise<ProcessStats> {
  const limit = Math.min(MAX_PER_RUN, opts.limit ?? MAX_PER_RUN);
  const llm = await fastModelConfig();
  const client: MessagesClient | null = llm ? (createAnthropic(llm) as unknown as MessagesClient) : null;
  if (!llm) opts.log("No LLM configured (ANTHROPIC_MODEL_FAST + AI Gateway or ANTHROPIC_API_KEY): candidates go to the review queue without summaries.");

  const { data: sourceRows, error: sErr } = await db.from("sources").select("id, name, trusted");
  if (sErr) throw new Error(`load sources: ${sErr.message}`);
  const sources = new Map<string, SourceInfo>(sourceRows.map((s) => [s.id, { name: s.name, trusted: s.trusted }]));

  const stats: ProcessStats = { seen: 0, skipKeyword: 0, skipRegion: 0, approved: 0, pending: 0, rejected: 0, keptReviewed: 0, llmCalls: 0, llmFailed: 0, errors: 0 };
  const attempted = new Set<string>();

  async function handle(raw: Tables<"raw_postings">) {
    try {
      const decision = triage(raw);
      if (decision !== "candidate") {
        stats[decision === "skip_keyword" ? "skipKeyword" : "skipRegion"]++;
        await markProcessed(db, raw);
        return;
      }

      const { data: existing, error: exErr } = await db.from("jobs").select("id, reviewed_at").eq("raw_posting_id", raw.id).maybeSingle();
      if (exErr) throw new Error(`load job: ${exErr.message}`);
      if (existing?.reviewed_at) {
        // A person already reviewed this job; don't overwrite their edits.
        stats.keptReviewed++;
        await markProcessed(db, raw);
        return;
      }

      let extraction: JobExtract | null = null;
      if (client && llm) {
        const r = await extractJob(client, llm.model, raw);
        stats.llmCalls += r.calls;
        if (r.ok) extraction = r.data;
        else {
          stats.llmFailed++;
          opts.log(`  ! LLM failed for ${raw.url}: ${r.error} → review queue`);
        }
      }

      const source = sources.get(raw.source_id) ?? { name: "Unknown", trusted: false };
      const company = extraction?.company || source.name;
      const job = buildJob({
        raw,
        source,
        extraction,
        sameTitleCount: await sameTitleCount(db, company, extraction?.title || raw.title || "", raw.id),
      });
      const { error: upErr } = await db.from("jobs").upsert(job, { onConflict: "raw_posting_id" });
      if (upErr) throw new Error(`upsert job: ${upErr.message}`);
      stats[job.review_state ?? "pending"]++;
      await markProcessed(db, raw);
    } catch (e) {
      stats.errors++;
      opts.log(`  ✖ ${raw.url}: ${(e as Error).message}`);
    }
  }

  let outOfTime = false;
  while (stats.seen < limit && !outOfTime) {
    const { data: batch, error } = await db.rpc("raw_postings_to_process", { p_limit: Math.min(PAGE, limit - stats.seen) });
    if (error) throw new Error(`load postings: ${error.message}`);
    const queue = batch.filter((r) => !attempted.has(r.id));
    if (queue.length === 0) break;

    // A small pool of workers drains this batch; each stops taking work near the deadline.
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        for (let raw = queue.shift(); raw; raw = queue.shift()) {
          if (pastDeadline(opts.deadline, DEADLINE_MARGIN_MS)) {
            outOfTime = true;
            return;
          }
          attempted.add(raw.id);
          stats.seen++;
          await handle(raw);
        }
      }),
    );
  }

  opts.log(
    `Processed ${stats.seen}: skipped ${stats.skipKeyword} (no keyword) + ${stats.skipRegion} (region), ` +
      `approved ${stats.approved}, pending ${stats.pending}, rejected ${stats.rejected}, kept ${stats.keptReviewed} reviewed; ` +
      `LLM calls ${stats.llmCalls} (failed ${stats.llmFailed}); errors ${stats.errors}` +
      (outOfTime ? "; stopped at the deadline, the rest waits for the next run." : "."),
  );
  return stats;
}
