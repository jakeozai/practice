import { Suspense } from "react";
import { redirect } from "next/navigation";
import { confirmLogin } from "./actions";
import { ConfirmButton } from "./confirm-button";
import { SubscribeForm } from "@/app/subscribe-form";
import { getCurrentUser, safeNextPath } from "@/lib/auth";
import { BRAND } from "@/lib/brand";

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
