import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getProfilePrompt } from "@/lib/profile/prompt";
import { ProfileSchema, type Profile } from "@/lib/profile/parse";
import { createClient } from "@/lib/supabase/server";
import { SEND_HOUR_KST, SERVICE_TIME_ZONE } from "@/lib/time";
import { OnboardingFlow } from "./onboarding-flow";

export const metadata = { title: "AI로 나를 분석하기 — 덕잡" };

async function loadSaved(userId: string): Promise<{ profile: Profile | null; rawConsent: boolean }> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("profile_json, raw_consent_at").eq("user_id", userId).maybeSingle();
  return { profile: data?.profile_json ? ProfileSchema.parse(data.profile_json) : null, rawConsent: Boolean(data?.raw_consent_at) };
}

/** "내일 아침 6시" after today's send, "오늘 아침 6시" before it. */
function nextMailLabel(now = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: SERVICE_TIME_ZONE, hour: "numeric", hourCycle: "h23" }).format(now));
  return `${hour < SEND_HOUR_KST ? "오늘" : "내일"} 아침 ${SEND_HOUR_KST}시`;
}

async function Onboarding() {
  const user = await getCurrentUser();
  if (!user) redirect("/account?next=/onboarding");

  const [prompt, saved] = await Promise.all([getProfilePrompt(), loadSaved(user.id)]);
  return <OnboardingFlow email={user.email} prompt={prompt} saved={saved.profile} rawConsent={saved.rawConsent} nextMail={nextMailLabel()} />;
}

export default function OnboardingPage() {
  return (
    <div className="space-y-6">
      <p className="text-xs text-muted">확인한 분석 결과만 저장해요. AI 답변 원문은 ‘기업 제안 받기’를 켠 경우에만 보관해요.</p>
      <Suspense fallback={<p className="text-sm text-muted">불러오는 중…</p>}>
        <Onboarding />
      </Suspense>
    </div>
  );
}
