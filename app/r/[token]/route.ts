import { NextResponse } from "next/server";
import { verifyLink } from "@/lib/links";
import { appEnv, linkEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Mail "자세히 보고 지원 준비" link. Records the click (statistics only; the
 * one GET that writes, see lib/links.ts) and redirects.
 *
 * Phase 0 redirects straight to the original posting. Phase 2 switches the
 * target to /j/[id] once the detail page exists.
 */
export async function GET(_request: Request, ctx: RouteContext<"/r/[token]">) {
  const { token } = await ctx.params;
  const { APP_URL } = appEnv();
  const home = NextResponse.redirect(`${APP_URL}/`, 302);

  const v = verifyLink(token, "click", linkEnv().EMAIL_LINK_SECRET);
  if (!v.ok || !v.payload.jobId) return home;
  const { uid, jobId } = v.payload;

  const db = createAdminClient();
  const { data: job } = await db.from("jobs").select("url, review_state").eq("id", jobId).maybeSingle();

  if (!v.expired) {
    const now = new Date().toISOString();
    const [click, opened] = await Promise.all([
      db.from("matches").update({ clicked_at: now }).eq("user_id", uid).eq("job_id", jobId).is("clicked_at", null),
      db.from("profiles").update({ last_opened_at: now }).eq("user_id", uid),
    ]);
    if (click.error || opened.error) console.error("click record failed", click.error?.message ?? opened.error?.message);
  }

  if (!job || job.review_state !== "approved") return home;
  const res = NextResponse.redirect(job.url, 302);
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("Cache-Control", "no-store");
  return res;
}
