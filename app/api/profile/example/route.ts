import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { exampleMailJobs } from "@/lib/digest/candidates";

/** The onboarding finish screen's five example jobs, for the signed-in person (after their profile is saved). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const jobs = await exampleMailJobs(await createClient(), user.id);
    return NextResponse.json({ ok: true, jobs });
  } catch (e) {
    console.error(`example jobs: ${e instanceof Error ? e.message : e}`);
    return NextResponse.json({ ok: true, jobs: [] });
  }
}
