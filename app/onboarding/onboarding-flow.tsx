"use client";

import { useMemo, useState } from "react";
import { ProfileSchema, missingFields, type MissingField, type Profile } from "@/lib/profile/parse";
import {
  ENGLISH_LEVEL_OPTIONS,
  PREFERRED_TIME_OPTIONS,
  fromDraft,
  toDraft,
  type ProfileDraft,
} from "@/lib/profile/draft";

type Step = "prompt" | "paste" | "confirm" | "done";

const STEP_LABELS: { key: Exclude<Step, "done">; label: string }[] = [
  { key: "prompt", label: "프롬프트 복사" },
  { key: "paste", label: "답변 붙여넣기" },
  { key: "confirm", label: "확인·저장" },
];

const input =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900";
const primary = "rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50";
const secondary = "rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800";

export function OnboardingFlow(props: {
  email: string;
  prompt: string;
  prefillLinks: { label: string; href: string }[];
  saved: Profile | null;
}) {
  const [step, setStep] = useState<Step>(props.saved ? "confirm" : "prompt");
  const [saved, setSaved] = useState<Profile | null>(props.saved);
  const [base, setBase] = useState<Profile | null>(props.saved);

  return (
    <div className="space-y-6">
      {step !== "done" && (
        <ol className="flex gap-2 text-xs">
          {STEP_LABELS.map((s, i) => (
            <li
              key={s.key}
              className={`flex-1 rounded-full px-3 py-1.5 text-center ${
                s.key === step ? "bg-zinc-900 font-semibold text-white" : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {i + 1}. {s.label}
            </li>
          ))}
        </ol>
      )}

      {step === "prompt" && (
        <PromptStep prompt={props.prompt} prefillLinks={props.prefillLinks} onNext={() => setStep("paste")} />
      )}
      {step === "paste" && (
        <PasteStep
          onBack={() => setStep("prompt")}
          onParsed={(profile) => {
            setBase(profile);
            setStep("confirm");
          }}
        />
      )}
      {step === "confirm" && base && (
        <ConfirmStep
          key={JSON.stringify(base)}
          base={base}
          isSaved={base === saved}
          onReimport={() => setStep("prompt")}
          onSaved={(profile) => {
            setSaved(profile);
            setBase(profile);
            setStep("done");
          }}
        />
      )}
      {step === "done" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <p className="text-lg font-semibold text-emerald-900">저장했어요!</p>
          <p className="mt-1 text-sm text-emerald-800">
            곧 아침 메일로 <strong>{props.email}</strong>에 맞는 AI 일감을 보내드릴게요.
          </p>
          <button type="button" className={`${secondary} mt-4`} onClick={() => setStep("confirm")}>
            프로필 다시 고치기
          </button>
        </div>
      )}
    </div>
  );
}

function PromptStep(props: { prompt: string; prefillLinks: { label: string; href: string }[]; onNext: () => void }) {
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(props.prompt);
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
  }

  return (
    <section className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-700">
        <li>아래 프롬프트를 복사해서 ChatGPT·Claude·Gemini 중 평소 쓰는 AI에 붙여넣으세요.</li>
        <li>AI가 질문하면 답해 주세요. 메모리(기억) 기능이 켜져 있을수록 정확해요.</li>
        <li>
          AI가 <code className="rounded bg-zinc-100 px-1">&lt;&lt;AIJOB5_PROFILE_V1&gt;&gt;</code> 블록을 출력하면, 그
          답변을 통째로 복사해 오세요.
        </li>
      </ol>

      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-zinc-200 bg-white p-4 text-xs leading-relaxed text-zinc-700">
        {props.prompt}
      </pre>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={primary} onClick={copy}>
          {copied === "ok" ? "복사했어요 ✓" : "프롬프트 복사"}
        </button>
        {props.prefillLinks.map((link) => (
          <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className={secondary}>
            {link.label}
          </a>
        ))}
        <button type="button" className={secondary} onClick={props.onNext}>
          다음: 답변 붙여넣기
        </button>
      </div>
      {copied === "fail" && (
        <p className="text-sm text-red-600" role="alert">
          자동 복사가 안 돼요. 위 상자에서 직접 선택해 복사해 주세요.
        </p>
      )}
    </section>
  );
}

function PasteStep(props: { onBack: () => void; onParsed: (profile: Profile) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "불러오지 못했어요. 다시 시도해 주세요.");
        return;
      }
      setText(""); // the raw AI answer is not kept around
      props.onParsed(ProfileSchema.parse(data.profile));
    } catch {
      setError("네트워크 오류예요. 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-4">
      <label htmlFor="ai-answer" className="block text-sm font-medium">
        AI 답변을 그대로 붙여넣으세요
      </label>
      <textarea
        id="ai-answer"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        placeholder={"<<AIJOB5_PROFILE_V1>>\n{ ... }\n<<END_AIJOB5_PROFILE>>"}
        className={`${input} font-mono text-xs`}
      />
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="button" className={secondary} onClick={props.onBack}>
          이전
        </button>
        <button type="button" className={primary} disabled={pending || !text.trim()} onClick={submit}>
          {pending ? "불러오는 중…" : "프로필 불러오기"}
        </button>
      </div>
    </section>
  );
}

const MISSING_HINT: Record<MissingField, string> = {
  english_level: "영어 수준을 골라 주세요",
  fields: "관심·경험 분야를 하나 이상 적어 주세요",
  weekly_hours: "주당 가능 시간을 적어 주세요",
};

function ConfirmStep(props: {
  base: Profile;
  isSaved: boolean;
  onReimport: () => void;
  onSaved: (profile: Profile) => void;
}) {
  const [draft, setDraft] = useState<ProfileDraft>(() => toDraft(props.base));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const missing = useMemo(() => missingFields(ProfileSchema.parse(fromDraft(draft, props.base))), [draft, props.base]);
  const set = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const flag = (field: MissingField) => (missing.includes(field) ? "border-amber-500 ring-2 ring-amber-200" : "");

  async function save() {
    setPending(true);
    setError(null);
    const raw = fromDraft(draft, props.base);
    try {
      const res = await fetch("/api/profile/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile: raw }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "저장하지 못했어요.");
        return;
      }
      props.onSaved(ProfileSchema.parse(raw));
    } catch {
      setError("네트워크 오류예요. 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-700">
          {props.isSaved ? "저장된 프로필이에요. 고칠 곳이 있으면 고쳐서 저장하세요." : "AI가 정리한 내용이에요. 맞는지 확인해 주세요."}
        </p>
        <button type="button" className="text-sm text-zinc-500 underline" onClick={props.onReimport}>
          AI로 다시 가져오기
        </button>
      </div>

      {missing.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
          <p className="font-semibold">일감을 고르려면 아래 항목이 꼭 필요해요</p>
          <ul className="mt-1 list-disc pl-5">
            {missing.map((m) => (
              <li key={m}>{MISSING_HINT[m]}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="영어 수준" htmlFor="englishLevel" required>
          <select
            id="englishLevel"
            value={draft.englishLevel}
            onChange={(e) => set("englishLevel", e.target.value as ProfileDraft["englishLevel"])}
            className={`${input} ${flag("english_level")}`}
          >
            <option value="">선택해 주세요</option>
            {ENGLISH_LEVEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="주당 가능 시간" htmlFor="weeklyHours" required>
          <input
            id="weeklyHours"
            type="number"
            inputMode="numeric"
            min={1}
            max={80}
            value={draft.weeklyHours}
            onChange={(e) => set("weeklyHours", e.target.value)}
            className={`${input} ${flag("weekly_hours")}`}
            placeholder="예: 10"
          />
        </Field>

        <Field label="관심·경험 분야 (쉼표로 구분, 최대 5개)" htmlFor="fields" required wide>
          <input
            id="fields"
            value={draft.fields}
            onChange={(e) => set("fields", e.target.value)}
            className={`${input} ${flag("fields")}`}
            placeholder="예: 번역, 콘텐츠 검수, 라벨링"
          />
        </Field>

        <Field label="다룰 수 있는 도구·기술 (최대 10개)" htmlFor="skills" wide>
          <input id="skills" value={draft.skills} onChange={(e) => set("skills", e.target.value)} className={input} />
        </Field>

        <Field label="전문 지식 분야 (최대 5개)" htmlFor="domainExpertise" wide>
          <input
            id="domainExpertise"
            value={draft.domainExpertise}
            onChange={(e) => set("domainExpertise", e.target.value)}
            className={input}
            placeholder="예: 법률, 의료, 금융 — 없으면 비워 두세요"
          />
        </Field>

        <Field label="경력 요약 (회사 이름 없이, 300자)" htmlFor="experience" wide>
          <textarea
            id="experience"
            rows={3}
            maxLength={300}
            value={draft.experience}
            onChange={(e) => set("experience", e.target.value)}
            className={input}
          />
        </Field>

        <Field label="선호 시간대" htmlFor="preferredTime">
          <select
            id="preferredTime"
            value={draft.preferredTime}
            onChange={(e) => set("preferredTime", e.target.value as ProfileDraft["preferredTime"])}
            className={input}
          >
            <option value="">선택 안 함</option>
            {PREFERRED_TIME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="최소 희망 시급 (USD)" htmlFor="minHourlyUsd">
          <input
            id="minHourlyUsd"
            type="number"
            inputMode="decimal"
            min={1}
            max={500}
            value={draft.minHourlyUsd}
            onChange={(e) => set("minHourlyUsd", e.target.value)}
            className={input}
            placeholder="예: 15"
          />
        </Field>

        <Field label="데스크톱·노트북" htmlFor="hasDesktop">
          <select
            id="hasDesktop"
            value={draft.hasDesktop}
            onChange={(e) => set("hasDesktop", e.target.value as ProfileDraft["hasDesktop"])}
            className={input}
          >
            <option value="">선택 안 함</option>
            <option value="yes">있어요</option>
            <option value="no">없어요</option>
          </select>
        </Field>

        <Field label="피하고 싶은 일 (쉼표로 구분)" htmlFor="avoid">
          <input
            id="avoid"
            value={draft.avoid}
            onChange={(e) => set("avoid", e.target.value)}
            className={input}
            placeholder="예: 음성 녹음, 얼굴 촬영"
          />
        </Field>

        <Field label="메모 (300자)" htmlFor="notes" wide>
          <textarea
            id="notes"
            rows={2}
            maxLength={300}
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
            className={input}
          />
        </Field>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <button type="button" className={primary} disabled={pending || missing.length > 0} onClick={save}>
        {pending ? "저장하는 중…" : "이대로 저장"}
      </button>
    </section>
  );
}

function Field(props: { label: string; htmlFor: string; required?: boolean; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={props.wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={props.htmlFor} className="mb-1 block text-sm font-medium text-zinc-800">
        {props.label}
        {props.required && <span className="ml-1 text-amber-600">*</span>}
      </label>
      {props.children}
    </div>
  );
}
