import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getProfilePrompt } from "@/lib/profile/prompt";
import { ProfileSchema, type Profile } from "@/lib/profile/parse";
import { createClient } from "@/lib/supabase/server";
import { nextMailJobs } from "@/lib/digest/candidates";
import { formatPay } from "@/lib/jobs/format";
import { appEnv } from "@/lib/env";
import { SEND_HOUR_KST, SERVICE_TIME_ZONE } from "@/lib/time";
import { OnboardingFlow, type PreviewJob } from "./onboarding-flow";

export const metadata = { title: "AI로 나를 분석하기 — 덕잡" };

async function loadSavedProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("profile_json").eq("user_id", userId).maybeSingle();
  return data?.profile_json ? ProfileSchema.parse(data.profile_json) : null;
}

/**
 * The jobs this subscriber's next mail would carry, shown on the "done" screen
 * so they see what they signed up for right away. Only our Korean summary and
 * the original link (CLAUDE.md rule 1). Best effort: no preview on error.
 */
async function loadPreview(userId: string): Promise<PreviewJob[]> {
  try {
    const jobs = await nextMailJobs(await createClient(), userId, appEnv().DIGEST_SIZE);
    return jobs.map((j) => ({
      id: j.id,
      headline: j.title_ko?.trim() || j.title,
      company: j.company,
      line: j.summary_ko[0] ?? null,
      pay: formatPay(j),
      url: j.url,
    }));
  } catch (e) {
    console.error(`onboarding preview: ${e instanceof Error ? e.message : e}`);
    return [];
  }
}

/** "내일 아침 6시" after today's send, "오늘 아침 6시" before it. */
function nextMailLabel(now = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: SERVICE_TIME_ZONE, hour: "numeric", hourCycle: "h23" }).format(now));
  return `${hour < SEND_HOUR_KST ? "오늘" : "내일"} 아침 ${SEND_HOUR_KST}시`;
}

async function Onboarding() {
  const user = await getCurrentUser();
  if (!user) redirect("/?next=/onboarding");

  const [prompt, saved, preview] = await Promise.all([getProfilePrompt(), loadSavedProfile(user.id), loadPreview(user.id)]);
  return (
    <OnboardingFlow email={user.email} prompt={prompt} saved={saved} preview={preview} nextMail={nextMailLabel()} />
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
