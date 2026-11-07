import { Suspense } from "react";
import { connection } from "next/server";
import { verifyLink } from "@/lib/links";
import { linkEnv } from "@/lib/env";

export const metadata = { title: "수신거부 — AI잡5", robots: { index: false } };

async function Unsubscribe({ searchParams }: { searchParams: PageProps<"/unsubscribe">["searchParams"] }) {
  const params = await searchParams;
  await connection(); // verifyLink reads the clock: render at request time
  const t = typeof params.t === "string" ? params.t : "";

  if (params.done) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <p className="text-lg font-semibold">수신거부했어요</p>
        <p className="mt-1 text-sm text-zinc-600">이제 AI잡5 아침 메일이 가지 않아요. 그동안 고마웠어요.</p>
      </div>
    );
  }

  const valid = t !== "" && params.error !== "invalid" && verifyLink(t, "unsub", linkEnv().EMAIL_LINK_SECRET).ok;
  if (!valid) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <p className="text-lg font-semibold">링크를 확인할 수 없어요</p>
        <p className="mt-1 text-sm text-zinc-600">가장 최근에 받은 메일 하단의 수신거부 링크를 다시 눌러 주세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
      <p className="text-lg font-semibold">아침 일감 메일을 그만 받을까요?</p>
      <p className="text-sm text-zinc-600">버튼을 누르면 바로 수신거부돼요.</p>
      {params.error === "server" && (
        <p className="text-sm text-red-600" role="alert">
          처리하지 못했어요. 잠시 후 다시 눌러 주세요.
        </p>
      )}
      {/* Plain form POST: works without JavaScript. */}
      <form method="post" action={`/api/email/unsubscribe?t=${encodeURIComponent(t)}`}>
        <input type="hidden" name="confirm" value="1" />
        <button type="submit" className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white">
          수신거부
        </button>
      </form>
    </div>
  );
}

export default function UnsubscribePage(props: PageProps<"/unsubscribe">) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">확인하는 중…</p>}>
      <Unsubscribe searchParams={props.searchParams} />
    </Suspense>
  );
}
