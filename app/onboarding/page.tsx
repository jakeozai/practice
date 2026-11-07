import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getProfilePrompt } from "@/lib/profile/prompt";
import { PREFILL_ENABLED, aiPrefillLinks } from "@/lib/profile/prefill";
import { ProfileSchema, type Profile } from "@/lib/profile/parse";
import { createClient } from "@/lib/supabase/server";
import { OnboardingFlow } from "./onboarding-flow";

export const metadata = { title: "프로필 만들기 — AI잡5" };

async function loadSavedProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("profile_json").eq("user_id", userId).maybeSingle();
  return data?.profile_json ? ProfileSchema.parse(data.profile_json) : null;
}

async function Onboarding() {
  const user = await getCurrentUser();
  if (!user) redirect("/?next=/onboarding");

  const [prompt, saved] = await Promise.all([getProfilePrompt(), loadSavedProfile(user.id)]);
  return (
    <OnboardingFlow
      email={user.email}
      prompt={prompt}
      prefillLinks={aiPrefillLinks(prompt, PREFILL_ENABLED)}
      saved={saved}
    />
  );
}

export default function OnboardingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">내 AI로 프로필 만들기</h1>
        <p className="mt-1 text-sm text-zinc-600">
          평소 쓰는 AI가 나를 정리해 주면, 그걸로 매일 아침 맞는 일감을 골라요. 붙여넣은 답변 원문은 저장하지 않아요.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}>
        <Onboarding />
      </Suspense>
    </div>
  );
}
