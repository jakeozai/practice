/**
 * Daily mail, Phase 1: the newest approved jobs to every active subscriber
 * (spec §9). The same job runs daily from Vercel Cron (/api/cron/digest).
 *
 *   npm run send:digest                              # dry run: print the plan
 *   npm run send:digest -- --send                    # actually send
 *   npm run send:digest -- --only me@example.com --send
 *
 * Options: --date YYYY-MM-DD (send_date, default today in Asia/Seoul)
 */
import { parseArgs } from "node:util";
import { z } from "zod";
import { createServiceClient } from "../lib/supabase/service";
import { seoulDate, isIsoDate } from "../lib/time";
import { sendDigest } from "../lib/workers/digest";

async function main() {
  const { values } = parseArgs({
    options: {
      send: { type: "boolean", default: false },
      only: { type: "string" },
      date: { type: "string" },
    },
  });
  if (values.date && !isIsoDate(values.date)) throw new Error(`--date must be YYYY-MM-DD: ${values.date}`);
  if (values.only && !z.email().safeParse(values.only).success) throw new Error(`--only must be an email: ${values.only}`);

  const result = await sendDigest(createServiceClient(), {
    log: console.log,
    sendDate: values.date ?? seoulDate(),
    dryRun: !values.send,
    only: values.only?.toLowerCase(),
  });
  if (!values.send) console.log("\nDry run. Add --send to send.");
  if (result.failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
