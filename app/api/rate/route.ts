import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { verifyLink } from "@/lib/links";
import { adminEmails, appEnv, linkEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAIL_RATINGS, RateFormSchema, type MailRating } from "@/lib/feedback";
import { sendEmail } from "@/lib/email/send";
import { BRAND } from "@/lib/brand";
import { koreanMonthDay } from "@/lib/time";

/**
 * POST from the /rate page (never GET: mail links are opened by scanners).
 * Stores the subscriber's rating of one daily mail, and a comment if written;
 * sending again replaces it. A written comment is also mailed to the operators
 * (2026-11-16 user decision: "내가 받을 수 있게"); ratings alone stay in
 * /admin/feedback so the daily mail quota isn't spent on them.
 */
export async function POST(request: NextRequest) {
  const t = request.nextUrl.searchParams.get("t") ?? "";
  const back = (q: string) => NextResponse.redirect(`${appEnv().APP_URL}/rate?t=${encodeURIComponent(t)}&${q}`, 303);

  const v = verifyLink(t, "rate", linkEnv().EMAIL_LINK_SECRET);
  if (!v.ok || !v.payload.date) return back("error=invalid");
  if (v.expired) return back("error=expired");
  const { uid, date } = v.payload;

  const form = await request.formData().catch(() => new FormData());
  const parsed = RateFormSchema.safeParse({ rating: form.get("rating"), comment: form.get("comment") ?? undefined });
  if (!parsed.success) return back("error=form");
  const { rating, comment } = parsed.data;

  const db = createAdminClient();
  const { error } = await db
    .from("mail_feedback")
    .upsert({ user_id: uid, send_date: date, rating, comment: comment || null, updated_at: new Date().toISOString() }, { onConflict: "user_id,send_date" });
  if (error) {
    console.error("mail feedback upsert failed", error.message);
    return back("error=server");
  }

  if (comment) await notifyOperators(rating, comment, date);
  return back("done=1");
}

async function notifyOperators(rating: MailRating, comment: string, date: string) {
  const { emoji, label } = MAIL_RATINGS[rating];
  const day = koreanMonthDay(date);
  const adminUrl = `${appEnv().APP_URL}/admin/feedback`;
  const key = createHash("sha256").update(`${date}\n${rating}\n${comment}`).digest("hex").slice(0, 24);
  const escaped = comment.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!);
  for (const to of adminEmails()) {
    try {
      await sendEmail({
        to,
        subject: `[${BRAND.name}] 새 의견 ${emoji} ${label} (${day} 메일)`,
        text: `${day} 메일에 ${emoji} ${label} 평가와 의견이 왔어요.\n\n${comment}\n\n모아 보기: ${adminUrl}`,
        html: `<p>${day} 메일에 ${emoji} <strong>${label}</strong> 평가와 의견이 왔어요.</p><blockquote style="white-space:pre-wrap">${escaped}</blockquote><p><a href="${adminUrl}">모아 보기</a></p>`,
        headers: {},
        idempotencyKey: `rate-${key}-${to}`,
      });
    } catch (e) {
      // The feedback is saved; the notice is a convenience.
      console.error("feedback notice failed", (e as Error).message);
    }
  }
}
