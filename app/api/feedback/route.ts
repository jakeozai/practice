import { NextResponse, type NextRequest } from "next/server";
import { verifyLink } from "@/lib/links";
import { appEnv, linkEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { FeedbackFormSchema, formToObject, reportText } from "@/lib/feedback";

/**
 * POST from the /feedback confirmation page (never GET: mail links are opened
 * by scanners). Both only concern this subscriber (2026-11-14 user decision):
 * "관심 없어요" marks the sent match; "신고" stores a report for the admin.
 * Neither takes the job away from anyone else.
 */
export async function POST(request: NextRequest) {
  const t = request.nextUrl.searchParams.get("t") ?? "";
  const back = (q: string) => NextResponse.redirect(`${appEnv().APP_URL}/feedback?t=${encodeURIComponent(t)}&${q}`, 303);

  const v = verifyLink(t, "feedback", linkEnv().EMAIL_LINK_SECRET);
  if (!v.ok || !v.payload.jobId) return back("error=invalid");
  if (v.expired) return back("error=expired");
  const { uid, jobId } = v.payload;

  const form = FeedbackFormSchema.safeParse(formToObject(await request.formData().catch(() => new FormData())));
  if (!form.success) return back("error=form");

  const db = createAdminClient();
  if (form.data.action === "not_interested") {
    const { error } = await db.from("matches").update({ feedback: "not_interested" }).eq("user_id", uid).eq("job_id", jobId);
    if (error) {
      console.error("feedback update failed", error.message);
      return back("error=server");
    }
    return back("done=not_interested");
  }

  const { error } = await db.from("reports").insert({ user_id: uid, job_id: jobId, reason: reportText(form.data) });
  if (error) {
    console.error("report insert failed", error.message);
    return back("error=server");
  }
  return back("done=report");
}
