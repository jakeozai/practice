"use client";

import { useEffect, useRef, useState } from "react";
import { BRAND } from "@/lib/brand";
import { ProfileSchema, type Profile } from "@/lib/profile/parse";
import {
  AI_LEVEL_OPTIONS,
  EDUCATION_OPTIONS,
  ENGLISH_LEVEL_OPTIONS,
  PAY_PREFERENCE_OPTIONS,
  PREFERRED_TIME_OPTIONS,
  WANTED_WORK_OPTIONS,
  WORK_STATUS_OPTIONS,
  fromDraft,
  optionLabel,
  toDraft,
  type ProfileDraft,
} from "@/lib/profile/draft";
import { RAW_CONSENT } from "@/lib/profile/consent";
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
  /** The optional consent to keep the raw AI answer, as given before. */
  rawConsent: boolean;
}) {
  const [step, setStep] = useState<Step>(props.saved ? "confirm" : "copy");
  const [profile, setProfile] = useState<Profile | null>(props.saved);
  const [isSaved, setIsSaved] = useState(Boolean(props.saved));
  // The pasted answer stays in memory only until saving, and is sent only with the consent ticked.
  const [raw, setRaw] = useState<string | null>(null);
  const [consent, setConsent] = useState(props.rawConsent);
  const rawChoice = { raw, consent, setConsent, clear: () => setRaw(null) };
  const skip = () => setStep("skipped");

  if (step === "copy") return <CopyStep prompt={props.prompt} onNext={() => setStep("ai")} onSkip={skip} />;
  if (step === "ai") return <AiStep prompt={props.prompt} onBack={() => setStep("copy")} onNext={() => setStep("paste")} onSkip={skip} />;
  if (step === "paste") {
    return (
      <PasteStep
        onBack={() => setStep("ai")}
        onSkip={skip}
        onParsed={(p, text) => {
          setProfile(p);
          setRaw(text);
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
        rawChoice={rawChoice}
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
        rawChoice={rawChoice}
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
        <div className="mt-4 rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-sm">
          <p className="font-semibold">받은편지함에서 바로 보려면</p>
          <p className="mt-1 text-muted">
            <strong className="text-[var(--ink)]">{BRAND.sender}</strong>을 연락처에 추가해 주세요. Gmail은 처음 오는 메일을 프로모션이나
            전체보관함으로 보낼 때가 있어요.
          </p>
        </div>
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
function PasteStep(props: { onBack: () => void; onSkip: () => void; onParsed: (p: Profile, text: string) => void }) {
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
      if (pasteRef.current) pasteRef.current.value = ""; // kept in memory only; saved only with the optional consent
      props.onParsed(ProfileSchema.parse(data.profile), text);
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
      <p className="text-xs text-muted">🔒 확인한 분석 항목만 저장해요. 원문은 다음 화면의 ‘기업 제안 받기’를 켠 경우에만 보관해요(선택).</p>
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

  // Five rows always: this person's candidates first, then the landing page's examples. With a
  // profile the mail is 3 fits + 2 AI tries (2026-11-16), so each group is filled on its own.
  const real = (jobs ?? []).map((j) => ({ key: j.id, title: j.headline, meta: j.meta.replace(/^AI로 도전 · /, ""), pay: j.pay ?? "원문 확인", tryIt: j.stretch }));
  const examples = EXAMPLE_JOBS.map((j) => ({ key: j.title, title: j.title, meta: j.meta, pay: j.pay, tryIt: j.kind === "try" }));
  const rows = personal
    ? [
        ...[...real.filter((r) => !r.tryIt), ...examples.filter((r) => !r.tryIt)].slice(0, 3),
        ...[...real.filter((r) => r.tryIt), ...examples.filter((r) => r.tryIt)].slice(0, 2),
      ]
    : [...real, ...examples.map((r) => ({ ...r, tryIt: false }))].slice(0, 5);

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
              <li key={r.key} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--paper-line)" : undefined }}>
                {r.tryIt && !rows[i - 1]?.tryIt && (
                  <p className="flex items-center gap-1.5 pt-2.5 text-xs font-extrabold" style={{ color: "var(--accent)" }}>
                    <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
                      AI로 도전
                    </span>
                    AI로 도전해 볼 {rows.filter((x) => x.tryIt).length}개
                  </p>
                )}
                <div className="flex items-baseline justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold">{r.title}</span>
                    <span className="mt-0.5 block text-[13px]" style={{ color: "var(--paper-muted)" }}>
                      {r.meta}
                    </span>
                  </span>
                  <span className="whitespace-nowrap text-[15px] font-extrabold">{r.pay}</span>
                </div>
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

type RawChoiceProps = { raw: string | null; consent: boolean; setConsent: (v: boolean) => void; clear: () => void };

/** Body for /api/profile/save: the raw answer only while the optional consent is ticked. */
function saveBody(profile: unknown, c: RawChoiceProps) {
  return JSON.stringify({ profile, raw: c.consent ? c.raw : null, rawConsent: c.consent });
}

/**
 * "기업이 먼저 일감을 제안해요 (준비 중) [켜기]": the optional consent shown as the benefit it is
 * (lib/profile/consent.ts). Off unless switched on; what it keeps is said right under it, the four
 * notices are under 자세히 보기.
 */
function CompanyOffersSwitch({ c }: { c: RawChoiceProps }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-2)] px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-[var(--ink)]">
            {RAW_CONSENT.benefit}
            <span className="ml-2 rounded-full border border-[var(--line-2)] px-2 py-0.5 align-middle text-[11px] font-semibold text-muted">{RAW_CONSENT.badge}</span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{RAW_CONSENT.pitch}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={c.consent}
          aria-label={RAW_CONSENT.title}
          onClick={() => c.setConsent(!c.consent)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
            c.consent ? "bg-[var(--accent)] text-[var(--on-accent)]" : "border-2 border-[var(--accent)] text-[var(--accent)]"
          }`}
        >
          {c.consent ? "켜짐 ✓" : "켜기"}
        </button>
      </div>
      <details className="mt-3 text-xs text-muted">
        <summary className="cursor-pointer">자세히 보기 · {RAW_CONSENT.title}</summary>
        <dl className="mt-2 space-y-1">
          <div>
            <dt className="inline font-semibold">수집 항목: </dt>
            <dd className="inline">{RAW_CONSENT.items}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">이용 목적: </dt>
            <dd className="inline">{RAW_CONSENT.purpose}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">보유 기간: </dt>
            <dd className="inline">{RAW_CONSENT.retention}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">거부할 권리: </dt>
            <dd className="inline">{RAW_CONSENT.refusal}</dd>
          </div>
        </dl>
        <p className="mt-2">{RAW_CONSENT.sharing}</p>
        <a href="/privacy" className="mt-2 inline-block underline">
          개인정보 처리방침
        </a>
      </details>
    </div>
  );
}

function ConfirmCard(props: {
  profile: Profile;
  isSaved: boolean;
  rawChoice: RawChoiceProps;
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
        body: saveBody(p, props.rawChoice),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "저장하지 못했어요.");
        return;
      }
      props.rawChoice.clear();
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
          <Row label="지금 하는 일">
            {orDash(
              [optionLabel(WORK_STATUS_OPTIONS, p.work_status), p.job_role, p.industry, p.career_years !== null ? `경력 ${p.career_years}년` : null]
                .filter(Boolean)
                .join(" · ") || null,
            )}
          </Row>
          <Row label="학력·자격">
            <Chips items={[optionLabel(EDUCATION_OPTIONS, p.education_level), ...p.licenses].filter((x): x is string => Boolean(x))} />
          </Row>
          <Row label="AI 활용">
            <Chips items={[optionLabel(AI_LEVEL_OPTIONS, p.ai_level), ...p.ai_tools].filter((x): x is string => Boolean(x))} />
          </Row>
          <Row label="하고 싶은 일">
            <Chips items={p.wanted_work.map((w) => optionLabel(WANTED_WORK_OPTIONS, w)).filter((x): x is string => Boolean(x))} />
          </Row>
          <Row label="선호 보수">{orDash(optionLabel(PAY_PREFERENCE_OPTIONS, p.pay_preference))}</Row>
        </dl>
        <p className="mt-3 text-xs text-muted">빈 칸은 그대로 둬도 돼요. 위 항목은 일감을 고르는 데 써요(학교·회사 이름은 저장하지 않아요).</p>

        <div className="mt-4">
          <CompanyOffersSwitch c={props.rawChoice} />
        </div>

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
function EditForm(props: { base: Profile; rawChoice: RawChoiceProps; onCancel: () => void; onSaved: (p: Profile) => void }) {
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
        body: saveBody(raw, props.rawChoice),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "저장하지 못했어요.");
        return;
      }
      props.rawChoice.clear();
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
        <Field label="지금 상태" htmlFor="workStatus">
          <select id="workStatus" value={draft.workStatus} onChange={(e) => set("workStatus", e.target.value as ProfileDraft["workStatus"])} className={input}>
            <option value="">선택 안 함</option>
            {WORK_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="경력 연수" htmlFor="careerYears">
          <input
            id="careerYears"
            type="number"
            inputMode="numeric"
            min={0}
            max={50}
            value={draft.careerYears}
            onChange={(e) => set("careerYears", e.target.value)}
            className={input}
          />
        </Field>
        <Field label="직무 (회사 이름 빼고)" htmlFor="jobRole">
          <input id="jobRole" value={draft.jobRole} maxLength={40} onChange={(e) => set("jobRole", e.target.value)} placeholder="예: 경영지원" className={input} />
        </Field>
        <Field label="업종" htmlFor="industry">
          <input id="industry" value={draft.industry} maxLength={40} onChange={(e) => set("industry", e.target.value)} placeholder="예: 제조" className={input} />
        </Field>
        <Field label="최종 학력 (학교 이름 빼고)" htmlFor="education">
          <select id="education" value={draft.education} onChange={(e) => set("education", e.target.value as ProfileDraft["education"])} className={input}>
            <option value="">선택 안 함</option>
            {EDUCATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="AI 활용 수준" htmlFor="aiLevel">
          <select id="aiLevel" value={draft.aiLevel} onChange={(e) => set("aiLevel", e.target.value as ProfileDraft["aiLevel"])} className={input}>
            <option value="">선택 안 함</option>
            {AI_LEVEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="자격증·면허 (이름만)" htmlFor="licenses" wide>
          <input id="licenses" value={draft.licenses} onChange={(e) => set("licenses", e.target.value)} className={input} />
        </Field>
        <Field label="자주 쓰는 AI 도구" htmlFor="aiTools" wide>
          <input id="aiTools" value={draft.aiTools} onChange={(e) => set("aiTools", e.target.value)} placeholder="예: ChatGPT, Claude" className={input} />
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="mb-1 block text-sm font-medium text-[var(--ink)]">하고 싶은 일</legend>
          <div className="flex flex-wrap gap-2">
            {WANTED_WORK_OPTIONS.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--line-2)] px-3 py-1 text-sm has-[:checked]:border-[var(--accent)]">
                <input
                  type="checkbox"
                  className="accent-[var(--accent)]"
                  checked={draft.wantedWork.includes(o.value)}
                  onChange={(e) => set("wantedWork", e.target.checked ? [...draft.wantedWork, o.value] : draft.wantedWork.filter((w) => w !== o.value))}
                />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="선호 보수" htmlFor="payPreference">
          <select id="payPreference" value={draft.payPreference} onChange={(e) => set("payPreference", e.target.value as ProfileDraft["payPreference"])} className={input}>
            <option value="">선택 안 함</option>
            {PAY_PREFERENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <CompanyOffersSwitch c={props.rawChoice} />
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
