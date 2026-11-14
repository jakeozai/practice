import { Suspense, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { contactEmail } from "@/lib/brand";
import { SubscribeForm } from "./subscribe-form";
import { Reveal } from "./reveal";
import "./landing.css";

/**
 * Landing page, built to the B안 "새벽 대화형" design (2026-11-14). Every
 * section of the design is here; both forms send the real confirmation mail.
 */

const ERRORS: Record<string, string> = {
  auth: "링크가 만료됐거나 이미 쓰였어요. 이메일을 다시 넣어 주세요.",
};

/** The form, with the login hint or link error carried in the URL (?next=, ?error=). */
async function SubscribeSlot({ id, center, searchParams }: { id: string; center?: boolean; searchParams: PageProps<"/">["searchParams"] }) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;
  const notice = error ?? (next && !center ? "계속하려면 이메일로 로그인해 주세요." : undefined);
  return <SubscribeForm id={id} center={center} next={next} notice={center ? undefined : notice} />;
}

const wrap: CSSProperties = { maxWidth: 1240, margin: "0 auto", boxSizing: "border-box" };
/** Stagger for entrance animations (landing.css reads --d). */
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/** "06:00" with a blinking colon. */
function Clock() {
  return (
    <>
      06<span className="lp-colon">:</span>00
    </>
  );
}
const accent = "var(--accent)";

const EXAMPLE_JOBS = [
  { title: "상세페이지 카피 5종", meta: "AI로 약 2시간 · 국내", pay: "15만 원" },
  { title: "영어 인터뷰 한국어 자막", meta: "AI로 약 1.5시간 · 해외", pay: "$90" },
  { title: "설문 800건 분류·요약", meta: "AI로 약 3시간 · 국내", pay: "20만 원" },
  { title: "블로그 원고 4편", meta: "AI로 약 2시간 · 국내", pay: "12만 원" },
  { title: "상품 썸네일 10장", meta: "AI로 약 1시간 · 국내", pay: "8만 원" },
];

const CIRCLES = [
  { src: "/photos/after-work.jpg", w: 1100, h: 1100, alt: "퇴근 후 스탠드 불빛 아래 책상에서 노트북으로 일하는 30대 남성", pos: "48% 50%", caption: "퇴근 후 1시간" },
  { src: "/photos/nap-time.jpg", w: 1100, h: 1100, alt: "장난감이 놓인 거실에서 아기 모니터를 옆에 두고 노트북으로 일하는 엄마", pos: "40% 50%", caption: "아이 낮잠 시간에" },
  { src: "/photos/retired.jpg", w: 1100, h: 1100, alt: "창가 식탁에서 노트북으로 일하는 60대 남성", pos: "45% 50%", caption: "은퇴 후 두 번째 일" },
  { src: "/photos/with-dog.jpg", w: 1100, h: 1100, alt: "잠든 시바견을 쓰다듬으며 소파에서 노트북으로 일하는 여성", pos: "60% 55%", caption: "반려견과 함께" },
];

const MARQUEE = ["번역·자막", "상세페이지 카피", "블로그 원고", "데이터 정리", "썸네일 디자인", "숏폼 편집", "시장 리서치", "엑셀 자동화", "해외 공고"];

const PROMISES: { title: ReactNode; text: string }[] = [
  { title: "모든 일감에 원문 링크", text: "지원은 원래 플랫폼에서 직접 해요." },
  {
    title: (
      <>
        가입비·수수료 <span style={{ color: accent }}>0원</span>
      </>
    ),
    text: "덕잡은 구독자에게 돈을 받지 않아요.",
  },
  { title: "입금·메신저 유도 공고 제외", text: "텔레그램·오픈채팅으로 옮기자는 공고는 보내지 않아요." },
];

const FAQ = [
  { q: "정말 무료예요?", a: "네, 구독은 무료예요." },
  { q: "회사 다니면서도 할 수 있나요?", a: "AI로 몇 시간 안에 끝나는 일 위주라 퇴근 후나 주말에 하기 좋아요." },
  { q: "이력서 파일은 누가 만들어요?", a: "평소 쓰는 AI가 만들어요. 받은 한글·영문 이력서는 지원할 때 그대로 쓰면 돼요." },
  { q: "해외 공고도 오나요?", a: "네. 영문 이력서가 있으니 해외 공고도 한국어로 요약해서 함께 보내요." },
];

