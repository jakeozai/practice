"use client";

import { useActionState } from "react";
import { requestMagicLink, type MagicLinkState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<MagicLinkState, FormData>(requestMagicLink, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5" role="status">
        <p className="font-semibold text-emerald-900">메일함을 확인해 주세요</p>
        <p className="mt-1 text-sm text-emerald-800">
          <strong>{state.email}</strong>로 로그인 링크를 보냈어요. 링크를 누르면 바로 프로필 만들기로 넘어가요.
        </p>
        <p className="mt-2 text-xs text-emerald-700">메일이 안 보이면 스팸함도 확인해 주세요.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      {next && <input type="hidden" name="next" value={next} />}
      <label htmlFor="email" className="sr-only">
        이메일
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base outline-none focus:border-zinc-900"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
        >
          {pending ? "보내는 중…" : "무료로 받아보기"}
        </button>
      </div>
      {state.status === "error" && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}
      <p className="text-xs text-zinc-500">
        가입하면 매일 아침 일감 메일을 받는 데 동의하는 거예요. 메일 하단에서 언제든 수신거부할 수 있어요.
      </p>
    </form>
  );
}
