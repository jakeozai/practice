import { Suspense } from "react";
import { LoginForm } from "./login-form";

const STEPS = [
  { title: "이메일로 가입", body: "비밀번호 없이 메일로 온 링크만 누르면 끝이에요." },
  {
    title: "내 AI로 프로필 가져오기",
    body: "ChatGPT·Claude·Gemini에 프롬프트를 붙여넣으면, AI가 나를 정리해 줘요. 그 답을 붙여넣기만 하면 돼요.",
  },
  { title: "매일 아침 5개", body: "한국어 3줄 요약과 원문 링크로, 나에게 맞는 원격 AI 일감을 보내드려요." },
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
        <p className="text-sm font-semibold text-indigo-600">학위·자격증 없이 하는 원격 AI 일감</p>
        <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          매일 아침, 나에게 맞는
          <br />
          AI 일감 5개
        </h1>
        <p className="text-zinc-600">
          AI 학습·평가, 라벨링, 전사, AI 결과물 검수처럼 집에서 할 수 있는 해외 플랫폼 일감을 골라 한국어로 요약해
          드려요. 한국에서 지원 가능한 공고만 보내요.
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
