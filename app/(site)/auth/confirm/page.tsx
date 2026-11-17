import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { confirmLogin } from "./actions";
import { ConfirmButton } from "./confirm-button";
import { SubscribeForm } from "@/app/subscribe-form";
import { getCurrentUser, safeNextPath } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { SIGNUP_AGREEMENT } from "@/lib/terms";

export const metadata = { title: `${BRAND.name} 시작하기` };

/**
 * Landing page of the confirmation mail. Opening it changes nothing (mail
 * scanners open links too); the button spends the one-time token. Someone
 * already signed in on this browser (a second click on the same mail) goes
 * straight on; an expired or used link says so here, with a new-mail form.
 */
async function ConfirmForm({ searchParams }: { searchParams: PageProps<"/auth/confirm">["searchParams"] }) {
  const params = await searchParams;
  const value = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : "");
  const next = safeNextPath(value("next"));

  if (await getCurrentUser()) redirect(next);

  if (value("error") || !value("token_hash")) {
    return (
      <div className="space-y-2 text-left">
        <p className="alert-error" role="alert">
          {value("error") ? "링크가 만료됐거나 이미 사용됐어요." : "링크가 올바르지 않아요."} 이메일을 넣으면 새 확인 메일을 보내드려요.
        </p>
        <SubscribeForm id="confirm-email" next={next} />
      </div>
    );
  }
  return (
    <form action={confirmLogin} className="space-y-3">
      <input type="hidden" name="token_hash" value={value("token_hash")} />
      <input type="hidden" name="type" value={value("type") || "magiclink"} />
      <input type="hidden" name="next" value={next} />
      {value("agree") === "missing" && (
        <p className="alert-error" role="alert">
          시작하려면 아래 항목에 체크해 주세요.
        </p>
      )}
      <div className="rounded-2xl border border-[var(--line)] p-4 text-left text-sm leading-relaxed">
        <label className="flex min-h-[44px] cursor-pointer items-start gap-3">
          <input type="checkbox" name="agree" value="1" required className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--accent)]" />
          <span>
            <strong>[필수]</strong> {SIGNUP_AGREEMENT}
          </span>
        </label>
        <p className="mt-1 pl-8 text-muted">
          <Link href="/terms" target="_blank" className="underline underline-offset-2">
            이용약관
          </Link>
          {" · "}
          <Link href="/privacy" target="_blank" className="underline underline-offset-2">
            개인정보 처리방침
          </Link>
          <br />
          {BRAND.name}은 공고를 소개만 해요. 공고 내용과 지원 뒤 거래는 의뢰인 책임이고, 사기 의심 공고는 신고하면 운영자가 확인해요.
        </p>
      </div>
      <ConfirmButton />
      <p className="text-sm text-muted">누르면 구독이 확인되고, 바로 1분 분석으로 넘어가요.</p>
    </form>
  );
}

export default function ConfirmPage(props: PageProps<"/auth/confirm">) {
  return (
    <div className="mx-auto max-w-md space-y-6 pt-8 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- small static SVG logo */}
      <img src="/brand/duckjob-appicon.svg" alt="" width={64} height={64} className="mx-auto" />
      <h1 className="text-2xl font-extrabold tracking-tight">{BRAND.name}에 오신 걸 환영해요</h1>
      <Suspense fallback={<div className="h-12" />}>
        <ConfirmForm searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
