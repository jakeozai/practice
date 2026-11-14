"use client";

import { useActionState } from "react";
import type { CreateJobState } from "./actions";

const input = "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900";

/** Shared by /admin/jobs/new and the review queue. */
export function JobForm(props: {
  action: (prev: CreateJobState, formData: FormData) => Promise<CreateJobState>;
  initial?: Record<string, string>;
  submitLabel: string;
}) {
  const [state, action, pending] = useActionState<CreateJobState, FormData>(props.action, { values: props.initial });
  const v = state.values ?? {};
  const err = state.fieldErrors ?? {};

  const field = (name: string, label: string, control: React.ReactNode, opts: { wide?: boolean; hint?: string } = {}) => (
    <div className={opts.wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={name} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {control}
      {opts.hint && !err[name] && <p className="mt-1 text-xs text-zinc-500">{opts.hint}</p>}
      {err[name] && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {err[name]}
        </p>
      )}
    </div>
  );

  return (
    // key resets uncontrolled inputs to the values returned with a validation error
    <form action={action} key={JSON.stringify(v)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {field("company", "회사·플랫폼 *", <input id="company" name="company" required defaultValue={v.company} className={input} />)}
        {field("title", "원문 제목 *", <input id="title" name="title" required defaultValue={v.title} className={input} />)}
        {field(
          "url",
          "원문 주소 *",
          <input id="url" name="url" type="url" required defaultValue={v.url} className={input} placeholder="https://" />,
          { wide: true },
        )}
        {field(
          "summary_ko",
          "한국어 요약 (1~3줄, 줄마다 60자 이내) *",
          <textarea id="summary_ko" name="summary_ko" rows={3} required defaultValue={v.summary_ko} className={input} />,
          {
            wide: true,
            hint: "원문을 번역하지 말고 새 문장으로: 무슨 일인지 / 지원 조건 / 보수·시간. 원문 본문은 저장하지 않아요.",
          },
        )}
        {field(
          "korea_eligible",
          "한국 거주자 지원 가능",
          <select id="korea_eligible" name="korea_eligible" defaultValue={v.korea_eligible ?? "true"} className={input}>
            <option value="true">가능</option>
            <option value="false">불가</option>
            <option value="">모름</option>
          </select>,
          { hint: "'가능'인 공고만 메일로 보낼 수 있어요." },
        )}
        {field(
          "eligibility_note",
          "지원 지역 문구",
          <input id="eligibility_note" name="eligibility_note" defaultValue={v.eligibility_note} className={input} placeholder="예: Worldwide" />,
        )}
        {field(
          "status",
          "상태",
          <select id="status" name="status" defaultValue={v.status ?? "open"} className={input}>
            <option value="open">실제 프로젝트 (open)</option>
            <option value="pool">상시 모집·인재풀 (pool)</option>
            <option value="unknown">모름</option>
          </select>,
        )}
        {field(
          "category",
          "분류",
          <select id="category" name="category" defaultValue={v.category ?? ""} className={input}>
            <option value="">선택 안 함</option>
            <option value="language">언어 (평가·번역·전사)</option>
            <option value="domain">전문 분야 평가</option>
            <option value="labeling">라벨링·데이터 수집</option>
            <option value="video">영상 편집·제작</option>
            <option value="design">디자인·사진</option>
            <option value="motion_3d">3D·모션</option>
            <option value="dev">개발·자동화</option>
            <option value="writing">글쓰기</option>
            <option value="other">기타</option>
          </select>,
        )}
        {field(
          "languages",
          "작업 언어",
          <input id="languages" name="languages" defaultValue={v.languages ?? "ko, en"} className={input} />,
          { hint: "ISO 코드, 쉼표로 구분" },
        )}
        {field(
          "english_level",
          "필요 영어 수준",
          <select id="english_level" name="english_level" defaultValue={v.english_level ?? ""} className={input}>
            <option value="">언급 없음</option>
            <option value="none">필요 없음</option>
            <option value="reading">독해</option>
            <option value="conversational">일상 회화</option>
            <option value="business">업무·유창</option>
            <option value="native">원어민</option>
          </select>,
        )}
        {field("pay_min", "보수 최소", <input id="pay_min" name="pay_min" type="number" step="0.01" min={0} defaultValue={v.pay_min} className={input} />)}
        {field("pay_max", "보수 최대", <input id="pay_max" name="pay_max" type="number" step="0.01" min={0} defaultValue={v.pay_max} className={input} />)}
        {field(
          "pay_unit",
          "보수 단위",
          <select id="pay_unit" name="pay_unit" defaultValue={v.pay_unit ?? "hour"} className={input}>
            <option value="hour">시간당</option>
            <option value="task">건당</option>
            <option value="project">프로젝트당</option>
            <option value="month">월</option>
          </select>,
        )}
        {field(
          "pay_currency",
          "통화",
          <input id="pay_currency" name="pay_currency" defaultValue={v.pay_currency ?? "USD"} className={input} />,
        )}
        {field(
          "hours_per_week_min",
          "최소 주당 시간",
          <input id="hours_per_week_min" name="hours_per_week_min" type="number" min={1} max={80} defaultValue={v.hours_per_week_min} className={input} />,
        )}
        <div className="flex items-center gap-2 sm:col-span-2">
          <input
            id="requires_credential"
            name="requires_credential"
            type="checkbox"
            defaultChecked={v.requires_credential === "on"}
          />
          <label htmlFor="requires_credential" className="text-sm">
            학위·자격증·면허나 특정 직업 경력이 필수예요 (정보로만 표시, 발송은 막지 않아요)
          </label>
        </div>
      </div>

      {state.message && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "저장하는 중…" : props.submitLabel}
      </button>
    </form>
  );
}
