import { Suspense } from "react";
import { connection } from "next/server";
import { verifyLink } from "@/lib/links";
import { linkEnv } from "@/lib/env";
import { isMailRating, MAIL_RATINGS, MAIL_RATING_KEYS, RATE_COMMENT_MAX } from "@/lib/feedback";
import { koreanMonthDay } from "@/lib/time";

export const metadata = { title: "오늘 메일 어땠어요? — 덕잡", robots: { index: false } };

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="card">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-1 text-sm text-[var(--ink-3)]">{body}</p>
    </div>
  );
}

/**
 * Opened by the 👍 😐 👎 buttons at the end of the daily mail. Nothing is saved
 * until [보내기] (a GET from a mail link never changes state, CLAUDE.md rule 8).
 */
async function Rate({ searchParams }: { searchParams: PageProps<"/rate">["searchParams"] }) {
  await connection();
  const params = await searchParams;
  const t = typeof params.t === "string" ? params.t : "";
  const picked = isMailRating(params.r) ? params.r : "good";

  if (params.done === "1") {
    return <Message title="보내 줘서 고마워요" body="남겨 주신 평가와 의견은 운영자가 직접 읽고, 더 잘 맞는 일감을 고르는 데 참고할게요." />;
  }

  const v = t ? verifyLink(t, "rate", linkEnv().EMAIL_LINK_SECRET) : null;
  if (!v?.ok || !v.payload.date || params.error === "invalid") {
    return <Message title="링크를 확인할 수 없어요" body="메일 맨 아래의 평가 버튼을 다시 눌러 주세요." />;
  }
  if (v.expired || params.error === "expired") {
    return <Message title="기간이 지난 링크예요" body="메일을 받은 지 30일이 지나면 평가를 남길 수 없어요." />;
  }

  return (
    // Plain form POST: works without JavaScript.
    <form method="post" action={`/api/rate?t=${encodeURIComponent(t)}`} className="card space-y-5">
      <div>
        <p className="text-sm text-muted">{koreanMonthDay(v.payload.date)} 메일</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">오늘 메일 어땠어요?</h1>
      </div>
      {(params.error === "server" || params.error === "form") && (
        <p className="alert-error text-sm" role="alert">
          저장하지 못했어요. 잠시 후 다시 보내 주세요.
        </p>
      )}
      <fieldset className="grid grid-cols-3 gap-2">
        <legend className="sr-only">평가</legend>
        {MAIL_RATING_KEYS.map((key) => (
          <label
            key={key}
            className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl border border-[var(--line)] px-2 py-4 text-sm font-semibold has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]"
          >
            <input type="radio" name="rating" value={key} defaultChecked={key === picked} className="sr-only" />
            <span className="text-3xl" aria-hidden>
              {MAIL_RATINGS[key].emoji}
            </span>
            {MAIL_RATINGS[key].label}
          </label>
        ))}
      </fieldset>
      <label className="block text-sm">
        <span className="text-[var(--ink-3)]">한 줄 의견 (선택)</span>
        <textarea
          name="comment"
          maxLength={RATE_COMMENT_MAX}
          rows={4}
          placeholder="어떤 일감이 좋았는지, 아쉬웠는지, 더 받고 싶은 일이 있는지 편하게 적어 주세요."
          className="field-box mt-1"
        />
      </label>
      <button type="submit" className="btn-primary w-full">
        보내기
      </button>
      <p className="text-xs text-muted">운영자만 읽어요. 다시 보내면 마지막에 보낸 내용으로 바뀌어요.</p>
    </form>
  );
}

export default function RatePage(props: PageProps<"/rate">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">확인하는 중…</p>}>
      <Rate searchParams={props.searchParams} />
    </Suspense>
  );
}
