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
import { QUICK_FIELD_CHOICES, QUICK_MAX_FIELDS, quickProfile, type QuickAnswers } from "@/lib/profile/quick";
import { AI_ASSISTANTS, assistantUrl, type AiAssistant } from "@/lib/profile/prefill";

/**
 * The user never writes their own profile: their AI analyzes them, they confirm.
 * analyze → (AI opens in a new tab) → return → confirm → done; edit is optional.
 */
type Step = "analyze" | "return" | "confirm" | "edit" | "quick" | "done" | "skipped";

/** One job of the next mail, for the preview on the done screen. */
export type PreviewJob = { id: string; headline: string; company: string; line: string | null; pay: string | null; url: string };

const input = "field-box";
const primary = "btn-primary";
const secondary = "btn-secondary";
const link = "link-muted";

export function OnboardingFlow(props: {
  email: string;
  prompt: string;
  saved: Profile | null;
  preview: PreviewJob[];
  /** "내일 아침 6시" */
  nextMail: string;
}) {
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
        onQuick={() => setStep("quick")}
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
      />
    );
  }
  if (step === "quick") {
    return (
      <QuickForm
        onCancel={() => setStep("analyze")}
        onSaved={(p) => {
          setProfile(p);
          setIsSaved(true);
          setStep("done");
        }}
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
    <section className="space-y-6">
      <div className="card">
        <p className="text-lg font-bold">{step === "skipped" ? "구독 완료!" : "확인 완료!"}</p>
        <p className="mt-1 text-sm text-muted">
          매일 아침 6시, <strong className="text-[var(--ink)]">{props.email}</strong>로 일감 3개를 보내드려요.
        </p>
        <p className="mt-1 text-xs text-muted">그만 받고 싶으면 메일 맨 아래 [메일 그만 받기] 한 번이면 해지돼요.</p>
        <button type="button" className={`${secondary} mt-4`} onClick={() => setStep(step === "skipped" ? "analyze" : "confirm")}>
          {step === "skipped" ? "지금 AI로 분석하기" : "분석 결과 다시 보기"}
        </button>
      </div>
      {props.preview.length > 0 && <NextMailPreview jobs={props.preview} when={props.nextMail} />}
    </section>
  );
}

