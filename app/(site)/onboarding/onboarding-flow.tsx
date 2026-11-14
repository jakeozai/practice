"use client";

import { useEffect, useRef, useState } from "react";
import { ProfileSchema, type Profile } from "@/lib/profile/parse";
import {
  ENGLISH_LEVEL_OPTIONS,
  PREFERRED_TIME_OPTIONS,
  fromDraft,
  toDraft,
  type ProfileDraft,
} from "@/lib/profile/draft";
import { AI_ASSISTANTS, assistantUrl } from "@/lib/profile/prefill";
import { EXAMPLE_JOBS } from "@/lib/examples";

/**
 * The user never writes their own profile: their AI analyzes them, they
 * confirm (2026-11-14 flow): 1/3 copy the prompt → 2/3 paste it into their
 * own AI (an empty chat; nothing pre-filled, so no injection warning) → 3/3
 * paste the AI's answer back → confirm → done, with a five-job example mail.
 */
type Step = "copy" | "ai" | "paste" | "confirm" | "edit" | "done" | "skipped";

/** A row of the example mail on the done screen (/api/profile/example). */
type ExampleJob = { id: string; headline: string; meta: string; pay: string | null; stretch: boolean };

const input = "field-box";
const primary = "btn-primary";
const secondary = "btn-secondary";
const link = "link-muted";

export function OnboardingFlow(props: {
  email: string;
  prompt: string;
  saved: Profile | null;
  /** "내일 아침 6시" */
  nextMail: string;
}) {
  const [step, setStep] = useState<Step>(props.saved ? "confirm" : "copy");
  const [profile, setProfile] = useState<Profile | null>(props.saved);
  const [isSaved, setIsSaved] = useState(Boolean(props.saved));
  const skip = () => setStep("skipped");

  if (step === "copy") return <CopyStep prompt={props.prompt} onNext={() => setStep("ai")} onSkip={skip} />;
  if (step === "ai") return <AiStep prompt={props.prompt} onBack={() => setStep("copy")} onNext={() => setStep("paste")} onSkip={skip} />;
  if (step === "paste") {
    return (
      <PasteStep
        onBack={() => setStep("ai")}
        onSkip={skip}
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
  const analyzed = step !== "skipped";
  return (
    <section className="space-y-6">
      <div className="card">
        <p className="text-sm font-semibold text-[var(--accent)]">{analyzed ? "준비 끝" : "구독 완료"}</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight">{props.nextMail}, 첫 일감 5개가 가요</h2>
        <p className="mt-2 text-sm text-muted">
          <strong className="text-[var(--ink)]">{props.email}</strong>로 {analyzed ? "딱 맞는 일감 3개와 AI로 도전해 볼 일감 2개를" : "일감 5개를"} 보내드려요.
        </p>
        <p className="mt-1 text-xs text-muted">2주마다 AI에게 다시 분석받으면 추천이 더 정확해져요. 메일로 알려 드릴게요.</p>
        <button type="button" className={`${secondary} mt-4`} onClick={() => setStep(analyzed ? "confirm" : "copy")}>
          {analyzed ? "분석 결과 다시 보기" : "지금 AI로 1분 분석하기"}
        </button>
      </div>
      <ExampleMail when={props.nextMail} personal={analyzed} />
    </section>
  );
}

// ── progress ─────────────────────────────────────────────────────────────
function Steps({ at }: { at: 1 | 2 | 3 }) {
  return (
    <div aria-label={`3단계 중 ${at}단계`}>
      <div className="flex gap-1.5" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className="h-1.5 flex-1 rounded-full" style={{ background: n <= at ? "var(--accent)" : "var(--surface-2)" }} />
        ))}
      </div>
      <p className="mono mt-3 text-xs text-[var(--accent)]">{`0${at} / 03`}</p>
    </div>
  );
}

function StepCard(props: { at: 1 | 2 | 3; title: string; children: React.ReactNode; onBack?: () => void; onSkip: () => void }) {
  return (
    <section className="space-y-4">
      <div className="card space-y-5">
        <Steps at={props.at} />
        <h2 className="text-2xl font-extrabold leading-snug tracking-tight">{props.title}</h2>
        {props.children}
      </div>
      <div className="flex flex-wrap gap-5">
        {props.onBack && (
          <button type="button" className={link} onClick={props.onBack}>
            ← 이전 단계
          </button>
        )}
        <button type="button" className={link} onClick={props.onSkip}>
          나중에 할게요 (분석 없이 일감 5개 받기)
        </button>
      </div>
    </section>
  );
}

