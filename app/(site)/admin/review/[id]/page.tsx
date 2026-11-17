import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { jobToFormValues } from "@/lib/jobs/manual";
import { AdminNav, NotAdmin } from "../../admin-nav";
import { JobForm } from "../../jobs/new/job-form";
import { approveJob, rejectJob } from "../actions";
import { REPORT_REASONS, type ReportReason } from "@/lib/feedback";

export const metadata = { title: "공고 검수 — 덕잡" };

async function Review({ params }: { params: PageProps<"/admin/review/[id]">["params"] }) {
  const admin = await getAdminUser();
  if (!admin) return <NotAdmin />;
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();

  const db = createAdminClient();
  const { data: job } = await db.from("jobs").select("*").eq("id", id.data).maybeSingle();
  if (!job) notFound();

  // Source and location only. The posting body is never shown (CLAUDE.md rule 1).
  const { data: raw } = job.raw_posting_id
    ? await db.from("raw_postings").select("title, location_raw, source_id").eq("id", job.raw_posting_id).maybeSingle()
    : { data: null };
  const { data: source } = raw
    ? await db.from("sources").select("name, kind, endpoint").eq("id", raw.source_id).maybeSingle()
    : { data: null };
  const { data: reports } = await db.from("reports").select("id, reason, created_at").eq("job_id", job.id).order("created_at", { ascending: false }).limit(50);
  const reasonLabel = (r: string | null) => {
    const [key, ...note] = (r ?? "").split(": ");
    const label = REPORT_REASONS[key as ReportReason] ?? key;
    return note.length ? `${label} — ${note.join(": ")}` : label;
  };

  return (
    <div className="space-y-6">
      <AdminNav email={admin.email} />
      <div className="space-y-1">
        <Link href="/admin/review" className="text-sm text-zinc-500 underline">
          ← 검수 큐
        </Link>
        <h1 className="text-xl font-bold">{job.title}</h1>
        <p className="text-sm text-zinc-600">
          {source ? `${source.name} (${source.kind}:${source.endpoint})` : "수동 등록"} · 상태 {job.review_state} · 사기 점수{" "}
          {job.scam_score}
          {job.repost_count > 0 && ` · 재게시 ${job.repost_count}회`}
        </p>
        {raw?.location_raw && <p className="text-sm text-zinc-600">원문 지역 표기: {raw.location_raw}</p>}
        <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 underline">
          원문 열기 (새 탭)
        </a>
      </div>

      {(reports?.length ?? 0) > 0 && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <p className="font-semibold">회원 신고 {reports!.length}건</p>
          <ul className="mt-1 list-disc pl-5">
            {reports!.map((r) => (
              <li key={r.id}>
                {new Date(r.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })} · {reasonLabel(r.reason)}
              </li>
            ))}
          </ul>
          <p className="mt-2">사기이거나 사기로 의심할 만하면 아래에서 반려하세요(이용약관 제7조 제5항). 반려하면 모든 회원에게 더 보내지 않아요.</p>
        </section>
      )}

      <JobForm action={approveJob.bind(null, job.id)} initial={jobToFormValues(job)} submitLabel="저장하고 승인" />

      <form action={rejectJob}>
        <input type="hidden" name="id" value={job.id} />
        <button type="submit" className="text-sm text-red-600 underline">
          이 공고 반려 (모든 회원에게 더 보내지 않아요)
        </button>
      </form>
    </div>
  );
}

export default function ReviewJobPage(props: PageProps<"/admin/review/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}>
      <Review params={props.params} />
    </Suspense>
  );
}
