/**
 * Which jobs the daily mail can carry, shared by the sender (service role) and
 * the onboarding preview (the signed-in user's own client: approved jobs are
 * public under RLS and matches are readable by their owner).
 * No mail rendering here, so pages can import it without pulling in React Email.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "../supabase/database.types";
import { rankForEveryone } from "./plan";
import { seoulSendTime } from "../time";

export type Db = SupabaseClient<Database>;

export type DigestJob = Pick<
  Tables<"jobs">,
  | "id"
  | "company"
  | "title"
  | "title_ko"
  | "summary_ko"
  | "status"
  | "category"
  | "languages"
  | "english_level"
  | "engagement"
  | "url"
  | "pay_min"
  | "pay_max"
  | "pay_currency"
  | "pay_unit"
  | "hours_per_week_min"
>;

export const DIGEST_JOB_COLUMNS =
  "id, company, title, title_ko, summary_ko, status, category, languages, english_level, engagement, url, pay_min, pay_max, pay_currency, pay_unit, hours_per_week_min" as const;

/**
 * How many jobs to rank; each user gets the first DIGEST_SIZE they haven't
 * seen. Large enough that Korean-language work isn't cut off by a burst of
 * newer foreign-language postings before rankForEveryone sees it.
 */
export const CANDIDATE_POOL = 500;

/**
 * Approved, open to Korea residents, not permanent staff hiring, not closed —
 * newest first, then the highest pay, then Korean-language work moved ahead.
 */
export async function loadCandidateJobs(db: Db, limit = CANDIDATE_POOL): Promise<DigestJob[]> {
  const { data, error } = await db
    .from("jobs")
    .select(DIGEST_JOB_COLUMNS)
    .eq("review_state", "approved")
    .eq("korea_eligible", true)
    .neq("status", "closed")
    .or("engagement.is.null,engagement.neq.permanent")
    .order("first_seen_at", { ascending: false })
    .order("pay_max", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(`load candidate jobs: ${error.message}`);
  return rankForEveryone(data);
}

/** What this subscriber's next mail would hold, given what they already got. */
export async function nextMailJobs(db: Db, userId: string, size: number): Promise<DigestJob[]> {
  const [jobs, sent] = await Promise.all([loadCandidateJobs(db), db.from("matches").select("job_id").eq("user_id", userId)]);
  if (sent.error) throw new Error(`load matches: ${sent.error.message}`);
  const seen = new Set(sent.data.map((m) => m.job_id));
  return jobs.filter((j) => !seen.has(j.id)).slice(0, size);
}

export type CurationStats = {
  /** Postings first collected in the 24 hours before this send. */
  newPostings: number;
  /** Jobs from that window that passed every check (approved, open to Korea residents). */
  koreaJobs: number;
};

/**
 * Counts for the mail's top line. The window ends at the send time, after the
 * last processing run (05:50 KST), so a rerun the same morning gets the same
 * numbers and the same payload (Resend idempotency key).
 */
export async function loadCurationStats(db: Db, sendDate: string): Promise<CurationStats> {
  const to = seoulSendTime(sendDate);
  const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
  const [raw, jobs] = await Promise.all([
    db
      .from("raw_postings")
      .select("id", { count: "exact", head: true })
      .gte("first_seen_at", from.toISOString())
      .lt("first_seen_at", to.toISOString()),
    db
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("review_state", "approved")
      .eq("korea_eligible", true)
      .gte("first_seen_at", from.toISOString())
      .lt("first_seen_at", to.toISOString()),
  ]);
  if (raw.error || jobs.error) throw new Error(`curation stats: ${(raw.error ?? jobs.error)!.message}`);
  return { newPostings: raw.count ?? 0, koreaJobs: jobs.count ?? 0 };
}
