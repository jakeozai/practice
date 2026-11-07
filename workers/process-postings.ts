/**
 * Turn new or changed raw postings into jobs (spec §8).
 *
 *   npm run process                  # up to MAX_PER_RUN postings
 *   npm run process -- --limit 50    # smaller batch
 *
 * Per posting: keyword + region triage → one LLM extraction (if
 * ANTHROPIC_API_KEY and ANTHROPIC_MODEL_FAST are set) → rules → upsert jobs
 * by raw_posting_id → raw_postings.processed_hash = body_hash.
 * Without the LLM, or when it fails twice, candidates go to the review queue
 * as `pending` (CLAUDE.md rule 4). Embeddings come in Phase 2.
 */
import { parseArgs } from "node:util";
import { createServiceClient, type ServiceClient } from "../lib/supabase/service";
import { createAnthropic, fastModelConfig } from "../lib/llm/client";
import { extractJob, type JobExtract, type MessagesClient } from "../lib/llm/extractJob";
import { buildJob, triage, type SourceInfo } from "../lib/jobs/process";
import { normalizeTitle } from "../lib/jobs/format";
import { REPOST_WINDOW_DAYS } from "../lib/status";
import type { Tables } from "../lib/supabase/database.types";

const MAX_PER_RUN = 1000;
const PAGE = 100;

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

async function main() {
  const { values } = parseArgs({ options: { limit: { type: "string" } } });
  const limit = Math.min(MAX_PER_RUN, Number(values.limit ?? MAX_PER_RUN) || MAX_PER_RUN);

  const db = createServiceClient();
  const llm = fastModelConfig();
  const client: MessagesClient | null = llm ? (createAnthropic(llm.apiKey) as unknown as MessagesClient) : null;
  if (!llm) console.warn("ANTHROPIC_API_KEY / ANTHROPIC_MODEL_FAST not set: candidates go to the review queue without summaries.");

  const { data: sourceRows, error: sErr } = await db.from("sources").select("id, name, trusted");
  if (sErr) throw new Error(`load sources: ${sErr.message}`);
  const sources = new Map<string, SourceInfo>(sourceRows.map((s) => [s.id, { name: s.name, trusted: s.trusted }]));

  const stats = { seen: 0, skipKeyword: 0, skipRegion: 0, approved: 0, pending: 0, rejected: 0, keptReviewed: 0, llmCalls: 0, llmFailed: 0, errors: 0 };
  const attempted = new Set<string>();

  while (stats.seen < limit) {
    const { data: batch, error } = await db.rpc("raw_postings_to_process", { p_limit: Math.min(PAGE, limit - stats.seen) });
    if (error) throw new Error(`load postings: ${error.message}`);
    const fresh = batch.filter((r) => !attempted.has(r.id));
    if (fresh.length === 0) break;

    for (const raw of fresh) {
      attempted.add(raw.id);
      stats.seen++;
      try {
        const decision = triage(raw);
        if (decision !== "candidate") {
          stats[decision === "skip_keyword" ? "skipKeyword" : "skipRegion"]++;
          await markProcessed(db, raw);
          continue;
        }

        const { data: existing, error: exErr } = await db
          .from("jobs")
          .select("id, reviewed_at")
          .eq("raw_posting_id", raw.id)
          .maybeSingle();
        if (exErr) throw new Error(`load job: ${exErr.message}`);
        if (existing?.reviewed_at) {
          // A person already reviewed this job; don't overwrite their edits.
          stats.keptReviewed++;
          await markProcessed(db, raw);
          continue;
        }

        let extraction: JobExtract | null = null;
        if (client && llm) {
          const r = await extractJob(client, llm.model, raw);
          stats.llmCalls += r.calls;
          if (r.ok) extraction = r.data;
          else {
            stats.llmFailed++;
            console.warn(`  ! LLM failed for ${raw.url}: ${r.error} → review queue`);
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
        console.error(`  ✖ ${raw.url}: ${(e as Error).message}`);
      }
    }
  }

  console.log(
    `Processed ${stats.seen}: skipped ${stats.skipKeyword} (no keyword) + ${stats.skipRegion} (region), ` +
      `approved ${stats.approved}, pending ${stats.pending}, rejected ${stats.rejected}, kept ${stats.keptReviewed} reviewed; ` +
      `LLM calls ${stats.llmCalls} (failed ${stats.llmFailed}); errors ${stats.errors}.`,
  );
  if (stats.errors) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