// ── done: what the next mail carries ─────────────────────────────────────
function NextMailPreview(props: { jobs: PreviewJob[]; when: string }) {
  return (
    <div>
      <p className="text-sm font-bold">{props.when}에 이런 일감이 와요</p>
      <ul className="mt-3 space-y-2">
        {props.jobs.map((j) => (
          <li key={j.id}>
            <a
              href={j.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 transition-colors hover:border-[var(--accent)]"
            >
              <p className="font-bold leading-snug">{j.headline}</p>
              <p className="mt-0.5 text-xs text-muted">
                {j.company}
                {j.pay ? ` · ${j.pay}` : ""}
              </p>
              {j.line && <p className="mt-1.5 text-sm leading-relaxed">{j.line}</p>}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── 1. pick an AI ────────────────────────────────────────────────────────
function AnalyzeStep(props: { prompt: string; onOpened: (a: AiAssistant) => void; onSkip: () => void; onQuick: () => void }) {

  function open(a: AiAssistant) {
    // Open first, synchronously in the click, so popup blockers allow it.
    window.open(assistantUrl(a.id, props.prompt), "_blank", "noopener,noreferrer");
    navigator.clipboard?.writeText(props.prompt).catch(() => {});
    props.onOpened(a);
  }

  return (
    <section className="space-y-5">
      <div className="card">
        <p className="text-sm font-semibold text-[var(--accent)]">구독 완료</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight">평소 쓰는 AI로 1분 분석</h2>
        <p className="mt-2 text-sm text-muted">AI가 나를 분석하고, 지원할 때 쓸 영어 이력서 PDF도 만들어 줘요. 덕잡에는 분석 결과만 가져와요.</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {AI_ASSISTANTS.map((a) => (
            <button key={a.id} type="button" className={primary} onClick={() => open(a)}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <button type="button" className={link} onClick={props.onQuick}>
          AI 없이 질문 5개로 할게요
        </button>
        <button type="button" className={link} onClick={props.onSkip}>
          나중에 할게요
        </button>
      </div>
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
      <div className="card">
        <h2 className="text-2xl font-extrabold tracking-tight">{name} 답변을 복사했나요?</h2>
        <p className="mt-2 text-sm text-muted">
          {name} 창에 입력창이 비어 있으면 붙여넣기(⌘V / Ctrl+V)로 보내고, 답변 속 코드 블록의 복사 버튼을 누른 뒤 돌아오세요.
        </p>
        <button type="button" className={`${primary} mt-5 w-full sm:w-auto`} disabled={pending} onClick={fromClipboard}>
          {pending ? "읽는 중…" : "분석 결과 불러오기"}
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
        다른 AI로 할게요
      </button>
    </section>
  );
}

// ── 3. confirm ───────────────────────────────────────────────────────────
const englishLabel = (p: Profile) =>
  ENGLISH_LEVEL_OPTIONS.find((o) => o.value === p.languages.find((l) => l.code === "en")?.level)?.label ?? null;
const timeLabel = (p: Profile) => PREFERRED_TIME_OPTIONS.find((o) => o.value === p.preferred_time)?.label ?? null;

function Chips({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-muted">—</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {items.map((x) => (
        <span key={x} className="rounded-full bg-[var(--bg)] px-2.5 py-0.5 text-sm text-[var(--ink)]">
          {x}
        </span>
      ))}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 py-2.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="text-[var(--ink)]">{children}</dd>
    </div>
  );
}

const orDash = (v: string | null) => v ?? <span className="text-muted">—</span>;

function ConfirmCard(props: {
  profile: Profile;
  isSaved: boolean;
  onSaved: () => void;
  onEdit: () => void;
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
      <div className="card">
        <h2 className="text-2xl font-extrabold tracking-tight">{props.isSaved ? "저장된 분석 결과" : "AI가 이렇게 분석했어요"}</h2>
        {p.experience_summary_ko && <p className="mt-3 text-sm leading-relaxed text-[var(--ink)]">{p.experience_summary_ko}</p>}

        <dl className="mt-4 divide-y divide-[var(--line)]">
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
        <p className="mt-3 text-xs text-muted">빈 칸은 그대로 둬도 돼요. 저장하면 이 항목만 보관하고, 붙여넣은 원문은 저장하지 않아요.</p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" className={primary} disabled={pending} onClick={confirm}>
            {pending ? "저장하는 중…" : props.isSaved ? "이대로 유지" : "맞아요"}
          </button>
          <button type="button" className={link} onClick={props.onEdit}>
            조금 고칠게요
          </button>
        </div>
      </div>
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
    <section className="card space-y-5">
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

// ── five questions instead of an AI ──────────────────────────────────────
function QuickForm(props: { onCancel: () => void; onSaved: (p: Profile) => void }) {
  const [a, setA] = useState<QuickAnswers>({ fields: [], skills: "", englishLevel: "", weeklyHours: "", minHourlyUsd: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const set = <K extends keyof QuickAnswers>(key: K, value: QuickAnswers[K]) => setA((d) => ({ ...d, [key]: value }));

  function toggle(field: string) {
    setA((d) => {
      if (d.fields.includes(field)) return { ...d, fields: d.fields.filter((f) => f !== field) };
      if (d.fields.length >= QUICK_MAX_FIELDS) return d;
      return { ...d, fields: [...d.fields, field] };
    });
  }

  async function save() {
    if (a.fields.length === 0) {
      setError("1번에서 하나 이상 골라 주세요.");
      return;
    }
    setPending(true);
    setError(null);
    const raw = quickProfile(a);
    try {
      const res = await fetch("/api/profile/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile: raw, source: "form" }),
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
    <section className="card space-y-6">
      <div>
        <h2 className="text-lg font-bold">질문 5개면 끝나요</h2>
        <p className="mt-1 text-sm text-muted">모르는 건 비워 두세요. 나중에 언제든 고칠 수 있어요.</p>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold">1. 하고 싶은 일을 골라 주세요 (먼저 고른 게 우선, {QUICK_MAX_FIELDS}개까지)</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_FIELD_CHOICES.map((f) => {
            const at = a.fields.indexOf(f);
            return (
              <button
                key={f}
                type="button"
                aria-pressed={at >= 0}
                onClick={() => toggle(f)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  at >= 0 ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-[var(--card)]"
                }`}
              >
                {at >= 0 ? `${at + 1}. ` : ""}
                {f}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="2. 쓸 줄 아는 프로그램·기술 (쉼표로 구분)" htmlFor="q-skills" wide>
          <input
            id="q-skills"
            value={a.skills}
            onChange={(e) => set("skills", e.target.value)}
            placeholder="예: 프리미어, 포토샵, 캡컷"
            className={input}
          />
        </Field>
        <Field label="3. 영어는 어느 정도 해요?" htmlFor="q-english">
          <select
            id="q-english"
            value={a.englishLevel}
            onChange={(e) => set("englishLevel", e.target.value as QuickAnswers["englishLevel"])}
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
        <Field label="4. 일주일에 몇 시간 할 수 있어요?" htmlFor="q-hours">
          <input
            id="q-hours"
            type="number"
            inputMode="numeric"
            min={1}
            max={80}
            value={a.weeklyHours}
            onChange={(e) => set("weeklyHours", e.target.value)}
            className={input}
          />
        </Field>
        <Field label="5. 시간당 최소 얼마면 할래요? (달러)" htmlFor="q-pay">
          <input
            id="q-pay"
            type="number"
            inputMode="decimal"
            min={1}
            max={500}
            value={a.minHourlyUsd}
            onChange={(e) => set("minHourlyUsd", e.target.value)}
            placeholder="예: 10"
            className={input}
          />
        </Field>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="button" className={primary} onClick={save} disabled={pending}>
          {pending ? "저장하는 중…" : "저장하기"}
        </button>
        <button type="button" className={secondary} onClick={props.onCancel} disabled={pending}>
          AI로 분석할게요
        </button>
      </div>
    </section>
  );
}

function Field(props: { label: string; htmlFor: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={props.wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={props.htmlFor} className="mb-1 block text-sm font-medium text-[var(--ink)]">
        {props.label}
      </label>
      {props.children}
    </div>
  );
}
