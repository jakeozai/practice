/**
 * Which jobs the daily mail can carry, shared by the sender (service role) and
 * the onboarding preview (the signed-in user's own client: approved jobs are
 * public under RLS and matches are readable by their owner).
 * No mail rendering here, so pages can import it without pulling in React Email.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "../supabase/database.types";
import { rankForEveryone } from "./plan";
import { seoulDate, seoulSendTime } from "../time";
import { belowMinimumWage } from "../jobs/min-wage";
import { ProfileSchema } from "../profile/parse";
import { buildSignals, rankForProfile } from "../match/fit";
import { rankStretch, stretchPool } from "../match/stretch";
import { CATEGORY_CHIP_KO, compactPay } from "../jobs/format";

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
  | "requires_credential"
  | "first_seen_at"
>;

export const DIGEST_JOB_COLUMNS =
  "id, company, title, title_ko, summary_ko, status, category, languages, english_level, engagement, url, pay_min, pay_max, pay_currency, pay_unit, hours_per_week_min, requires_credential, first_seen_at" as const;

/**
 * How many jobs to rank (the API's row limit). Personal picks look at every
 * open job that fits the person, not only the newest few, and without a
 * profile Korean-language work must not be cut off by a burst of newer
 * foreign-language postings before rankForEveryone sees it.
 */
export const CANDIDATE_POOL = 1000;

/**
 * Approved, open to Korea residents, not permanent staff hiring, not closed —
 * newest first, then the highest pay, then Korean-language work moved ahead.
 */
export async function loadCandidateJobs(db: Db, limit = CANDIDATE_POOL): Promise<DigestJob[]> {
  return rankForEveryone(await loadCandidatePool(db, limit));
}

/** The same jobs in database order (newest, then best paid), for personal ranking. */
export async function loadCandidatePool(db: Db, limit = CANDIDATE_POOL): Promise<DigestJob[]> {
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
  // Jobs approved before the rule, or before a new minimum wage took effect, are left out at send time.
  const today = seoulDate();
  return data.filter((j) => !belowMinimumWage(j, today));
}

/**
 * What this subscriber's next mail would hold, given what they already got:
 * with a profile, the best fits by the rules of lib/match/fit.ts (the morning
 * mail lets the model choose among the top of the same list); without one,
 * the shared order.
 */
export async function nextMailJobs(db: Db, userId: string, size: number): Promise<DigestJob[]> {
  const [jobs, sent, prof] = await Promise.all([
    loadCandidatePool(db),
    db.from("matches").select("job_id").eq("user_id", userId),
    db.from("profiles").select("profile_json").eq("user_id", userId).maybeSingle(),
  ]);
  if (sent.error) throw new Error(`load matches: ${sent.error.message}`);
  const seen = new Set(sent.data.map((m) => m.job_id));
  const fresh = jobs.filter((j) => !seen.has(j.id));
  const profile = prof.data?.profile_json ? ProfileSchema.safeParse(prof.data.profile_json) : null;
  if (profile?.success) return rankForProfile(fresh, buildSignals(profile.data)).slice(0, size).map((r) => r.job);
  return rankForEveryone(fresh).slice(0, size);
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

/** A row of the "이런 메일이 가요" example on the onboarding finish screen. */
export type ExampleJob = { id: string; headline: string; meta: string; pay: string | null; stretch: boolean };

/**
 * Five jobs shaped like this person's next mail, for the finish screen: with
 * a profile, the three best fits and two AI stretches by the rules (the
 * morning mail's model picks from the same lists); without one, the shared
 * order. Shown as an example — the 06:00 mail is picked again at 05:30.
 */
export async function exampleMailJobs(db: Db, userId: string): Promise<ExampleJob[]> {
  const [jobs, sent, prof] = await Promise.all([
    loadCandidatePool(db),
    db.from("matches").select("job_id").eq("user_id", userId),
    db.from("profiles").select("profile_json").eq("user_id", userId).maybeSingle(),
  ]);
  if (sent.error) throw new Error(`load matches: ${sent.error.message}`);
  const seen = new Set(sent.data.map((m) => m.job_id));
  const fresh = jobs.filter((j) => !seen.has(j.id));
  const row = (j: DigestJob, stretch: boolean): ExampleJob => ({
    id: j.id,
    headline: j.title_ko?.trim() || j.title,
    meta: [stretch ? "AI로 도전" : null, j.category && j.category !== "other" ? CATEGORY_CHIP_KO[j.category] : null, j.company].filter(Boolean).join(" · "),
    pay: compactPay(j),
    stretch,
  });

  const profile = prof.data?.profile_json ? ProfileSchema.safeParse(prof.data.profile_json) : null;
  if (!profile?.success) return rankForEveryone(fresh).slice(0, 5).map((j) => row(j, false));
  const signals = buildSignals(profile.data);
  const now = new Date();
  const ranked = rankForProfile(fresh, signals, now);
  // The model's candidate list is the top six fits (lib/match/pick.ts PICK_POOL); stretches come from outside it.
  const stretch = stretchPool(rankStretch(fresh, signals, now, new Set(ranked.slice(0, 6).map((r) => r.job.id))), 6).slice(0, 2);
  return [...ranked.slice(0, 3).map((r) => row(r.job, false)), ...stretch.map((r) => row(r.job, true))];
}
