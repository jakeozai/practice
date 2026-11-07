"use client";

import { useRef, useState } from "react";
import { ProfileSchema, type Profile } from "@/lib/profile/parse";
import {
  ENGLISH_LEVEL_OPTIONS,
  PREFERRED_TIME_OPTIONS,
  fromDraft,
  toDraft,
  type ProfileDraft,
} from "@/lib/profile/draft";
import { AI_ASSISTANTS, assistantUrl, type AiAssistant } from "@/lib/profile/prefill";

/**
 * The user never writes their own profile: their AI analyzes them, they confirm.
 * analyze → (AI opens in a new tab) → return → confirm → done; edit is optional.
 */
type Step = "analyze" | "return" | "confirm" | "edit" | "done" | "skipped";

const input =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900";
const primary = "rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50";
const secondary = "rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800";
const link = "text-sm text-zinc-500 underline underline-offset-2";

export function OnboardingFlow(props: { email: string; prompt: string; saved: Profile | null }) {
  const [step, setStep] = useState<Step>(props.saved ? "confirm" : "analyze");
  const [profile, setProfile] = useState<Profile | null>(props.saved);
  const [isSaved, setIsSaved] = useState(Boolean(props.saved));
  const [assistant, setAssistant] = useState<AiAssistant | null>(null);

  if (step === "analyze") {
    return (
      <AnalyzeStep
        prompt={props.prompt}
        onOpened={(a) => {
          setAssistant(a);
          setStep("return");
        }}
        onSkip={() => setStep("skipped")}
      />
    );
  }
  if (step === "return") {
    return (
      <ReturnStep
        assistant={assistant}
        onBack={() => setStep("analyze")}
        onParsed={(p) => {
          setProfile(p);
          setIsSaved(false);
          setStep("confirm");
        }}
      />
    );
  }
  if (step === "confirm" && profile) {
    return (
      <ConfirmCard
        profile={profile}
        isSaved={isSaved}
        onSaved={() => {
          setIsSaved(true);
          setStep("done");
        }}
        onEdit={() => setStep("edit")}
        onReanalyze={() => setStep("analyze")}
      />
    );
  }
  if (step === "edit" && profile) {
    return (
      <EditForm
        base={profile}
        onCancel={() => setStep("confirm")}
        onSaved={(p) => {
          setProfile(p);
          setIsSaved(true);
          setStep("done");
        }}
      />
    );
  }
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
      <p className="text-lg font-semibold text-emerald-900">{step === "skipped" ? "구독은 이미 완료됐어요" : "확인 완료!"}</p>
      <p className="mt-1 text-sm text-emerald-800">
        {step === "skipped" ? (
          <>
            <strong>{props.email}</strong>로 매일 아침 AI 일감 3개를 보내드려요. AI 분석을 하면 나에게 맞는 일감으로 골라 드려요.
          </>
        ) : (
          <>
            내일 아침부터 <strong>{props.email}</strong>로 나에게 맞는 AI 일감 3개를 보내드려요.
          </>
        )}
      </p>
      <button type="button" className={`${secondary} mt-4`} onClick={() => setStep(step === "skipped" ? "analyze" : "confirm")}>
        {step === "skipped" ? "지금 AI로 분석하기" : "분석 결과 다시 보기"}
      </button>
    </div>
  );
}

