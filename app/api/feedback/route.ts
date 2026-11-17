import { NextResponse, type NextRequest } from "next/server";
import { verifyLink } from "@/lib/links";
import { adminEmails, appEnv, linkEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { FeedbackFormSchema, REPORT_REASONS, formToObject, reportText, type FeedbackForm } from "@/lib/feedback";
import { sendEmail } from "@/lib/email/send";
import { BRAND } from "@/lib/brand";

/**
 * POST from the /feedback confirmation page (never GET: mail links are opened
 * by scanners). Both only concern this subscriber (2026-11-14 user decision):
 * "관심 없어요" marks the sent match; "신고" stores a report and mails the
 * operators a link to the job's review page. Neither takes the job away from
 * anyone else by itself: the operator decides, and rejecting the job there
 * stops it for everyone (이용약관 제7조 제5항).
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

  const { data: report, error } = await db.from("reports").insert({ user_id: uid, job_id: jobId, reason: reportText(form.data) }).select("id").single();
  if (error) {
    console.error("report insert failed", error.message);
    return back("error=server");
  }
  await notifyOperators(db, report.id, jobId, form.data);
  return back("done=report");
}

/** One mail per report to the operators; the report is saved either way. */
async function notifyOperators(
  db: ReturnType<typeof createAdminClient>,
  reportId: string,
  jobId: string,
  form: Extract<FeedbackForm, { action: "report" }>,
) {
  const { data: job } = await db.from("jobs").select("title, title_ko, company").eq("id", jobId).maybeSingle();
  const title = job ? `${job.title_ko || job.title}${job.company ? ` · ${job.company}` : ""}` : "(지워진 공고)";
  const reason = REPORT_REASONS[form.reason];
  const reviewUrl = `${appEnv().APP_URL}/admin/review/${jobId}`;
  const esc = (v: string) => v.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);
  const urgent = form.reason === "scam";
  for (const to of adminEmails()) {
    try {
      await sendEmail({
        to,
        subject: `[${BRAND.name}] ${urgent ? "⚠️ 사기 의심 신고" : "공고 신고"}: ${title}`.slice(0, 150),
        text:
          `공고 신고가 왔어요.\n\n공고: ${title}\n사유: ${reason}` +
          (form.note ? `\n내용: ${form.note}` : "") +
          `\n\n확인하고, 문제가 있으면 반려해 주세요(반려하면 모든 회원에게 더 보내지 않아요): ${reviewUrl}`,
        html:
          `<p>공고 신고가 왔어요.</p><p><strong>공고</strong>: ${esc(title)}<br><strong>사유</strong>: ${esc(reason)}` +
          (form.note ? `<br><strong>내용</strong>: <span style="white-space:pre-wrap">${esc(form.note)}</span>` : "") +
          `</p><p><a href="${reviewUrl}">공고 확인하기</a> · 반려하면 모든 회원에게 더 보내지 않아요.</p>`,
        headers: {},
        idempotencyKey: `report-${reportId}-${to}`,
      });
    } catch (e) {
      console.error("report notice failed", (e as Error).message);
    }
  }
}
