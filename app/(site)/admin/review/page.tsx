import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { seoulDate } from "@/lib/time";
import { languageNameKo } from "@/lib/jobs/language";
import { AdminNav, NotAdmin } from "../admin-nav";
import { rejectJob } from "./actions";

export const metadata = { title: "검수 큐 — 덕잡" };

const LIMIT = 200;

async function Queue({ searchParams }: { searchParams: PageProps<"/admin/review">["searchParams"] }) {
  const admin = await getAdminUser();
  if (!admin) return <NotAdmin />;
  await connection();
  const params = await searchParams;
  const showAll = params.all === "1";

  let q = createAdminClient()
    .from("jobs")
    .select("id, company, title, url, korea_eligible, eligibility_note, status, summary_ko, first_seen_at, languages", { count: "exact" })
    .eq("review_state", "pending")
    .order("first_seen_at", { ascending: false })
    .limit(LIMIT);
  // Jobs the rules already ruled out for Korea residents can never be mailed; hide them by default.
  if (!showAll) q = q.or("korea_eligible.is.null,korea_eligible.eq.true");
  const { data: jobs, count, error } = await q;
  if (error) throw new Error(error.message);

  return (
    <div className="space-y-6">
      <AdminNav email={admin.email} />
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">검수 큐</h1>
          <p className="mt-1 text-sm text-zinc-600">
            자동 승인되지 않은 수집 공고 {count ?? 0}건{showAll ? "" : " (한국 거주자 지원 불가로 판정된 공고 제외)"}. 요약을 확인·작성하고 승인하세요.
          </p>
        </div>
        <Link href={showAll ? "/admin/review" : "/admin/review?all=1"} className="text-sm text-zinc-500 underline">
          {showAll ? "한국 가능·미확인만 보기" : "전체 보기"}
        </Link>
      </div>
      {params.done && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          {params.done === "approved" ? "승인했어요." : "반려했어요."}
        </p>
      )}

      {jobs.length === 0 ? (
        <p className="text-sm text-zinc-500">검수할 공고가 없어요.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
          {jobs.map((job) => (
            <li key={job.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {job.company} — {job.title}
                </p>
                <p className="text-xs text-zinc-500">
                  {seoulDate(new Date(job.first_seen_at))} · {job.status} · 한국 거주자 지원{" "}
                  {job.korea_eligible === true ? "가능" : job.korea_eligible === false ? "불가" : "미확인"} ·{" "}
                  {job.eligibility_note ?? "지역 정보 없음"}
                  {job.languages.length > 0 && ` · 작업 언어 ${job.languages.map(languageNameKo).join("·")}`}
                </p>
                <p className="text-xs text-zinc-500">
                  {job.summary_ko.length ? `요약: ${job.summary_ko[0]}` : "요약 없음 — 원문을 보고 작성 필요"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-sm">
                <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-zinc-500 underline">
                  원문
                </a>
                <Link href={`/admin/review/${job.id}`} className="rounded-lg bg-zinc-900 px-3 py-1.5 font-semibold text-white">
                  검수
                </Link>
                <form action={rejectJob}>
                  <input type="hidden" name="id" value={job.id} />
                  <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-zinc-700">
                    반려
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ReviewPage(props: PageProps<"/admin/review">) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}>
      <Queue searchParams={props.searchParams} />
    </Suspense>
  );
}