function AppIcon({ size }: { size: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG icon
    <img src="/brand/duckjob-appicon.svg" alt="" width={size} height={size} style={{ flex: "none", display: "block", width: size, height: size }} />
  );
}

function FileIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FF6B3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
    </svg>
  );
}

/** A message from 덕잡 in the chat: the icon, then the bubble. */
function DuckBubble({ children, first = false, padding = "16px 20px" }: { children: ReactNode; first?: boolean; padding?: string }) {
  return (
    <div data-reveal style={{ display: "flex", alignItems: "flex-end", gap: 10, marginTop: first ? 0 : 18 }}>
      <AppIcon size={36} />
      <div className="lp-bubble" style={{ maxWidth: "70%", padding, borderRadius: "22px 22px 22px 6px", background: "var(--surface)" }}>
        {children}
      </div>
    </div>
  );
}

const stepNo: CSSProperties = { margin: 0, fontSize: 13, color: accent };
const stepNoClass = "mono lp-step";
const stepTitle: CSSProperties = { margin: "6px 0 0", fontSize: 19, fontWeight: 800 };
const stepText: CSSProperties = { margin: "6px 0 0", fontSize: 16, lineHeight: 1.6, color: "var(--ink-3)" };
const chip: CSSProperties = { padding: "4px 10px", borderRadius: 999, border: "1px solid var(--chip-line)", fontSize: 13, fontWeight: 600 };
const fileChip: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 12px",
  borderRadius: 14,
  background: "var(--surface-2)",
  fontSize: 14,
  fontWeight: 600,
};

