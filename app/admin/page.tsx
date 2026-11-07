import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { loadMetrics, percent } from "@/lib/admin/metrics";
import { createAdminClient } from "@/lib/supabase/admin";
import { appEnv } from "@/lib/env";
import { seoulDate } from "@/lib/time";
import { languageNameKo } from "@/lib/jobs/language";
import { AdminNav, NotAdmin } from "./admin-nav";
import { JobPicker, type PickableJob } from "./job-picker";

export const metadata = { title: "관리자 — AI잡5" };

async function loadPickableJobs(): Promise<PickableJob[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("jobs")
    .select("id, company, title, status, first_seen_at, korea_eligible, requires_credential, languages")
    .eq("review_state", "approved")
    .neq("status", "closed")
    .order("first_seen_at", { ascending: false })
    .limit(40);
  if (error) throw new Error(error.message);
  return data.map((j) => ({
    id: j.id,
    company: j.company,
    title: j.title,
    status: j.status,
    firstSeen: seoulDate(new Date(j.first_seen_at)),
    blocked: j.korea_eligible !== true ? "한국 거주자 지원 가능 여부 미확인" : null,
    info: [j.languages.length ? `작업 언어 ${j.languages.map(languageNameKo).join("·")}` : null, j.requires_credential ? "자격·경력 필요" : null].filter(
      (x): x is string => Boolean(x),
    ),
  }));
}

async function loadSources() {
  const db = createAdminClient();
  const [{ data: sources, error }, { count: pending }] = await Promise.all([
    db.from("sources").select("id, name, kind, endpoint, active, fail_count, last_fetched_at").order("name"),
    db.from("jobs").select("id", { count: "exact", head: true }).eq("review_state", "pending").or("korea_eligible.is.null,korea_eligible.eq.true"),
  ]);
  if (error) throw new Error(error.message);
  return { sources: sources.filter((s) => s.kind !== "manual"), pending: pending ?? 0 };
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

async function Dashboard({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  const admin = await getAdminUser();
  if (!admin) return <NotAdmin />;
  await connection(); // metrics use today's date

  const [{ created }, metrics, jobs, collection] = await Promise.all([
    searchParams,
    loadMetrics(14),
    loadPickableJobs(),
    loadSources(),
  ]);
  const { DIGEST_SIZE } = appEnv();
  const { totals } = metrics;

  return (
    <div className="space-y-8">
      <AdminNav email={admin.email} />
      {created && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          공고를 등록했어요.
        </p>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Phase 0 지표 (최근 14일)</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="구독 중" value={metrics.active} sub={`가입 ${metrics.signups}명 · 목표 100명`} />
          <Stat
            label="프로필 완료율"
            value={percent(metrics.profilesCompleted, metrics.signups)}
            sub={`${metrics.profilesCompleted}/${metrics.signups}명`}
          />
          <Stat
            label="메일 클릭률"
            value={percent(totals.clickedMails, totals.sent)}
            sub={`${totals.clickedMails}/${totals.sent}통 · 목표 20%`}
          />
          <Stat label="하루 신규 공고" value={(totals.newJobs / metrics.days.length).toFixed(1)} sub={`14일 합계 ${totals.newJobs}개`} />
        </div>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">날짜 (KST)</th>
                <th className="px-4 py-2 font-medium">발송</th>
                <th className="px-4 py-2 font-medium">클릭한 메일</th>
                <th className="px-4 py-2 font-medium">클릭률</th>
                <th className="px-4 py-2 font-medium">신규 공고</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {metrics.days.map((d) => (
                <tr key={d.date}>
                  <td className="px-4 py-2 font-mono text-xs">{d.date}</td>
                  <td className="px-4 py-2">{d.sent}</td>
                  <td className="px-4 py-2">{d.clickedMails}</td>
                  <td className="px-4 py-2">{percent(d.clickedMails, d.sent)}</td>
                  <td className="px-4 py-2">{d.newJobs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-500">
          클릭률 = 공고 링크를 1번 이상 누른 메일 ÷ 보낸 메일. 보안 스캐너가 링크를 미리 열면 실제보다 높게 잡힐 수 있어요.
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-semibold">수집처 {collection.sources.length}곳</h2>
          <Link href="/admin/review" className="text-sm text-indigo-600 underline">
            검수 대기 {collection.pending}건
          </Link>
        </div>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">수집처</th>
                <th className="px-4 py-2 font-medium">채용 시스템</th>
                <th className="px-4 py-2 font-medium">마지막 수집</th>
                <th className="px-4 py-2 font-medium">연속 실패</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {collection.sources.map((s) => (
                <tr key={s.id} className={s.active ? "" : "text-zinc-400"}>
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {s.kind}:{s.endpoint}
                  </td>
                  <td className="px-4 py-2 text-xs">{s.last_fetched_at ? seoulDate(new Date(s.last_fetched_at)) : "아직 없음"}</td>
                  <td className={`px-4 py-2 ${s.fail_count >= 3 ? "font-semibold text-red-600" : ""}`}>{s.fail_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">오늘 보낼 공고 고르기</h2>
        <JobPicker jobs={jobs} max={DIGEST_SIZE} />
      </section>
    </div>
  );
}

export default function AdminPage(props: PageProps<"/admin">) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}>
      <Dashboard searchParams={props.searchParams} />
    </Suspense>
  );
}
