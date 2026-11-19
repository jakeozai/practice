import { Suspense } from "react";
import { connection } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAIL_RATINGS, MAIL_RATING_KEYS, type MailRating } from "@/lib/feedback";
import { koreanMonthDay } from "@/lib/time";
import { AdminNav, NotAdmin } from "../admin-nav";

export const metadata = { title: "메일 피드백 — 덕잡" };

/** (제안값) Rows shown; the summary counts the last 30 days. */
const LIMIT = 200;
const SUMMARY_DAYS = 30;

/** The archive of daily-mail ratings and comments (mail_feedback, 2026-11-16), newest first, with the jobs that mail held. */
async function Archive({ searchParams }: { searchParams: PageProps<"/admin/feedback">["searchParams"] }) {
  const admin = await getAdminUser();
  if (!admin) return <NotAdmin />;
  await connection();
  const params = await searchParams;
  const onlyComments = params.comments === "1";
  const db = createAdminClient();

  let q = db.from("mail_feedback").select("user_id, send_date, rating, comment, updated_at").order("updated_at", { ascending: false }).limit(LIMIT);
  if (onlyComments) q = q.not("comment", "is", null);
  const since = new Date(Date.now() - SUMMARY_DAYS * 86_400_000).toISOString().slice(0, 10);
  const [{ data: rows, error }, { data: recent, error: recentError }] = await Promise.all([
    q,
    db.from("mail_feedback").select("rating, comment").gte("send_date", since).limit(10_000),
  ]);
  if (error) throw new Error(error.message);
  if (recentError) throw new Error(recentError.message);

  const counts = Object.fromEntries(MAIL_RATING_KEYS.map((k) => [k, 0])) as Record<MailRating, number>;
  for (const r of recent) counts[r.rating]++;
  const commented = recent.filter((r) => r.comment).length;

  // Who sent it, and what that mail held.
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const dates = [...new Set(rows.map((r) => r.send_date))];
  const [{ data: profiles }, { data: sent }] = await Promise.all([
    userIds.length ? db.from("profiles").select("user_id, email").in("user_id", userIds) : Promise.resolve({ data: [] as { user_id: string; email: string }[] }),
    userIds.length
      ? db.from("matches").select("user_id, send_date, job_id, rank").in("user_id", userIds).in("send_date", dates)
      : Promise.resolve({ data: [] as { user_id: string; send_date: string; job_id: string; rank: number }[] }),
  ]);
  const jobIds = [...new Set((sent ?? []).map((m) => m.job_id))];
  const { data: jobs } = jobIds.length ? await db.from("jobs").select("id, title, title_ko").in("id", jobIds) : { data: [] as { id: string; title: string; title_ko: string | null }[] };
  const emailOf = new Map((profiles ?? []).map((p) => [p.user_id, p.email]));
  const titleOf = new Map((jobs ?? []).map((j) => [j.id, j.title_ko || j.title]));
  const mailOf = (uid: string, date: string) =>
    (sent ?? [])
      .filter((m) => m.user_id === uid && m.send_date === date)
      .sort((a, b) => a.rank - b.rank)
      .map((m) => titleOf.get(m.job_id) ?? "(지워진 공고)");

  return (
    <div className="space-y-6">
      <AdminNav email={admin.email} />
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">메일 피드백</h1>
          <p className="mt-1 text-sm text-zinc-600">
            최근 {SUMMARY_DAYS}일: {MAIL_RATING_KEYS.map((k) => `${MAIL_RATINGS[k].emoji} ${MAIL_RATINGS[k].label} ${counts[k]}`).join(" · ")} · 의견 {commented}개
          </p>
        </div>
        <a href={onlyComments ? "/admin/feedback" : "/admin/feedback?comments=1"} className="text-sm text-zinc-500 underline">
          {onlyComments ? "전체 보기" : "의견 있는 것만"}
        </a>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">아직 받은 피드백이 없어요.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
          {rows.map((r) => (
            <li key={`${r.user_id}-${r.send_date}`} className="space-y-1 px-4 py-3">
              <p className="text-sm">
                <span className="mr-2 text-lg" aria-hidden>
                  {MAIL_RATINGS[r.rating].emoji}
                </span>
                <span className="font-semibold">{MAIL_RATINGS[r.rating].label}</span>
                <span className="ml-2 text-zinc-500">
                  {koreanMonthDay(r.send_date)} 메일 · {emailOf.get(r.user_id) ?? "(탈퇴한 구독자)"}
                </span>
              </p>
              {r.comment && <p className="whitespace-pre-wrap rounded-lg bg-zinc-50 px-3 py-2 text-sm">{r.comment}</p>}
              <p className="text-xs text-zinc-500">{mailOf(r.user_id, r.send_date).join(" · ") || "보낸 공고 기록 없음"}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminFeedbackPage(props: PageProps<"/admin/feedback">) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}>
      <Archive searchParams={props.searchParams} />
    </Suspense>
  );
}
