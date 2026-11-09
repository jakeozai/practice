import { Suspense } from "react";
import { getAdminUser } from "@/lib/auth";
import { AdminNav, NotAdmin } from "../../admin-nav";
import { JobForm } from "./job-form";
import { createManualJob } from "./actions";

export const metadata = { title: "공고 수동 등록 — 덕잡" };

async function NewJob() {
  const admin = await getAdminUser();
  if (!admin) return <NotAdmin />;
  return (
    <div className="space-y-6">
      <AdminNav email={admin.email} />
      <div>
        <h1 className="text-xl font-bold">공고 수동 등록</h1>
        <p className="mt-1 text-sm text-zinc-600">
          관리자가 확인한 공고라 등록과 동시에 승인돼요. 메일에는 한국어 요약과 원문 링크만 나가요.
        </p>
      </div>
      <JobForm action={createManualJob} submitLabel="등록 (바로 승인)" />
    </div>
  );
}

export default function NewJobPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}>
      <NewJob />
    </Suspense>
  );
}
