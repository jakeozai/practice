/**
 * Adds the work languages that job titles name to existing jobs
 * (2026-11-16: "AI Trainers Network - Odia" was stored as ["en"] and reached
 * Korean subscribers' rule pools). New jobs get them in buildJob; this fixes
 * rows processed before. Rule-based, no LLM call. Reads only jobs.title,
 * title_ko and languages, never raw_postings.body (CLAUDE.md rule 1).
 *
 *   npx tsx --env-file-if-exists=.env.local workers/backfill-languages.ts           # dry run
 *   npx tsx --env-file-if-exists=.env.local workers/backfill-languages.ts --apply
 */
import { parseArgs } from "node:util";
import { createServiceClient } from "../lib/supabase/service";
import { languageFixes } from "../lib/jobs/language";

const PAGE = 500;

async function main() {
  const { values } = parseArgs({ options: { apply: { type: "boolean", default: false } } });
  const db = createServiceClient();
  const rows: { id: string; title: string; title_ko: string | null; languages: string[] }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("jobs")
      .select("id, title, title_ko, languages")
      .in("status", ["open", "pool"])
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`load jobs: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) break;
  }

  const fixes = languageFixes(rows);
  for (const f of fixes) console.log(`${f.id}  ${f.title}  [${f.from.join(",")}] → [${f.to.join(",")}]`);
  console.log(`${fixes.length} of ${rows.length} open jobs ${values.apply ? "updated" : "would change (dry run, --apply to write)"}`);
  if (!values.apply) return;
  for (const f of fixes) {
    const { error } = await db.from("jobs").update({ languages: f.to }).eq("id", f.id);
    if (error) throw new Error(`update ${f.id}: ${error.message}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
