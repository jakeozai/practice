import { Suspense } from "react";
import { verifyLink } from "@/lib/links";
import { linkEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { REPORT_REASONS } from "@/lib/feedback";

export const metadata = { title: "관심 없어요·신고 — 덕잡", robots: { index: false } };

const box = "card";

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className={box}>
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-1 text-sm text-[var(--ink-3)]">{body}</p>
    </div>
  );
}

async function Feedback({ searchParams }: { searchParams: PageProps<"/feedback">["searchParams"] }) {
  const params = await searchParams;
  const supabase = await createClient(); // also marks the page dynamic (request time)
  const t = typeof params.t === "string" ? params.t : "";

  if (params.done === "not_interested") {
    return <Message title="알려줘서 고마워요" body="이 일감은 다시 보내지 않아요. 다음 추천에 참고할게요." />;
  }
  if (params.done === "report") {
    return <Message title="신고를 받았어요" body="운영자가 확인할게요. 이 일감은 다시 보내지 않아요. 고마워요." />;
  }

  const v = t ? verifyLink(t, "feedback", linkEnv().EMAIL_LINK_SECRET) : null;
  if (!v?.ok || !v.payload.jobId || params.error === "invalid") {
    return <Message title="링크를 확인할 수 없어요" body="메일에 있는 [관심 없어요·신고] 링크를 다시 눌러 주세요." />;
  }
  if (v.expired || params.error === "expired") {
    return <Message title="기간이 지난 링크예요" body="메일을 받은 지 30일이 지나면 의견을 남길 수 없어요." />;
  }

  // Approved jobs are publicly readable (RLS); a pulled job just shows no title.
  const { data: job } = await supabase.from("jobs").select("title, title_ko, company").eq("id", v.payload.jobId).maybeSingle();
  const action = `/api/feedback?t=${encodeURIComponent(t)}`;

  return (
    <div className="space-y-4">
      <div className={box}>
        {job && (
          <p className="mb-3 text-sm text-muted">
            {job.company} · {job.title_ko || job.title}
          </p>
        )}
        <p className="text-lg font-semibold">이 일감은 관심 없어요</p>
        <p className="mt-1 text-sm text-[var(--ink-3)]">이 일감은 다시 보내지 않아요. 누르면 내 추천에 참고해요.</p>
        {(params.error === "server" || params.error === "form") && (
          <p className="mt-2 text-sm text-error" role="alert">
            처리하지 못했어요. 잠시 후 다시 눌러 주세요.
          </p>
        )}
        {/* Plain form POST: works without JavaScript. */}
        <form method="post" action={action} className="mt-4">
          <input type="hidden" name="action" value="not_interested" />
          <button type="submit" className="btn-primary">
            관심 없어요
          </button>
        </form>
      </div>

      <form method="post" action={action} className={`${box} space-y-3`}>
        <input type="hidden" name="action" value="report" />
        <p className="text-lg font-semibold">문제가 있는 일감인가요?</p>
        <fieldset className="space-y-2">
          <legend className="sr-only">신고 이유</legend>
          {Object.entries(REPORT_REASONS).map(([key, label], i) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input type="radio" name="reason" value={key} required defaultChecked={i === 0} />
              {label}
            </label>
          ))}
        </fieldset>
        <label className="block text-sm">
          <span className="text-[var(--ink-3)]">덧붙일 말 (선택, 300자까지)</span>
          <textarea name="note" maxLength={300} rows={2} className="field-box mt-1" />
        </label>
        <button type="submit" className="btn-secondary">
          신고하기
        </button>
      </form>
    </div>
  );
}

export default function FeedbackPage(props: PageProps<"/feedback">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">확인하는 중…</p>}>
      <Feedback searchParams={props.searchParams} />
    </Suspense>
  );
}
