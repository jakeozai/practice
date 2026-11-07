import "server-only";
import { createAdminClient } from "../supabase/admin";
import { seoulDate, seoulDayStartUtc } from "../time";

/** Phase 0 numbers (spec §15): subscribers, profile completion, mail CTR, new jobs per day. */
export type DayRow = { date: string; sent: number; clickedMails: number; newJobs: number };

export type Metrics = {
  signups: number;
  active: number;
  profilesCompleted: number;
  days: DayRow[];
  totals: { sent: number; clickedMails: number; newJobs: number };
};

const PAGE = 1000;

async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

function lastDates(n: number, today = seoulDate()): string[] {
  const start = seoulDayStartUtc(today).getTime();
  return Array.from({ length: n }, (_, i) => seoulDate(new Date(start - i * 86_400_000 + 12 * 3_600_000)));
}

export async function loadMetrics(days = 14): Promise<Metrics> {
  const db = createAdminClient();
  const dates = lastDates(days);
  const from = dates[dates.length - 1];

  const count = async (q: PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
    const { count, error } = await q;
    if (error) throw new Error(error.message);
    return count ?? 0;
  };

  const [signups, active, profilesCompleted, sends, clicks, jobs] = await Promise.all([
    count(db.from("profiles").select("*", { count: "exact", head: true })),
    count(db.from("profiles").select("*", { count: "exact", head: true }).eq("digest_status", "active")),
    count(db.from("profiles").select("*", { count: "exact", head: true }).not("profile_json", "is", null)),
    fetchAll((a, b) =>
      db.from("digest_sends").select("send_date").eq("status", "sent").gte("send_date", from).order("send_date").range(a, b),
    ),
    fetchAll((a, b) =>
      db
        .from("matches")
        .select("user_id, send_date")
        .not("clicked_at", "is", null)
        .gte("send_date", from)
        .order("send_date")
        .range(a, b),
    ),
    fetchAll((a, b) =>
      db
        .from("jobs")
        .select("first_seen_at")
        .gte("first_seen_at", seoulDayStartUtc(from).toISOString())
        .order("first_seen_at")
        .range(a, b),
    ),
  ]);

  const sentBy = new Map<string, number>();
  for (const s of sends) sentBy.set(s.send_date, (sentBy.get(s.send_date) ?? 0) + 1);

  // A mail counts as clicked once, however many of its jobs were clicked.
  const clickedBy = new Map<string, Set<string>>();
  for (const c of clicks) {
    const set = clickedBy.get(c.send_date) ?? new Set<string>();
    set.add(c.user_id);
    clickedBy.set(c.send_date, set);
  }

  const jobsBy = new Map<string, number>();
  for (const j of jobs) {
    const d = seoulDate(new Date(j.first_seen_at));
    jobsBy.set(d, (jobsBy.get(d) ?? 0) + 1);
  }

  const rows = dates.map((date) => ({
    date,
    sent: sentBy.get(date) ?? 0,
    clickedMails: clickedBy.get(date)?.size ?? 0,
    newJobs: jobsBy.get(date) ?? 0,
  }));

  return {
    signups,
    active,
    profilesCompleted,
    days: rows,
    totals: {
      sent: rows.reduce((n, r) => n + r.sent, 0),
      clickedMails: rows.reduce((n, r) => n + r.clickedMails, 0),
      newJobs: rows.reduce((n, r) => n + r.newJobs, 0),
    },
  };
}

export const percent = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 1000) / 10}%` : "—");
