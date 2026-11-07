"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ManualJobSchema, toJobFields } from "@/lib/jobs/manual";
import type { CreateJobState } from "../jobs/new/actions";

const JobId = z.uuid();

/** Save the admin's edits and approve (bound to the job id). */
export async function approveJob(id: string, _prev: CreateJobState, formData: FormData): Promise<CreateJobState> {
  if (!(await getAdminUser())) return { message: "관리자만 승인할 수 있어요." };
  const jobId = JobId.safeParse(id);
  if (!jobId.success) return { message: "잘못된 공고예요." };

  const values = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  const parsed = ManualJobSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    return { message: "입력값을 확인해 주세요.", fieldErrors, values };
  }

  const { error } = await createAdminClient()
    .from("jobs")
    .update({ ...toJobFields(parsed.data), review_state: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", jobId.data);
  if (error) return { message: `저장하지 못했어요: ${error.message}`, values };
  redirect("/admin/review?done=approved");
}

/** Reject from the review queue (plain form POST). */
export async function rejectJob(formData: FormData): Promise<void> {
  if (!(await getAdminUser())) throw new Error("not an admin");
  const jobId = JobId.parse(formData.get("id"));
  const { error } = await createAdminClient()
    .from("jobs")
    .update({ review_state: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", jobId);
  if (error) throw new Error(error.message);
  redirect("/admin/review?done=rejected");
}
