"use client";

import { useActionState, useState } from "react";
import { requestAccountCode, verifyAccountCode, type CodeState } from "./actions";

/**
 * 내 정보 on a device that isn't signed in, without leaving the page:
 * email → six-digit code from the mail → 내 정보 opens. Typing an email
 * alone never opens anything: only the inbox's owner gets the code.
 */
export function AccountAccess({ next }: { next?: string }) {
  const [sent, requestCode, requesting] = useActionState<CodeState, FormData>(requestAccountCode, { status: "idle" });
  const [checked, verify, verifying] = useActionState<CodeState, FormData>(verifyAccountCode, { status: "idle" });
  const [changeEmail, setChangeEmail] = useState(false);

  const email = (checked.status !== "idle" && "email" in checked && checked.email) || (sent.status !== "idle" && "email" in sent && sent.email) || "";
  const codeStep = !changeEmail && (sent.status === "sent" || checked.status === "error" || (sent.status === "error" && Boolean(sent.email)));
  const error = codeStep ? (checked.status === "error" ? checked.message : sent.status === "error" ? sent.message : null) : sent.status === "error" ? sent.message : null;

  if (!codeStep) {
    return (
      <div className="card space-y-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">내 정보</h1>
          <p className="mt-2 text-sm text-muted">구독한 이메일을 적으면 확인 코드를 보내드려요. 코드를 입력하면 분석 결과를 고치거나 해지·탈퇴할 수 있어요.</p>
        </div>
        <form
          action={(fd) => {
            setChangeEmail(false);
            requestCode(fd);
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <label htmlFor="account-email" className="sr-only">
            이메일 주소
          </label>
          <input id="account-email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="이메일 주소" defaultValue={email} required className="field min-w-0 flex-1" />
          <button type="submit" disabled={requesting} className="btn-primary">
            {requesting ? "보내는 중…" : "확인 코드 받기"}
          </button>
        </form>
        {error && (
          <p className="alert-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">메일로 온 코드를 입력해 주세요</h1>
        <p className="mt-2 text-sm text-muted">
          <strong className="text-[var(--ink)]">{email}</strong>로 6자리 숫자를 보냈어요. 안 보이면 스팸함도 확인해 주세요.
        </p>
      </div>
      <form action={verify} className="flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="email" value={email} />
        {next && <input type="hidden" name="next" value={next} />}
        <label htmlFor="account-code" className="sr-only">
          확인 코드
        </label>
        <input
          id="account-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={10}
          placeholder="000000"
          required
          autoFocus
          className="field mono min-w-0 flex-1 text-center text-2xl tracking-[0.3em]"
        />
        <button type="submit" disabled={verifying} className="btn-primary">
          {verifying ? "확인하는 중…" : "확인"}
        </button>
      </form>
      {error && (
        <p className="alert-error" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-4 text-sm">
        <form action={requestCode}>
          <input type="hidden" name="email" value={email} />
          <button type="submit" disabled={requesting} className="link-muted">
            {requesting ? "보내는 중…" : "코드 다시 받기"}
          </button>
        </form>
        <button type="button" className="link-muted" onClick={() => setChangeEmail(true)}>
          다른 이메일로 할게요
        </button>
      </div>
    </div>
  );
}