export default function Home(props: PageProps<"/">) {
  const contact = contactEmail();
  return (
    <div className="lp">
      {/* NAV */}
      <div className="lp-nav" style={{ position: "sticky", top: 0, zIndex: 20, background: "var(--bg)", borderBottom: "1px solid var(--line)" }}>
        <nav
          aria-label="주요 메뉴"
          style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "10px 24px" }}
        >
          <a href="#top" aria-label="duckjob 홈" style={{ display: "inline-flex", alignItems: "center", minHeight: 44 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG wordmark */}
            <img src="/brand/duckjob-wordmark-ondark.svg" alt="duckjob" width={100} height={29} style={{ display: "block", width: 100, height: 29 }} />
          </a>
          <div className="lp-navl" style={{ alignItems: "center", gap: 28, fontSize: 15, fontWeight: 500 }}>
            <a href="#how">이용 방법</a>
            <a href="#journey">부업에서 본업까지</a>
            <a href="#faq">자주 묻는 질문</a>
          </div>
          <a
            href="#subscribe"
            className="lp-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 44,
              padding: "0 20px",
              borderRadius: 999,
              background: accent,
              color: "var(--on-accent)",
              fontSize: 15,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            무료 구독
          </a>
        </nav>
      </div>

      {/* HERO */}
      <header
        id="top"
        className="lp-hero"
        style={{ ...wrap, padding: "clamp(56px, 8vw, 104px) 24px 0", gap: "clamp(40px, 6vw, 72px)", alignItems: "center" }}
      >
        <div>
          <p className="mono lp-rise" style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--muted)" }}>
            <span aria-hidden="true" className="lp-live" style={{ width: 8, height: 8, borderRadius: 999, background: accent }} />
            매일 06:00 KST
          </p>
          <h1 className="lp-rise" style={{ ...delay(120), margin: "20px 0 0", fontSize: "clamp(40px, 6.4vw, 88px)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.045em" }}>
            AI 부업으로
            <br />
            시작해서,
            <br />
            <span style={{ color: accent }}>AI 본업</span>까지
          </h1>
          <p className="lp-rise" style={{ ...delay(240), margin: "24px 0 0", maxWidth: 520, fontSize: "clamp(17px, 1.6vw, 20px)", lineHeight: 1.65, color: "var(--ink-3)" }}>
            그동안 익힌 AI 실력에 딱 맞는 단기 일감 5개를, 매일 아침 6시 메일로 보내드려요.
          </p>
          <div className="lp-rise" style={delay(360)}>
            <Suspense fallback={<SubscribeForm id="b-hero-email" />}>
              <SubscribeSlot id="b-hero-email" searchParams={props.searchParams} />
            </Suspense>
          </div>
        </div>

        {/* NOTIFICATION STACK */}
        <div style={{ position: "relative", paddingTop: 8 }}>
          <div aria-hidden="true" className="lp-dawn" />
          <p
            className="mono lp-clock lp-rise"
            aria-hidden="true"
            style={{
              margin: "0 0 -28px",
              textAlign: "center",
              fontSize: "clamp(80px, 11vw, 156px)",
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: "-0.06em",
              color: accent,
              position: "relative",
            }}
          >
            <Clock />
          </p>
          <div className="lp-drop" style={{ position: "relative", maxWidth: 420, margin: "0 auto" }}>
            <div aria-hidden="true" style={{ position: "absolute", left: 28, right: 28, bottom: -24, height: 60, borderRadius: 26, background: "var(--surface-3)" }} />
            <div aria-hidden="true" style={{ position: "absolute", left: 14, right: 14, bottom: -12, height: 60, borderRadius: 26, background: "var(--surface-2)" }} />
            <article
              aria-label="예시 메일: 오늘의 맞춤 일감 5개"
              className="lp-card"
              style={{ position: "relative", boxSizing: "border-box", padding: "18px 20px 8px", borderRadius: 26, background: "var(--paper)", color: "var(--paper-ink)" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <AppIcon size={32} />
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>duckjob</p>
                <p style={{ margin: "0 0 0 auto", fontSize: 13, color: "var(--paper-muted)" }}>예시 · 오전 6:00</p>
              </div>
              <p style={{ margin: "14px 0 4px", fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>오늘의 맞춤 일감 5개</p>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {EXAMPLE_JOBS.map((j, i) => (
                  <li
                    key={j.title}
                    className="lp-rise"
                    style={{
                      ...delay(1000 + i * 110),
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom: i < EXAMPLE_JOBS.length - 1 ? "1px solid var(--paper-line)" : undefined,
                    }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{j.title}</span>
                      <span style={{ display: "block", marginTop: 3, fontSize: 13, color: "var(--paper-muted)" }}>{j.meta}</span>
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 800, whiteSpace: "nowrap" }}>{j.pay}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </header>

      {/* CIRCLES */}
      <section aria-label="구독자의 하루" className="lp-circles" style={{ ...wrap, padding: "clamp(88px, 10vw, 128px) 24px 0", gap: "32px 24px" }}>
        {CIRCLES.map((c, i) => (
          <figure key={c.src} data-reveal style={{ ...delay(i * 110), margin: 0, textAlign: "center" }}>
            <div className="lp-circle">
              <Image
                src={c.src}
                alt={c.alt}
                width={c.w}
                height={c.h}
                sizes="240px"
                style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: c.pos }}
              />
            </div>
            <figcaption style={{ marginTop: 16, fontSize: 16, fontWeight: 700 }}>{c.caption}</figcaption>
          </figure>
        ))}
      </section>

      {/* MARQUEE */}
      <div
        aria-hidden="true"
        className="lp-marquee"
        style={{
          marginTop: "clamp(88px, 10vw, 128px)",
          borderTop: "1px solid var(--line)",
          borderBottom: "1px solid var(--line)",
          overflow: "hidden",
          padding: "22px 0",
          whiteSpace: "nowrap",
        }}
      >
        <div className="lp-track mono" style={{ fontSize: "clamp(16px, 1.6vw, 20px)", color: "var(--ink-3)" }}>
          {[0, 1].map((copy) => (
            <span key={copy} style={{ display: "inline-flex", alignItems: "center", gap: 28, paddingRight: 28 }}>
              {MARQUEE.map((w) => (
                <span key={w} style={{ display: "inline-flex", alignItems: "center", gap: 28 }}>
                  {w}
                  <span style={{ color: accent }}>/</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* HOW: CHAT */}
      <section id="how" style={{ ...wrap, padding: "clamp(96px, 12vw, 152px) 24px 0" }}>
        <h2
          data-reveal
          style={{
            margin: "0 auto",
            maxWidth: 760,
            textAlign: "center",
            fontSize: "clamp(32px, 4.4vw, 56px)",
            fontWeight: 800,
            lineHeight: 1.18,
            letterSpacing: "-0.04em",
          }}
        >
          이력서는 내 AI가 쓰고,
          <br />
          공고는 덕잡이 골라요
        </h2>

        <div style={{ maxWidth: 760, margin: "56px auto 0", display: "flex", flexDirection: "column", gap: 14 }}>
          <DuckBubble first>
            <p className={stepNoClass} style={stepNo}>
              01
            </p>
            <h3 style={stepTitle}>이메일로 구독</h3>
            <p style={stepText}>10초면 끝나요. 바로 확인 메일이 가요.</p>
          </DuckBubble>

          <DuckBubble>
            <p className={stepNoClass} style={stepNo}>
              02
            </p>
            <h3 style={stepTitle}>나에게 딱 맞는 공고 받기</h3>
            <p style={stepText}>덕잡이 내 실력을 알아야 맞는 공고를 고를 수 있어요. 1분이면 끝나요.</p>
          </DuckBubble>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <p
              className="lp-bubble"
              data-reveal="right"
              style={{ margin: 0, maxWidth: "70%", padding: "13px 18px", borderRadius: "22px 22px 6px 22px", background: "var(--surface-2)", fontSize: 16, fontWeight: 600 }}
            >
              메일 속 프롬프트를 복사해서
            </p>
            <div className="lp-bubble" data-reveal="right" style={{ ...delay(140), maxWidth: "70%", padding: "13px 18px", borderRadius: "22px 6px 6px 22px", background: "var(--surface-2)" }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>평소 쓰는 AI에 붙여넣고</p>
              <p style={{ margin: "8px 0 0", display: "flex", flexWrap: "wrap", gap: 6 }}>
                <span style={chip}>ChatGPT</span>
                <span style={chip}>Claude</span>
                <span style={chip}>Gemini</span>
              </p>
            </div>
            <p
              className="lp-bubble"
              data-reveal="right"
              style={{
                ...delay(280),
                margin: 0,
                maxWidth: "70%",
                padding: "13px 18px",
                borderRadius: "22px 6px 22px 22px",
                background: accent,
                color: "var(--on-accent)",
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              AI가 정리해 준 답을 덕잡에 다시 붙여넣기
            </p>
          </div>
          <p
            data-reveal
            style={{
              margin: "4px auto 0",
              display: "inline-flex",
              alignSelf: "center",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: 999,
              background: "var(--surface-4)",
              fontSize: 14,
              color: "var(--muted)",
              textAlign: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}>
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            붙여넣은 내용은 공고를 고르는 데만 쓰고, 원문은 저장하지 않아요.
          </p>

          <DuckBubble>
            <p className={stepNoClass} style={stepNo}>
              03
            </p>
            <h3 style={stepTitle}>내 스펙과 한·영 이력서 받기</h3>
            <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "flex", flexWrap: "wrap", gap: 8 }}>
              <li style={fileChip}>
                <FileIcon />내 스펙 요약
              </li>
              <li style={fileChip}>
                <FileIcon />
                이력서_한글.pdf
              </li>
              <li style={fileChip}>
                <FileIcon />
                Resume_EN.pdf
              </li>
            </ul>
          </DuckBubble>

          <DuckBubble padding="8px">
            <Image
              src="/photos/step-04.jpg"
              alt="카페 창가에서 웃으며 노트북으로 일하는 40대 여성"
              width={1600}
              height={1067}
              sizes="(max-width: 640px) 80vw, 520px"
              style={{ display: "block", width: "100%", height: "auto", aspectRatio: "16 / 10", objectFit: "cover", objectPosition: "40% 45%", borderRadius: 16 }}
            />
            <div style={{ padding: "12px 12px 8px" }}>
              <p className={stepNoClass} style={stepNo}>
                04
              </p>
              <h3 style={{ ...stepTitle, lineHeight: 1.4 }}>
                매일 아침 6시,
                <br />내 이력서에 맞춘 공고 5개
              </h3>
            </div>
          </DuckBubble>
        </div>
      </section>

      {/* JOURNEY */}
      <section id="journey" className="lp-journey" style={{ position: "relative", marginTop: "clamp(112px, 14vw, 176px)", minHeight: "clamp(520px, 70vw, 820px)", overflow: "hidden" }}>
        <Image src="/photos/journey.jpg" alt="밤 거실 소파에서 노트북 화면 빛을 받으며 일하는 대학생" fill sizes="100vw" style={{ objectFit: "cover", objectPosition: "60% 55%" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(13, 13, 12, 0.15) 20%, rgba(13, 13, 12, 0.88) 100%)" }} />
        <div style={{ ...wrap, position: "absolute", left: 0, right: 0, bottom: 0, padding: "0 24px clamp(48px, 7vw, 88px)" }}>
          <h2 data-reveal style={{ margin: 0, fontSize: "clamp(36px, 6vw, 84px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.045em" }}>
            배운 AI가 부업이 되고,
            <br />
            <span style={{ color: accent }}>부업이 본업</span>이 되도록
          </h2>
        </div>
      </section>

      {/* PROMISES */}
      <section style={{ ...wrap, padding: "clamp(104px, 13vw, 160px) 24px 0" }}>
        <h2 data-reveal style={{ margin: 0, fontSize: "clamp(32px, 4.4vw, 56px)", fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.04em" }}>
          덕잡은 처음부터
          <br />
          이렇게 운영해요
        </h2>
        <div className="lp-plist" style={{ marginTop: 48, borderTop: "1px solid var(--line-2)" }}>
          {PROMISES.map((p, i) => (
            <div key={p.text} data-reveal style={{ ...delay(i * 120), gap: "8px 40px", padding: "28px 0", borderBottom: "1px solid var(--line-2)" }}>
              <p style={{ margin: 0, fontSize: "clamp(24px, 3.2vw, 40px)", fontWeight: 800, letterSpacing: "-0.03em" }}>{p.title}</p>
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: "var(--muted)" }}>{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ ...wrap, padding: "clamp(104px, 13vw, 160px) 24px 0" }}>
        <h2 data-reveal style={{ margin: 0, fontSize: "clamp(30px, 3.6vw, 44px)", fontWeight: 800, letterSpacing: "-0.04em" }}>
          자주 묻는 질문
        </h2>
        <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 10 }}>
          {FAQ.map((f, i) => (
            <details key={f.q} data-reveal style={{ ...delay(i * 80), borderRadius: 20, background: "var(--surface)" }}>
              <summary
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  minHeight: 44,
                  padding: "20px 24px",
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                {f.q}
                <svg className="lp-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF6B3D" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" style={{ flex: "none" }}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </summary>
              <p style={{ margin: 0, padding: "0 24px 22px", fontSize: 16, lineHeight: 1.65, color: "var(--ink-3)" }}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section id="subscribe" className="lp-sunrise" style={{ ...wrap, padding: "clamp(112px, 14vw, 176px) 24px clamp(64px, 8vw, 96px)", textAlign: "center" }}>
        <p
          className="mono"
          aria-hidden="true"
          data-reveal
          style={{ margin: 0, fontSize: "clamp(88px, 18vw, 240px)", fontWeight: 600, lineHeight: 0.9, letterSpacing: "-0.07em", color: accent }}
        >
          <Clock />
        </p>
        <h2 data-reveal style={{ ...delay(120), margin: "28px 0 0", fontSize: "clamp(32px, 4.8vw, 60px)", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.04em" }}>
          내일 아침 6시,
          <br />첫 일감 5개
        </h2>
        <Suspense fallback={<SubscribeForm id="b-cta-email" center />}>
          <SubscribeSlot id="b-cta-email" center searchParams={props.searchParams} />
        </Suspense>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          ...wrap,
          padding: "24px 24px 40px",
          borderTop: "1px solid var(--line)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px 24px",
          fontSize: 14,
          color: "var(--muted)",
        }}
      >
        <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG wordmark */}
          <img src="/brand/duckjob-wordmark-ondark.svg" alt="duckjob" width={76} height={22} style={{ display: "block", width: 76, height: 22 }} />· 매일 아침 6시, AI 일감 5개
        </p>
        <p style={{ margin: 0 }}>
          {contact ? `문의 ${contact} · ` : ""}이미지 Higgsfield AI 생성 · © 2026 duckjob
        </p>
        <p style={{ margin: 0, flexBasis: "100%", fontSize: 13 }}>
          <Link href="/privacy" style={{ color: "var(--muted)", textDecoration: "underline" }}>
            개인정보 처리방침
          </Link>
          <span style={{ margin: "0 8px" }}>·</span>
          <Link href="/guide" style={{ color: "var(--muted)", textDecoration: "underline" }}>
            해외 일감 이용 안내
          </Link>
          <span style={{ margin: "0 8px" }}>·</span>
          <Link href="/account" style={{ color: "var(--muted)", textDecoration: "underline" }}>
            내 정보·해지
          </Link>
          <span style={{ margin: "0 8px" }}>·</span>
          메일 맨 아래 [메일 그만 받기] 한 번이면 해지돼요.
        </p>
      </footer>
      <Reveal />
    </div>
  );
}