/** Copies the prompt; when the browser won't, selects it so the person can copy it themselves. */
function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);
  const [manual, setManual] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      return true;
    } catch {
      setManual(true);
      setTimeout(() => {
        box.current?.focus();
        box.current?.select();
      }, 0);
      return false;
    }
  }
  return { copied, copy, box, manual };
}

// ── 1/3 copy the prompt ──────────────────────────────────────────────────
function CopyStep(props: { prompt: string; onNext: () => void; onSkip: () => void }) {
  const { copied, copy, box, manual } = useCopy(props.prompt);
  return (
    <StepCard at={1} title="프롬프트를 복사해 주세요" onSkip={props.onSkip}>
      <p className="text-sm text-muted">평소 쓰는 AI가 이 프롬프트로 나를 분석해서 덕잡 프로필, 내 스펙 요약, 한글·영문 이력서를 만들어 줘요.</p>
      <button
        type="button"
        className={`${primary} w-full text-lg`}
        onClick={async () => {
          if (await copy()) setTimeout(props.onNext, 700);
        }}
      >
        {copied ? "복사됨 ✓" : "프롬프트 복사하기"}
      </button>
      {manual && <p className="text-sm text-[var(--error)]">자동 복사가 막혀 있어요. 아래 글이 선택돼 있으니 길게 누르거나 Ctrl+C로 복사해 주세요.</p>}
      <details open={manual} className="rounded-2xl bg-[var(--surface-4)] p-4">
        <summary className="cursor-pointer text-sm font-semibold">프롬프트 내용 보기</summary>
        <textarea ref={box} readOnly value={props.prompt} rows={10} className={`${input} mt-3 text-xs leading-relaxed`} aria-label="AI에 붙여넣을 프롬프트" />
      </details>
      {(copied || manual) && (
        <button type="button" className={`${secondary} w-full`} onClick={props.onNext}>
          복사했어요, 다음 →
        </button>
      )}
    </StepCard>
  );
}

// ── 2/3 paste it into your own AI ────────────────────────────────────────
function AiStep(props: { prompt: string; onBack: () => void; onNext: () => void; onSkip: () => void }) {
  const { copied, copy } = useCopy(props.prompt);
  return (
    <StepCard at={2} title="평소 쓰는 AI에 붙여넣고 보내 주세요" onBack={props.onBack} onSkip={props.onSkip}>
      <ol className="space-y-2 text-sm leading-relaxed text-[var(--ink-3)]">
        <li>
          <strong className="text-[var(--ink)]">1.</strong> 아래에서 평소 쓰는 AI를 열어요. 새 창에 빈 대화가 열려요.
        </li>
        <li>
          <strong className="text-[var(--ink)]">2.</strong> 입력칸에 붙여넣고 보내요. (PC는 Ctrl+V·⌘V, 휴대폰은 입력칸을 길게 눌러 붙여넣기)
        </li>
        <li>
          <strong className="text-[var(--ink)]">3.</strong> 답이 다 나오면 코드 블록 오른쪽 위의 <strong className="text-[var(--ink)]">복사</strong> 버튼을 눌러요.
        </li>
      </ol>
      <div className="grid gap-2 sm:grid-cols-3">
        {AI_ASSISTANTS.map((a) => (
          <a key={a.id} href={assistantUrl(a.id)} target="_blank" rel="noopener noreferrer" className={primary}>
            {a.label} 열기
          </a>
        ))}
      </div>
      <p className="text-xs text-muted">
        다른 AI도 괜찮아요. 프롬프트를 다시 복사하려면{" "}
        <button type="button" className="underline" onClick={() => void copy()}>
          {copied ? "복사됨 ✓" : "여기"}
        </button>
        를 눌러요.
      </p>
      <button type="button" className={`${secondary} w-full`} onClick={props.onNext}>
        AI 답을 복사했어요, 다음 →
      </button>
    </StepCard>
  );
}

