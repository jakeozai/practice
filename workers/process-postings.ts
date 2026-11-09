/**
 * Turn new or changed raw postings into jobs (spec §8).
 * The same job runs daily from Vercel Cron (/api/cron/collect, after collection).
 *
 *   npm run process                  # up to MAX_PER_RUN postings
 *   npm run process -- --limit 50    # smaller batch
 */
import { parseArgs } from "node:util";
import { createServiceClient } from "../lib/supabase/service";
import { MAX_PER_RUN, processPostings } from "../lib/workers/process";

async function main() {
  const { values } = parseArgs({ options: { limit: { type: "string" } } });
  const limit = Math.min(MAX_PER_RUN, Number(values.limit ?? MAX_PER_RUN) || MAX_PER_RUN);
  const stats = await processPostings(createServiceClient(), { log: console.log, limit });
  if (stats.errors) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
