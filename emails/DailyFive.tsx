import { Fragment } from "react";
import type { JobFact, StatusBadge } from "../lib/jobs/format";
import { Body, Button, Container, Head, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import { mailColor, mailFont, mailFontFace, type MailBanners } from "./theme";

export type DailyFiveJob = {
  id: string;
  /** Korean title (jobs.title_ko), or the original title when there is none. */
  headline: string;
  company: string;
  /** Original title, shown small under a Korean headline. Null when the headline already is it. */
  originalTitle: string | null;
  /** Korean 3-line summary (jobs.summary_ko). Never the original posting text. */
  summary: string[];
  badge: StatusBadge | null;
  category: string | null;
  facts: JobFact[];
  /** "$250~750" for the list at the top (null: shown as 원문 확인). */
  pay?: string | null;
  /** Why this job fits the person (personal picks: written from their AI profile). */
  reason: string | null;
  /** One concrete first step for today (personal picks). */
  today?: string | null;
  /** "AI로 도전해 볼 일감": not the person's main field, doable with AI tools (personal picks). */
  stretch?: boolean;
  detailUrl: string;
  /** /feedback confirmation page (관심 없어요·신고). Hidden when absent. */
  feedbackUrl?: string | null;
};

export type DailyFiveProps = {
  brand: string;
  /** "11월 13일" — subject line. */
  dateLabel: string;
  /** "11월 13일 금요일" — top of the mail. */
  dayLabel: string;
  /** "지난 하루 새로 올라온 공고 N개 중 …" — replaces the plain intro when present. */
  curation?: string | null;
  /** Picked for this person from their AI's analysis ("오늘의 맞춤 일감"). */
  personal?: boolean;
  jobs: DailyFiveJob[];
  recipientEmail: string;
  /** Wordmark for the dark header (PNG). */
  logoUrl: string;
  /** App icon for the light list card (PNG). */
  iconUrl?: string;
  /** Dawn, golden-hour and blue-hour photo banners, like the landing page's backdrop. */
  banners?: MailBanners | null;
  /** Pretendard web font (used where the mail app loads fonts). */
  fontUrl?: string | null;
  appUrl: string;
  profileUrl: string;
  unsubscribeUrl: string;
  privacyUrl: string;
  /** Profile reminder box (lib/digest/nudge.ts): no analysis yet, or two weeks since the last one. */
  profileNudge?: "missing" | "stale" | null;
  /** Public contact (privacy policy §14); omitted until the service domain exists. */
  contactEmail: string | null;
};

export function dailyFiveSubject(count: number, dateLabel: string): string {
  return `오늘의 일감 ${count}개 · ${dateLabel}`;
}

const pill = {
  display: "inline-block",
  fontSize: 12,
  fontWeight: 700,
  lineHeight: "22px",
  borderRadius: 999,
  padding: "0 10px",
  marginRight: 6,
} as const;

const s = {
  body: {
    backgroundColor: mailColor.page,
    margin: 0,
    padding: "24px 0 40px",
    fontFamily: mailFont,
    color: mailColor.ink,
    // Korean wraps between words, not mid-word.
    wordBreak: "keep-all" as const,
  },
  container: { maxWidth: 560, padding: "0 16px" },
  hero: { display: "block", width: "100%", height: "auto", borderRadius: 26, margin: "20px 0 0" },
  strip: { display: "block", width: "100%", height: "auto", borderRadius: 18, margin: "30px 0 0" },
  clock: { fontSize: 13, fontWeight: 700, color: mailColor.accent, margin: 0, textAlign: "right" as const },
  day: { fontSize: 13, color: mailColor.muted, margin: "30px 0 8px" },
  heading: { fontSize: 30, fontWeight: 800, lineHeight: "38px", letterSpacing: "-0.03em", margin: "0 0 10px", color: mailColor.ink },
  intro: { fontSize: 15, lineHeight: "24px", color: mailColor.inkSoft, margin: "0 0 24px" },

  // The day's list: the light card from the landing page's hero.
  list: { backgroundColor: mailColor.paper, borderRadius: 26, padding: "18px 20px 8px", margin: "0 0 28px", color: mailColor.paperInk },
  listBrand: { fontSize: 14, fontWeight: 700, color: mailColor.paperInk, margin: 0 },
  listTime: { fontSize: 13, color: mailColor.paperMuted, margin: 0, textAlign: "right" as const },
  listTitle: { fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", color: mailColor.paperInk, margin: "14px 0 4px" },
  rowTitle: { fontSize: 15, fontWeight: 600, lineHeight: "21px", color: mailColor.paperInk, margin: 0 },
  rowMeta: { fontSize: 13, lineHeight: "19px", color: mailColor.paperMuted, margin: "3px 0 0" },
  rowPay: { fontSize: 15, fontWeight: 800, color: mailColor.paperInk, margin: 0, whiteSpace: "nowrap" as const, textAlign: "right" as const },

  card: { backgroundColor: mailColor.paper, borderRadius: 22, padding: "22px 20px 20px", margin: "0 0 14px", color: mailColor.paperInk },
  number: { ...pill, padding: 0, width: 22, textAlign: "center" as const, color: mailColor.paper, backgroundColor: mailColor.paperInk },
  stretchChip: { ...pill, color: mailColor.onAccent, backgroundColor: mailColor.accent, fontWeight: 800 },
  badgeOpen: { ...pill, color: mailColor.paperInk, backgroundColor: mailColor.paperLine },
  badgePool: { ...pill, color: "#7A2E14", backgroundColor: "#FFE3D8" },
  chip: { ...pill, fontWeight: 600, color: mailColor.paperMuted, border: `1px solid #CFCCC5`, lineHeight: "20px" },
  headline: { fontSize: 20, fontWeight: 800, lineHeight: "28px", letterSpacing: "-0.02em", color: mailColor.paperInk, margin: "14px 0 2px" },
  origin: { fontSize: 13, lineHeight: "19px", color: mailColor.paperMuted, margin: "0 0 12px" },
  summary: { fontSize: 14, lineHeight: "22px", color: mailColor.paperInk, margin: "0 0 3px" },
  bullet: { color: mailColor.accent, fontWeight: 800 },
  facts: { backgroundColor: mailColor.paperWell, borderRadius: 14, padding: "10px 14px", margin: "14px 0 16px", width: "100%" },
  factLabel: { fontSize: 13, lineHeight: "22px", color: mailColor.paperMuted, width: 72, verticalAlign: "top" as const, padding: "1px 0" },
  factValue: { fontSize: 13, lineHeight: "22px", color: mailColor.paperInk, fontWeight: 700, padding: "1px 0" },
  reason: {
    fontSize: 15,
    lineHeight: "23px",
    color: mailColor.paperInk,
    fontWeight: 700,
    margin: "0 0 10px",
    borderLeft: `3px solid ${mailColor.accent}`,
    paddingLeft: 10,
  },
  today: { fontSize: 14, lineHeight: "21px", color: mailColor.paperInk, backgroundColor: "#FFFFFF", borderRadius: 14, padding: "10px 14px", margin: "0 0 16px" },
  todayDot: { color: mailColor.accent },
  button: {
    display: "block",
    textAlign: "center" as const,
    backgroundColor: mailColor.accent,
    color: mailColor.onAccent,
    fontSize: 15,
    fontWeight: 800,
    borderRadius: 999,
    padding: "14px 18px",
    textDecoration: "none",
  },
  buttonNote: { fontSize: 12, lineHeight: "18px", color: mailColor.paperMuted, textAlign: "center" as const, margin: "10px 0 0" },
  smallLink: { fontSize: 12, color: mailColor.paperMuted, textDecoration: "underline" },

  sectionLabel: { fontSize: 13, fontWeight: 700, color: mailColor.accent, margin: "34px 0 6px" },
  sectionHeading: { fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: mailColor.ink, margin: "0 0 4px" },
  sectionIntro: { fontSize: 14, lineHeight: "22px", color: mailColor.muted, margin: "0 0 16px" },

  box: { backgroundColor: mailColor.surface, borderRadius: 20, padding: "18px 20px", margin: "14px 0 0" },
  boxTitle: { fontSize: 15, fontWeight: 800, color: mailColor.ink, margin: "0 0 6px" },
  boxText: { fontSize: 13, lineHeight: "21px", color: mailColor.inkSoft, margin: 0 },
  boxLink: { fontSize: 14, fontWeight: 800, color: mailColor.accent, textDecoration: "none" },

  footer: { fontSize: 12, color: mailColor.muted, lineHeight: "19px", margin: "0 0 6px" },
  footerLink: { color: mailColor.muted, textDecoration: "underline" },
} as const;

function JobCard({ job, index }: { job: DailyFiveJob; index: number }) {
  return (
    <Section style={s.card}>
      <Text style={{ margin: 0, lineHeight: "22px" }}>
        <span style={s.number}>{index + 1}</span>
        {job.stretch && <span style={s.stretchChip}>AI로 도전</span>}
        {job.badge && <span style={job.badge.tone === "open" ? s.badgeOpen : s.badgePool}>{job.badge.label}</span>}
        {job.category && <span style={s.chip}>{job.category}</span>}
      </Text>
      <Text style={s.headline}>{job.headline}</Text>
      <Text style={s.origin}>{job.originalTitle ? `${job.company} · ${job.originalTitle}` : job.company}</Text>

      {job.summary.slice(0, 3).map((line, i) => (
        <Text key={i} style={s.summary}>
          <span style={s.bullet}>·</span> {line}
        </Text>
      ))}

      <table role="presentation" cellPadding={0} cellSpacing={0} style={s.facts}>
        <tbody>
          {job.facts.map((f) => (
            <tr key={f.label}>
              <td style={s.factLabel}>{f.label}</td>
              <td style={s.factValue}>{f.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {job.reason && <Text style={s.reason}>{job.reason}</Text>}
      {job.today && (
        <Text style={s.today}>
          <span style={s.todayDot}>●</span> <strong>오늘 할 일</strong> {job.today}
        </Text>
      )}
      <Button href={job.detailUrl} style={s.button}>
        공고 보러 가기 →
      </Button>
      <Text style={s.buttonNote}>
        {job.company} 공고 페이지로 이동해요. 지원은 그곳에서 직접 해요.
        {job.feedbackUrl && (
          <>
            {"  ·  "}
            <Link href={job.feedbackUrl} style={s.smallLink}>
              관심 없어요·신고
            </Link>
          </>
        )}
      </Text>
    </Section>
  );
}

/** The day at a glance, like the example mail on the landing page. */
function DayList({ jobs, title, iconUrl, brand }: { jobs: DailyFiveJob[]; title: string; iconUrl?: string; brand: string }) {
  return (
    <Section style={s.list}>
      <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
        <tbody>
          <tr>
            {iconUrl && (
              <td style={{ width: 42, verticalAlign: "middle" }}>
                <Img src={iconUrl} width="32" height="32" alt="" style={{ display: "block", borderRadius: 8 }} />
              </td>
            )}
            <td style={{ verticalAlign: "middle" }}>
              <Text style={s.listBrand}>{brand === "덕잡" ? "duckjob" : brand}</Text>
            </td>
            <td style={{ verticalAlign: "middle" }}>
              <Text style={s.listTime}>오전 6:00</Text>
            </td>
          </tr>
        </tbody>
      </table>
      <Text style={s.listTitle}>{title}</Text>
      <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
        <tbody>
          {jobs.map((job, i) => {
            const border = i < jobs.length - 1 ? `1px solid ${mailColor.paperLine}` : "none";
            const meta = [job.stretch ? "AI로 도전" : null, job.category, job.company].filter(Boolean).join(" · ");
            return (
              <tr key={job.id}>
                <td style={{ padding: "10px 12px 10px 0", borderBottom: border, verticalAlign: "top" }}>
                  <Text style={s.rowTitle}>{job.headline}</Text>
                  <Text style={s.rowMeta}>{meta}</Text>
                </td>
                <td style={{ padding: "10px 0", borderBottom: border, verticalAlign: "top", textAlign: "right" }}>
                  <Text style={s.rowPay}>{job.pay ?? "원문 확인"}</Text>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Section>
  );
}

export default function DailyFive(props: DailyFiveProps) {
  const { brand, jobs } = props;
  const preview = jobs[0] ? `${jobs[0].headline} · ${jobs[0].summary[0] ?? ""}` : dailyFiveSubject(0, props.dateLabel);
  const host = props.appUrl.replace(/^https?:\/\//, "");
  const title = `${props.personal ? "오늘의 맞춤 일감" : "오늘의 일감"} ${jobs.length}개`;
  const stretchCount = jobs.filter((j) => j.stretch).length;

  return (
    <Html lang="ko">
      <Head>
        {/* Already dark: tell mail apps not to repaint it. */}
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        {props.fontUrl && <style dangerouslySetInnerHTML={{ __html: mailFontFace(props.fontUrl) }} />}
      </Head>
      <Preview>{preview}</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
            <tbody>
              <tr>
                <td style={{ verticalAlign: "middle" }}>
                  <Img src={props.logoUrl} width="100" height="29" alt={brand} style={{ display: "block" }} />
                </td>
                <td style={{ verticalAlign: "middle" }}>
                  <Text style={s.clock}>● 매일 아침 6시</Text>
                </td>
              </tr>
            </tbody>
          </table>

          {props.banners && <Img src={props.banners.dawn} width="528" height="264" alt="매일 아침 6시" style={s.hero} />}

          <Text style={s.day}>{`${props.dayLabel} · 좋은 아침이에요`}</Text>
          <Text style={s.heading}>{title}</Text>
          <Text style={s.intro}>
            {props.curation ?? "전 세계 공고 중 한국에서 할 수 있는 일감만 골라 한국어로 정리했어요."}
          </Text>

          {jobs.length > 1 && <DayList jobs={jobs} title={title} iconUrl={props.iconUrl} brand={brand} />}

          {jobs.map((job, i) => (
            <Fragment key={job.id}>
              {job.stretch && !jobs[i - 1]?.stretch && (
                <>
                  {props.banners && <Img src={props.banners.golden} width="528" height="120" alt="" style={s.strip} />}
                  <Text style={props.banners ? { ...s.sectionLabel, marginTop: 14 } : s.sectionLabel}>AI × 도전</Text>
                  <Text style={s.sectionHeading}>{`AI로 도전해 볼 일감 ${stretchCount}개`}</Text>
                  <Text style={s.sectionIntro}>주력 분야는 아니지만, AI 도구로 오늘 시안을 만들어 지원해 볼 만한 일이에요.</Text>
                </>
              )}
              <JobCard job={job} index={i} />
            </Fragment>
          ))}

          {props.profileNudge && (
            <Section style={s.box}>
              <Text style={s.boxTitle}>
                {props.profileNudge === "missing" ? "내 AI로 1분 분석하면 나에게 맞는 일감만 와요" : "분석한 지 2주가 지났어요"}
              </Text>
              <Text style={{ ...s.boxText, margin: "0 0 12px" }}>
                {props.profileNudge === "missing"
                  ? "지금은 모두에게 같은 일감이 가요. 평소 쓰는 AI가 나를 분석하게 하면 맞춤으로 바뀌고, 한·영 이력서도 함께 받아요. 더 넣고 싶은 내용은 AI에게 직접 말해서 넣어 달라고 하면 돼요."
                  : "AI에게 다시 분석받아 업데이트해 주세요. 그동안 해 본 일이나 더 넣고 싶은 내용은 AI에게 직접 말해서 넣어 달라고 하면 돼요."}
              </Text>
              <Link href={props.profileUrl} style={s.boxLink}>
                {props.profileNudge === "missing" ? "1분 분석하기 →" : "다시 분석하기 →"}
              </Link>
            </Section>
          )}

          <Section style={s.box}>
            <Text style={s.boxTitle}>지원 전에 확인하세요</Text>
            <Text style={s.boxText}>· 지원 가능 국가와 마감은 원문 공고 기준이에요.</Text>
            <Text style={s.boxText}>· 돈을 먼저 내라거나 메신저로만 연락하자는 곳은 지원하지 마세요.</Text>
          </Section>

          {props.banners && <Img src={props.banners.blueHour} width="528" height="200" alt="내일 아침 6시" style={{ ...s.strip, margin: "28px 0 0" }} />}
          <Hr style={{ borderColor: mailColor.line, margin: "28px 0 16px" }} />
          {/* Footer per docs/legal/privacy-research-2026-11-09.md (c): why you got this, how to stop, policy, contact. */}
          <Text style={s.footer}>
            {props.recipientEmail}님이 {brand} 일일 메일을 구독해서 보내 드렸어요. {brand}은 지원서를 대신 내거나 회원
            정보를 채용사에 넘기지 않아요.
          </Text>
          <Text style={s.footer}>
            <Link href={props.profileUrl} style={s.footerLink}>
              프로필 수정
            </Link>
            {"  ·  "}
            <Link href={props.unsubscribeUrl} style={s.footerLink}>
              메일 그만 받기
            </Link>
            {"  ·  "}
            <Link href={`${props.appUrl}/account`} style={s.footerLink}>
              탈퇴(정보 삭제)
            </Link>
            {"  ·  "}
            <Link href={props.privacyUrl} style={s.footerLink}>
              개인정보 처리방침
            </Link>
            {"  ·  "}
            <Link href={`${props.appUrl}/guide`} style={s.footerLink}>
              해외 일감 이용 안내
            </Link>
          </Text>
          <Text style={s.footer}>
            {brand}
            {props.contactEmail ? ` · 문의 ${props.contactEmail}` : ""} · {host}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

/** Sample data for previewing the template locally. */
DailyFive.PreviewProps = {
  brand: "덕잡",
  dateLabel: "11월 13일",
  dayLabel: "11월 13일 금요일",
  recipientEmail: "me@example.com",
  logoUrl: "http://localhost:3000/brand/duckjob-wordmark-ondark-240.png",
  iconUrl: "http://localhost:3000/brand/duckjob-appicon-96.png",
  appUrl: "http://localhost:3000",
  profileUrl: "http://localhost:3000/onboarding",
  unsubscribeUrl: "http://localhost:3000/api/email/unsubscribe?t=preview",
  privacyUrl: "http://localhost:3000/privacy",
  contactEmail: null,
  jobs: [
    {
      id: "1",
      headline: "한국어 AI 답변 평가",
      company: "Example AI",
      originalTitle: "Korean AI Trainer",
      summary: ["AI가 쓴 한국어 답변을 읽고 점수를 매기는 일", "한국어 원어민, 영어 지시문을 읽을 수 있으면 지원 가능", "시간당 30~35달러, 주 10시간부터 원격"],
      badge: { label: "실제 프로젝트", tone: "open" },
      category: "언어 작업",
      facts: [
        { label: "보수", value: "시간당 $30~35" },
        { label: "시간", value: "주 10시간부터" },
        { label: "작업 언어", value: "한국어, 영어" },
        { label: "영어", value: "읽기 수준" },
      ],
      pay: "$30~35/시간",
      reason: null,
      detailUrl: "http://localhost:3000/r/preview",
    },
  ],
} satisfies DailyFiveProps;
