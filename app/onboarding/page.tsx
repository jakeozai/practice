import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getProfilePrompt } from "@/lib/profile/prompt";
import { ProfileSchema, type Profile } from "@/lib/profile/parse";
import { createClient } from "@/lib/supabase/server";
import { OnboardingFlow } from "./onboarding-flow";

export const metadata = { title: "AI로 나를 분석하기 — 덕잡" };

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
    <OnboardingFlow email={user.email} prompt={prompt} saved={saved} />
  );
}

export default function OnboardingPage() {
  return (
    <div className="space-y-6">
      <p className="text-xs text-zinc-500">AI 답변 원문은 저장하지 않고, 확인한 분석 결과만 저장해요.</p>
      <Suspense fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}>
        <Onboarding />
      </Suspense>
    </div>
  );
}
