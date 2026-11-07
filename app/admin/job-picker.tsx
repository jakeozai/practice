"use client";

import { useState } from "react";

export type PickableJob = {
  id: string;
  company: string;
  title: string;
  status: string;
  firstSeen: string;
  /** Why it can't be mailed, or null if it can. */
  blocked: string | null;
  /** Work languages beyond Korean/English: most subscribers can't do these. */
  otherLanguages: string[];
};

/** Pick up to `max` jobs and get the send-manual command for them. */
export function JobPicker({ jobs, max }: { jobs: PickableJob[]; max: number }) {
  const [picked, setPicked] = useState<string[]>([]);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < max ? [...p, id] : p));

  const base = `npm run send:manual -- ${picked.join(" ")}`;

  if (jobs.length === 0) {
    return <p className="text-sm text-zinc-500">보낼 수 있는 공고가 없어요. 먼저 공고를 등록해 주세요.</p>;
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
        {jobs.map((job) => {
          const order = picked.indexOf(job.id);
          return (
            <li key={job.id} className="flex items-start gap-3 px-4 py-3">
              <input
                type="checkbox"
                className="mt-1"
                aria-label={`${job.company} ${job.title} 선택`}
                checked={order !== -1}
                disabled={Boolean(job.blocked) || (order === -1 && picked.length >= max)}
                onChange={() => toggle(job.id)}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {order !== -1 && <span className="mr-1 text-indigo-600">#{order + 1}</span>}
                  {job.company} — {job.title}
                </p>
                <p className="text-xs text-zinc-500">
                  {job.status} · 등록 {job.firstSeen}
                  {job.blocked && <span className="ml-2 text-amber-700">발송 불가: {job.blocked}</span>}
                  {!job.blocked && job.otherLanguages.length > 0 && (
                    <span className="ml-2 text-amber-700">필요 언어 {job.otherLanguages.join("·")} — 대부분 구독자에게 안 맞음</span>
                  )}
                </p>
                <p className="font-mono text-[11px] text-zinc-400">{job.id}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="space-y-2 rounded-xl bg-zinc-900 p-4 text-xs text-zinc-100">
        <p className="text-zinc-400">
          {picked.length}/{max}개 선택. 먼저 미리보기로 확인한 뒤 <code>--send</code>를 붙여 보내세요.
        </p>
        {picked.length > 0 ? (
          <>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all"># 미리보기{"\n"}{base}</pre>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all"># 나에게만 테스트 발송{"\n"}{base} --only 내이메일 --send</pre>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all"># 전체 발송{"\n"}{base} --send</pre>
          </>
        ) : (
          <p>보낼 공고를 순서대로 체크하세요.</p>
        )}
      </div>
    </div>
  );
}
