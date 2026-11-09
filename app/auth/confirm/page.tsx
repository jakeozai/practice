import { Suspense } from "react";
import { confirmLogin } from "./actions";
import { BRAND } from "@/lib/brand";

export const metadata = { title: `${BRAND.name} 시작하기` };

/**
 * Landing page of the sign-in mail. Opening it changes nothing (mail scanners
 * open links too); the button below spends the one-time token.
 */
async function ConfirmForm({ searchParams }: { searchParams: PageProps<"/auth/confirm">["searchParams"] }) {
  const params = await searchParams;
  const value = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : "");
  const tokenHash = value("token_hash");

  if (!tokenHash) {
    return <p className="text-sm text-[var(--muted)]">링크가 올바르지 않아요. 처음 화면에서 이메일을 다시 입력해 주세요.</p>;
  }
  return (
    <form action={confirmLogin}>
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={value("type") || "magiclink"} />
      <input type="hidden" name="next" value={value("next") || "/onboarding"} />
      <button type="submit" className="btn-primary w-full">
        시작하기
      </button>
    </form>
  );
}

export default function ConfirmPage(props: PageProps<"/auth/confirm">) {
  return (
    <div className="mx-auto max-w-sm space-y-6 pt-10 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- small static SVG logo */}
      <img src="/duck.svg" alt="" width={72} height={83} className="mx-auto" />
      <h1 className="text-2xl font-bold tracking-tight">{BRAND.name}에 오신 걸 환영해요</h1>
      <Suspense fallback={<div className="h-12" />}>
        <ConfirmForm searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
