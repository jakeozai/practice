"use client";

import { APPLICATION_STATUSES } from "@/lib/applications";

/** Saves as soon as a status is picked; the button is there when JavaScript is off. */
export function StatusSelect(props: { jobId: string; value: string; action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={props.action} className="flex items-center gap-2">
      <input type="hidden" name="jobId" value={props.jobId} />
      <select
        name="status"
        defaultValue={props.value}
        aria-label="지원 상태"
        className="field-box py-1 text-sm"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="">아직</option>
        {Object.entries(APPLICATION_STATUSES).map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="text-xs underline">
          저장
        </button>
      </noscript>
    </form>
  );
}
