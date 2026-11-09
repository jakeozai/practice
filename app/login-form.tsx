"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestMagicLink, type MagicLinkState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<MagicLinkState, FormData>(requestMagicLink, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div className="card" role="status">
        <p className="text-lg font-bold">메일함을 확인해 주세요</p>
        <p className="mt-1 text-sm text-muted">
          <strong className="text-[var(--ink)]">{state.email}</strong>로 보낸 메일의 [시작하기]를 누르면 끝이에요. 안 보이면 스팸함도
          확인해 주세요.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      {next && <input type="hidden" name="next" value={next} />}
      {/* Honeypot: hidden from people, filled by naive bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
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
          placeholder="이메일 주소"
          className="field min-w-0 flex-1"
        />
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "보내는 중…" : "무료로 받기"}
        </button>
      </div>
      {state.status === "error" && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}
      <p className="text-xs leading-relaxed text-muted">
        메일을 보내려고 이메일 주소를 처리해요. 자세한 내용은{" "}
        <Link href="/privacy" className="font-semibold underline underline-offset-2">
          개인정보 처리방침
        </Link>
        에 있어요. 수신거부는 메일 하단에서 언제든 할 수 있고, 만 14세 미만은 가입할 수 없어요.
      </p>
    </form>
  );
}
