import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "./login-form";

const ERRORS: Record<string, string> = {
  auth: "링크가 만료됐거나 이미 쓰였어요. 이메일을 다시 넣어 주세요.",
};

async function LoginSection({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;
  return (
    <>
      {error && (
        <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      {next && !error && <p className="mb-3 text-sm text-muted">계속하려면 이메일로 로그인해 주세요.</p>}
      <LoginForm next={next} />
    </>
  );
}

const STEPS = ["이메일 입력", "내 AI로 1분 분석 (선택)", "매일 아침 3개 도착"];

export default function Home(props: PageProps<"/">) {
  return (
    <div className="space-y-12 pt-6 sm:pt-12">
      <section className="space-y-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- small static SVG logo */}
        <img src="/duck.svg" alt="" width={64} height={74} />
        <h1 className="text-[2rem] font-extrabold leading-tight tracking-tight sm:text-5xl">
          매일 아침 6시,
          <br />
          단기 일감 3개를
          <br className="sm:hidden" /> 물어다 드려요
        </h1>
        <p className="text-lg text-muted">영상·디자인·개발·AI 작업까지, 전 세계 단기 일감 중 나에게 맞는 것만 한국어로.</p>
        <Suspense fallback={<div className="h-28" />}>
          <LoginSection searchParams={props.searchParams} />
        </Suspense>
      </section>

      <ol className="grid gap-2 text-sm sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-2 rounded-full bg-[var(--card)] px-4 py-2.5">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--ink)] text-xs font-bold text-white">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      <section className="card space-y-1.5 text-sm">
        <p className="font-bold">무료예요. 해지도 한 번이면 끝나요</p>
        <p className="text-muted">
          받은 메일 맨 아래 <strong className="text-[var(--ink)]">[메일 그만 받기]</strong>를 누르면 바로 멈춰요. 이메일과 분석
          결과까지 모두 지우려면{" "}
          <Link href="/account" className="font-semibold underline underline-offset-2">
            내 정보
          </Link>
          에서 탈퇴하세요.
        </p>
      </section>
    </div>
  );
}
