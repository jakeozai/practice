import { Suspense } from "react";
import { connection } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CATEGORY_CHIP_KO } from "@/lib/jobs/format";
import { seoulDate } from "@/lib/time";
import { AdminNav, NotAdmin } from "../admin-nav";

export const metadata = { title: "반응 통계 — 덕잡" };

const DAYS = [7, 30, 90] as const;

const label = (c: string) => (CATEGORY_CHIP_KO as Record<string, string>)[c] ?? (c === "other" ? "기타" : c);
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10}%` : "—");
const per = (a: number, b: number) => (b ? (Math.round((a / b) * 10) / 10).toString() : "—");

type Row = { key: string; newPostings: number; sent: number; sentStretch: number; clicked: number; clickedStretch: number; jobs: number; jobClicks: number };

/**
 * Reaction data (0020, 2026-11-17): how many jobs of each kind came in, were mailed and were clicked.
 * The basis for pricing sponsored postings. Anonymous numbers only: no person appears here.
 */
async function Stats({ searchParams }: { searchParams: PageProps<"/admin/stats">["searchParams"] }) {
  const admin = await getAdminUser();
  if (!admin) return <NotAdmin />;
  await connection();
  const params = await searchParams;
  const days = DAYS.find((d) => String(d) === params.days) ?? 30;
  const by = params.by === "source" ? "source" : "category";
  const since = new Date(Date.now() - (days - 1) * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });

  const db = createAdminClient();
  const [{ data: daily, error }, { data: engaged, error: eErr }] = await Promise.all([
    db.from("category_daily_stats").select("category, source_kind, new_postings, sent, sent_stretch, clicked, clicked_stretch").gte("day", since).limit(20_000),
    db.from("job_engagement").select("category, source_kind, clicks").gte("first_sent_on", since).limit(20_000),
  ]);
  if (error) throw new Error(error.message);
  if (eErr) throw new Error(eErr.message);

  const rows = new Map<string, Row>();
  const row = (key: string) => {
    let r = rows.get(key);
    if (!r) rows.set(key, (r = { key, newPostings: 0, sent: 0, sentStretch: 0, clicked: 0, clickedStretch: 0, jobs: 0, jobClicks: 0 }));
    return r;
  };
  for (const d of daily) {
    const r = row(by === "source" ? d.source_kind : d.category);
    r.newPostings += d.new_postings;
    r.sent += d.sent;
    r.sentStretch += d.sent_stretch;
    r.clicked += d.clicked;
    r.clickedStretch += d.clicked_stretch;
  }
  for (const e of engaged) {
    const r = row(by === "source" ? (e.source_kind ?? "unknown") : (e.category ?? "other"));
    r.jobs += 1;
    r.jobClicks += e.clicks;
  }
  const list = [...rows.values()].sort((a, b) => b.sent - a.sent || b.newPostings - a.newPostings);
  const total = list.reduce(
    (t, r) => ({ ...t, newPostings: t.newPostings + r.newPostings, sent: t.sent + r.sent, clicked: t.clicked + r.clicked, jobs: t.jobs + r.jobs, jobClicks: t.jobClicks + r.jobClicks }),
    { key: "합계", newPostings: 0, sent: 0, sentStretch: 0, clicked: 0, clickedStretch: 0, jobs: 0, jobClicks: 0 } as Row,
  );

  const link = (q: Record<string, string>) => `/admin/stats?${new URLSearchParams({ days: String(days), by, ...q })}`;
  return (
    <div className="space-y-6">
      <AdminNav email={admin.email} />
      <div>
        <h1 className="text-xl font-bold">반응 통계</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {since} ~ {seoulDate()} · 공고가 얼마나 들어오고, 메일에 실리고, 클릭됐는지. 개인은 나오지 않는 집계예요.
        </p>
        <p className="mt-2 flex flex-wrap gap-3 text-sm">
          {DAYS.map((d) => (
            <a key={d} href={link({ days: String(d) })} className={d === days ? "font-bold underline" : "text-zinc-500 underline"}>
              최근 {d}일
            </a>
          ))}
          <span className="text-zinc-300">|</span>
          <a href={link({ by: "category" })} className={by === "category" ? "font-bold underline" : "text-zinc-500 underline"}>
            분야별
          </a>
          <a href={link({ by: "source" })} className={by === "source" ? "font-bold underline" : "text-zinc-500 underline"}>
            출처별
          </a>
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500">
            <tr>
              <th className="px-3 py-2">{by === "source" ? "출처" : "분야"}</th>
              <th className="px-3 py-2 text-right">새 공고</th>
              <th className="px-3 py-2 text-right">메일 발송</th>
              <th className="px-3 py-2 text-right">클릭</th>
              <th className="px-3 py-2 text-right">클릭률</th>
              <th className="px-3 py-2 text-right">공고당 평균 클릭</th>
              <th className="px-3 py-2 text-right">도전 클릭률</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {[...list, total].map((r) => (
              <tr key={r.key} className={r.key === "합계" ? "font-semibold" : undefined}>
                <td className="px-3 py-2">{r.key === "합계" || by === "source" ? r.key : label(r.key)}</td>
                <td className="px-3 py-2 text-right">{r.newPostings}</td>
                <td className="px-3 py-2 text-right">{r.sent}</td>
                <td className="px-3 py-2 text-right">{r.clicked}</td>
                <td className="px-3 py-2 text-right">{pct(r.clicked, r.sent)}</td>
                <td className="px-3 py-2 text-right">{per(r.jobClicks, r.jobs)}</td>
                <td className="px-3 py-2 text-right">{r.key === "합계" ? "" : pct(r.clickedStretch, r.sentStretch)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="list-disc space-y-1 pl-5 text-xs text-zinc-500">
        <li>클릭·클릭률: 받은 사람이 공고 링크를 누른 수(사람·공고당 한 번). 공고당 평균 클릭: 이 기간에 처음 보낸 공고의 전체 클릭(다시 누른 것 포함) 평균.</li>
        <li>메일 보안 검사기가 링크를 미리 여는 경우가 섞일 수 있어요. 매일 23:50에 최근 7일을 다시 집계해요.</li>
      </ul>
    </div>
  );
}

export default function AdminStatsPage(props: PageProps<"/admin/stats">) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}>
      <Stats searchParams={props.searchParams} />
    </Suspense>
  );
}