// ── 1. pick an AI ────────────────────────────────────────────────────────
function AnalyzeStep(props: { prompt: string; onOpened: (a: AiAssistant) => void; onSkip: () => void }) {
  const [showPrompt, setShowPrompt] = useState(false);

  function open(a: AiAssistant) {
    // Open first, synchronously in the click, so popup blockers allow it.
    window.open(assistantUrl(a.id, props.prompt), "_blank", "noopener,noreferrer");
    navigator.clipboard?.writeText(props.prompt).catch(() => {});
    props.onOpened(a);
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <p className="text-sm font-semibold text-indigo-600">구독 완료 · 1분이면 맞춤 추천</p>
        <h2 className="mt-1 text-xl font-bold">평소 쓰는 AI가 나를 분석해요</h2>
        <p className="mt-2 text-sm text-zinc-600">
          직접 적을 건 없어요. AI가 대화 기록과 메모리로 나를 분석하면, 확인만 하면 끝이에요.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {AI_ASSISTANTS.map((a) => (
            <button key={a.id} type="button" className={primary} onClick={() => open(a)}>
              {a.label}로 분석하기
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          버튼을 누르면 분석 요청이 복사되고 AI가 새 창에서 열려요. 입력창이 비어 있으면 붙여넣기(⌘V / Ctrl+V) 후 보내세요.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button type="button" className={link} onClick={props.onSkip}>
          나중에 할게요
        </button>
        <button type="button" className={link} onClick={() => setShowPrompt((v) => !v)}>
          AI에게 보내는 내용 보기
        </button>
      </div>
      {showPrompt && (
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-zinc-200 bg-white p-4 text-xs leading-relaxed text-zinc-700">
          {props.prompt}
        </pre>
      )}
    </section>
  );
}

// ── 2. bring the answer back ─────────────────────────────────────────────
function ReturnStep(props: { assistant: AiAssistant | null; onBack: () => void; onParsed: (p: Profile) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const pasteRef = useRef<HTMLTextAreaElement>(null);

  async function parse(text: string) {
    if (!text.trim()) return;
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
        setError(data.message ?? "분석 결과를 읽지 못했어요. 다시 시도해 주세요.");
        return;
      }
      if (pasteRef.current) pasteRef.current.value = ""; // the raw AI answer is not kept
      props.onParsed(ProfileSchema.parse(data.profile));
    } catch {
      setError("네트워크 오류예요. 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  async function fromClipboard() {
    try {
      await parse(await navigator.clipboard.readText());
    } catch {
      // Clipboard reading isn't allowed in this browser: fall back to pasting.
      setShowPaste(true);
      setTimeout(() => pasteRef.current?.focus(), 0);
    }
  }

  const name = props.assistant?.label ?? "AI";
  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-xl font-bold">{name}의 분석이 끝나면</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-zinc-700">
          <li>{name} 답변 아래의 복사 버튼으로 답변을 통째로 복사하세요.</li>
          <li>이 창으로 돌아와 아래 버튼을 누르세요.</li>
        </ol>
        <button type="button" className={`${primary} mt-5 w-full sm:w-auto`} disabled={pending} onClick={fromClipboard}>
          {pending ? "읽는 중…" : "복사한 분석 결과 불러오기"}
        </button>
        {!showPaste && (
          <button type="button" className={`${link} ml-0 mt-3 block sm:ml-4 sm:inline`} onClick={() => setShowPaste(true)}>
            직접 붙여넣을게요
          </button>
        )}
        {showPaste && (
          <textarea
            ref={pasteRef}
            rows={6}
            aria-label="AI 답변 붙여넣기"
            placeholder="여기에 AI 답변을 붙여넣으세요 (⌘V / Ctrl+V)"
            className={`${input} mt-4 font-mono text-xs`}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              if (text) {
                e.preventDefault();
                void parse(text);
              }
            }}
          />
        )}
        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>
      <button type="button" className={link} onClick={props.onBack}>
        다른 AI로 다시 분석하기
      </button>
    </section>
  );
}

// ── 3. confirm ───────────────────────────────────────────────────────────
const englishLabel = (p: Profile) =>
  ENGLISH_LEVEL_OPTIONS.find((o) => o.value === p.languages.find((l) => l.code === "en")?.level)?.label ?? null;
const timeLabel = (p: Profile) => PREFERRED_TIME_OPTIONS.find((o) => o.value === p.preferred_time)?.label ?? null;

function Chips({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-zinc-400">—</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {items.map((x) => (
        <span key={x} className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-sm text-zinc-800">
          {x}
        </span>
      ))}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 py-2.5 text-sm">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-zinc-900">{children}</dd>
    </div>
  );
}

const orDash = (v: string | null) => v ?? <span className="text-zinc-400">—</span>;