// ── 3/3 paste the answer back ────────────────────────────────────────────
function PasteStep(props: { onBack: () => void; onSkip: () => void; onParsed: (p: Profile) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const pasteRef = useRef<HTMLTextAreaElement>(null);

  async function parse(text: string) {
    if (!text.trim()) {
      setError("AI 답을 붙여넣어 주세요.");
      return;
    }
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
      const text = await navigator.clipboard.readText();
      if (pasteRef.current) pasteRef.current.value = text;
      await parse(text);
    } catch {
      setError("자동으로 가져오지 못했어요. 아래 칸에 직접 붙여넣어 주세요.");
      pasteRef.current?.focus();
    }
  }

  return (
    <StepCard at={3} title="AI 답을 여기에 붙여넣어 주세요" onBack={props.onBack} onSkip={props.onSkip}>
      <button type="button" className={`${primary} w-full text-lg`} disabled={pending} onClick={fromClipboard}>
        {pending ? "읽는 중…" : "복사한 답 불러오기"}
      </button>
      <textarea
        ref={pasteRef}
        rows={6}
        aria-label="AI 답 붙여넣기"
        placeholder="또는 여기에 붙여넣기 (Ctrl+V · ⌘V · 길게 눌러 붙여넣기)"
        className={`${input} font-mono text-xs`}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (text) {
            e.preventDefault();
            if (pasteRef.current) pasteRef.current.value = text;
            void parse(text);
          }
        }}
      />
      <button type="button" className={`${secondary} w-full`} disabled={pending} onClick={() => void parse(pasteRef.current?.value ?? "")}>
        붙여넣은 답 확인하기
      </button>
      {error && (
        <p className="alert-error" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-muted">🔒 붙여넣은 내용은 공고를 고르는 데만 쓰고, 원문은 저장하지 않아요.</p>
    </StepCard>
  );
}

// ── done: an example of the next mail ────────────────────────────────────
function ExampleMail({ when, personal }: { when: string; personal: boolean }) {
  const [jobs, setJobs] = useState<ExampleJob[] | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/profile/example")
      .then((r) => r.json())
      .then((d) => live && setJobs(Array.isArray(d.jobs) ? d.jobs : []))
      .catch(() => live && setJobs([]));
    return () => {
      live = false;
    };
  }, []);

  // Five rows always: this person's candidates first, then the landing page's examples.
  const rows = [
    ...(jobs ?? []).map((j) => ({ key: j.id, title: j.headline, meta: j.meta, pay: j.pay ?? "원문 확인" })),
    ...EXAMPLE_JOBS.map((j) => ({ key: j.title, title: j.title, meta: j.meta, pay: j.pay })),
  ].slice(0, 5);

  return (
    <div>
      <p className="text-sm font-bold">{when}, 이런 메일이 가요</p>
      <article
        aria-label="예시 메일"
        className="mt-3 rounded-[26px] px-5 pb-2 pt-[18px]"
        style={{ background: "var(--paper)", color: "var(--paper-ink)", boxShadow: "0 30px 60px -20px rgba(0,0,0,.6)" }}
      >
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
          <img src="/brand/duckjob-appicon.svg" alt="" width={32} height={32} className="block h-8 w-8" />
          <p className="text-sm font-bold">duckjob</p>
          <p className="ml-auto text-[13px]" style={{ color: "var(--paper-muted)" }}>
            예시 · 오전 6:00
          </p>
        </div>
        <p className="mb-1 mt-3.5 text-lg font-extrabold tracking-tight">{personal ? "오늘의 맞춤 일감 5개" : "오늘의 일감 5개"}</p>
        {jobs === null ? (
          <p className="py-6 text-center text-sm" style={{ color: "var(--paper-muted)" }}>
            고르는 중…
          </p>
        ) : (
          <ul>
            {rows.map((r, i) => (
              <li
                key={r.key}
                className="flex items-baseline justify-between gap-3 py-2.5"
                style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--paper-line)" : undefined }}
              >
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold">{r.title}</span>
                  <span className="mt-0.5 block text-[13px]" style={{ color: "var(--paper-muted)" }}>
                    {r.meta}
                  </span>
                </span>
                <span className="whitespace-nowrap text-[15px] font-extrabold">{r.pay}</span>
              </li>
            ))}
          </ul>
        )}
      </article>
      <p className="mt-2 text-xs text-muted">예시예요. 실제 메일은 매일 새벽 새로 올라온 공고에서 다시 골라요.</p>
    </div>
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
          <p className="mt-4 alert-error" role="alert">
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
        <p className="alert-error" role="alert">
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
      <label htmlFor={props.htmlFor} className="mb-1 block text-sm font-medium text-[var(--ink)]">
        {props.label}
      </label>
      {props.children}
    </div>
  );
}
