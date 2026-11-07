import { Suspense } from "react";
import { LoginForm } from "./login-form";

const STEPS = [
  { title: "이메일만 입력", body: "비밀번호도 회원정보도 없어요. 메일로 온 링크를 누르면 구독 완료." },
  {
    title: "내 AI가 나를 분석",
    body: "버튼 하나로 평소 쓰는 ChatGPT·Claude·Gemini가 대화 기록으로 나를 분석해요. 나는 확인만.",
  },
  { title: "매일 아침 3개", body: "전 세계·국내 AI 단기 일감 중 나에게 맞는 3개를 한국어 요약과 원문 링크로 보내드려요." },
];

const ERRORS: Record<string, string> = {
  auth: "로그인 링크가 만료됐거나 이미 사용됐어요. 이메일을 다시 입력해 주세요.",
};

async function LoginSection({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;
  return (
    <>
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      {next && !error && (
        <p className="mb-3 rounded-lg bg-zinc-100 px-4 py-3 text-sm text-zinc-700">
          계속하려면 로그인이 필요해요. 이메일을 입력하면 로그인 링크를 보내드려요.
        </p>
      )}
      <LoginForm next={next} />
    </>
  );
}

export default function Home(props: PageProps<"/">) {
  return (
    <div className="space-y-12">
      <section className="space-y-5">
        <p className="text-sm font-semibold text-indigo-600">AI가 필요한 단기 일감, 전 세계와 국내에서</p>
        <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          매일 아침, 나에게 맞는
          <br />
          AI 일감 3개
        </h1>
        <p className="text-zinc-600">
          전 세계 AI 회사·플랫폼에 흩어져 있는 원격 일감(AI 학습·평가, 라벨링, 전사, AI 결과물 검수 등) 중 내 기술로 할
          수 있는 것을 골라 한국어로 요약해 드려요. 원문이 영어여도 괜찮아요. 한국에 살면서 지원할 수 있는 공고만 보내요.
        </p>
        <Suspense fallback={<div className="h-28" />}>
          <LoginSection searchParams={props.searchParams} />
        </Suspense>
      </section>

      <section>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-xl border border-zinc-200 bg-white p-5">
              <p className="text-xs font-semibold text-zinc-400">{i + 1}단계</p>
              <p className="mt-1 font-semibold">{step.title}</p>
              <p className="mt-2 text-sm text-zinc-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
