import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteAccount, setDigest } from "./actions";

export const metadata = { title: "내 정보 — 덕잡", robots: { index: false } };

async function Account({ searchParams }: { searchParams: PageProps<"/account">["searchParams"] }) {
  const user = await getCurrentUser();
  if (!user) redirect("/?next=/account");
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("digest_status").eq("user_id", user.id).maybeSingle();
  const active = data?.digest_status === "active";

  return (
    <div className="space-y-4">
      <div className="card">
        <p className="text-sm text-muted">{user.email}</p>
        <p className="mt-1 text-lg font-bold">{active ? "매일 아침 메일을 받고 있어요" : "메일을 받지 않고 있어요"}</p>
        {data?.digest_status !== "bounced" && (
          <form action={setDigest} className="mt-4">
            <input type="hidden" name="on" value={active ? "0" : "1"} />
            <button type="submit" className={active ? "btn-secondary" : "btn-primary"}>
              {active ? "메일 그만 받기" : "다시 받기"}
            </button>
          </form>
        )}
        <p className="mt-4 text-sm">
          <Link href="/onboarding" className="link-muted">
            분석 결과 보기·고치기
          </Link>
        </p>
      </div>

      <details className="card">
        <summary className="cursor-pointer text-sm font-semibold">탈퇴하기</summary>
        <form action={deleteAccount} className="mt-4 space-y-3">
          <p className="text-sm text-muted">이메일, 분석 결과, 받은 메일 기록이 모두 바로 지워져요. 확인하려면 아래에 탈퇴라고 적어 주세요.</p>
          <input name="confirm" className="field-box max-w-40" placeholder="탈퇴" aria-label="확인 문구" />
          <button type="submit" className="btn-secondary">
            탈퇴하고 모두 지우기
          </button>
        </form>
      </details>

      {params.error && (
        <p className="text-sm text-red-600" role="alert">
          {params.error === "confirm" ? "확인 문구를 정확히 적어 주세요." : "처리하지 못했어요. 잠시 후 다시 시도해 주세요."}
        </p>
      )}
    </div>
  );
}

export default function AccountPage(props: PageProps<"/account">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">불러오는 중…</p>}>
      <Account searchParams={props.searchParams} />
    </Suspense>
  );
}