function ConfirmCard(props: {
  profile: Profile;
  isSaved: boolean;
  onSaved: () => void;
  onEdit: () => void;
  onReanalyze: () => void;
}) {
  const p = props.profile;
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const others = p.languages.filter((l) => l.code !== "ko" && l.code !== "en").map((l) => l.code.toUpperCase());

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile: p }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "저장하지 못했어요.");
        return;
      }
      props.onSaved();
    } catch {
      setError("네트워크 오류예요. 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <p className="text-sm font-semibold text-indigo-600">{props.isSaved ? "저장된 분석 결과" : "AI 분석 결과"}</p>
        <h2 className="mt-1 text-xl font-bold">AI가 이렇게 분석했어요</h2>
        {p.experience_summary_ko && <p className="mt-3 text-sm leading-relaxed text-zinc-700">{p.experience_summary_ko}</p>}

        <dl className="mt-4 divide-y divide-zinc-100">
          <Row label="잘하는 분야">
            <Chips items={[...p.fields, ...p.domain_expertise]} />
          </Row>
          <Row label="쓰는 도구">
            <Chips items={p.skills} />
          </Row>
          <Row label="언어">
            한국어{englishLabel(p) ? ` · 영어: ${englishLabel(p)}` : ""}
            {others.length ? ` · ${others.join(", ")}` : ""}
          </Row>
          <Row label="가능한 시간">
            {orDash([p.weekly_hours ? `주 ${p.weekly_hours}시간` : null, timeLabel(p)].filter(Boolean).join(" · ") || null)}
          </Row>
          <Row label="희망 시급">{p.min_hourly_usd ? `$${p.min_hourly_usd} 이상` : orDash(null)}</Row>
          <Row label="피하고 싶은 일">
            <Chips items={p.avoid} />
          </Row>
        </dl>
        <p className="mt-3 text-xs text-zinc-500">빈 항목은 AI가 몰라서 비워 둔 거예요. 그대로 둬도 괜찮아요.</p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" className={primary} disabled={pending} onClick={confirm}>
            {pending ? "저장하는 중…" : props.isSaved ? "이대로 유지" : "맞아요, 이대로 받을게요"}
          </button>
          <button type="button" className={link} onClick={props.onEdit}>
            조금 고칠게요
          </button>
        </div>
      </div>
      <button type="button" className={link} onClick={props.onReanalyze}>
        AI로 다시 분석하기
      </button>
    </section>
  );
}

// ── optional: edit ───────────────────────────────────────────────────────
function EditForm(props: { base: Profile; onCancel: () => void; onSaved: (p: Profile) => void }) {
  const [draft, setDraft] = useState<ProfileDraft>(() => toDraft(props.base));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const set = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

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
    <section className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6">
      <h2 className="text-lg font-bold">고칠 곳만 고치세요</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="잘하는 분야 (쉼표로 구분)" htmlFor="fields" wide>
          <input id="fields" value={draft.fields} onChange={(e) => set("fields", e.target.value)} className={input} />
        </Field>
        <Field label="쓰는 도구·기술" htmlFor="skills" wide>
          <input id="skills" value={draft.skills} onChange={(e) => set("skills", e.target.value)} className={input} />
        </Field>
        <Field label="전문 분야" htmlFor="domainExpertise" wide>
          <input
            id="domainExpertise"
            value={draft.domainExpertise}
            onChange={(e) => set("domainExpertise", e.target.value)}
            className={input}
          />
        </Field>
        <Field label="경력 요약 (300자)" htmlFor="experience" wide>
          <textarea
            id="experience"
            rows={3}
            maxLength={300}
            value={draft.experience}
            onChange={(e) => set("experience", e.target.value)}
            className={input}
          />
        </Field>
        <Field label="영어" htmlFor="englishLevel">
          <select
            id="englishLevel"
            value={draft.englishLevel}
            onChange={(e) => set("englishLevel", e.target.value as ProfileDraft["englishLevel"])}
            className={input}
          >
            <option value="">모름</option>
            {ENGLISH_LEVEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="주당 가능 시간" htmlFor="weeklyHours">
          <input
            id="weeklyHours"
            type="number"
            inputMode="numeric"
            min={1}
            max={80}
            value={draft.weeklyHours}
            onChange={(e) => set("weeklyHours", e.target.value)}
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
            <option value="">상관없음</option>
            {PREFERRED_TIME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="희망 시급 (USD)" htmlFor="minHourlyUsd">
          <input
            id="minHourlyUsd"
            type="number"
            inputMode="decimal"
            min={1}
            max={500}
            value={draft.minHourlyUsd}
            onChange={(e) => set("minHourlyUsd", e.target.value)}
            className={input}
          />
        </Field>
        <Field label="피하고 싶은 일" htmlFor="avoid" wide>
          <input id="avoid" value={draft.avoid} onChange={(e) => set("avoid", e.target.value)} className={input} />
        </Field>
      </div>
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button type="button" className={primary} disabled={pending} onClick={save}>
          {pending ? "저장하는 중…" : "저장"}
        </button>
        <button type="button" className={link} onClick={props.onCancel}>
          취소
        </button>
      </div>
    </section>
  );
}

function Field(props: { label: string; htmlFor: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={props.wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={props.htmlFor} className="mb-1 block text-sm font-medium text-zinc-800">
        {props.label}
      </label>
      {props.children}
    </div>
  );
}
