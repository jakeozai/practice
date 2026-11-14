"use server";

import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient, type AdminClient } from "@/lib/supabase/admin";
import { ManualJobSchema, manualRawPosting, toJobInsert } from "@/lib/jobs/manual";

export type CreateJobState = {
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

const FIELDS = [
  "company",
  "title",
  "url",
  "summary_ko",
  "category",
  "languages",
  "requires_credential",
  "korea_eligible",
  "eligibility_note",
  "pay_min",
  "pay_max",
  "pay_currency",
  "pay_unit",
  "hours_per_week_min",
  "english_level",
  "status",
] as const;

async function manualSourceId(db: AdminClient): Promise<string> {
  const { data, error } = await db.from("sources").select("id").eq("kind", "manual").limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data.id;
  const created = await db
    .from("sources")
    .insert({ name: "수동 등록", kind: "manual", trusted: true })
    .select("id")
    .single();
  if (created.error) throw new Error(created.error.message);
  return created.data.id;
}

export async function createManualJob(_prev: CreateJobState, formData: FormData): Promise<CreateJobState> {
  if (!(await getAdminUser())) return { message: "관리자만 등록할 수 있어요." };

  const values = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? "")]));
  const parsed = ManualJobSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { message: "입력값을 확인해 주세요.", fieldErrors, values };
  }

  const db = createAdminClient();
  const raw = await db
    .from("raw_postings")
    .insert(manualRawPosting(parsed.data, await manualSourceId(db)))
    .select("id")
    .single();
  if (raw.error) {
    if (raw.error.code === "23505") {
      return { message: "이미 등록된 원문 주소예요.", fieldErrors: { url: "이미 등록된 원문 주소예요." }, values };
    }
    return { message: `저장하지 못했어요: ${raw.error.message}`, values };
  }

  const job = await db.from("jobs").insert(toJobInsert(parsed.data, raw.data.id, new Date())).select("id").single();
  if (job.error) {
    await db.from("raw_postings").delete().eq("id", raw.data.id);
    return { message: `저장하지 못했어요: ${job.error.message}`, values };
  }

  redirect(`/admin?created=${job.data.id}`);
}
