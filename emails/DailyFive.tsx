import { Fragment } from "react";
import type { JobFact, StatusBadge } from "../lib/jobs/format";
import { Body, Button, Container, Head, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import { mailColor, mailFont } from "./theme";

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
  /** Why this job fits the person (personal picks: written from their AI profile). */
  reason: string | null;
  /** One concrete first step for today (personal picks). */
  today?: string | null;
  /** "AI로 도전해 볼 일감": not done before, doable with AI tools (personal picks). */
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
  jobs: DailyFiveJob[];
  recipientEmail: string;
  logoUrl: string;
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
  lineHeight: "20px",
  borderRadius: 999,
  padding: "0 10px",
  marginRight: 6,
} as const;

const s = {
  body: {
    backgroundColor: mailColor.page,
    margin: 0,
    padding: "28px 0 36px",
    fontFamily: mailFont,
    color: mailColor.ink,
    // Korean wraps between words, not mid-word.
    wordBreak: "keep-all" as const,
  },
  container: { maxWidth: 560, padding: "0 16px" },
  brandRow: { margin: "0 0 18px" },
  brandName: { fontSize: 17, fontWeight: 800, color: mailColor.ink, margin: 0, lineHeight: "32px" },
  day: { fontSize: 13, color: mailColor.muted, margin: "0 0 4px" },
  heading: { fontSize: 23, fontWeight: 800, lineHeight: "32px", margin: "0 0 6px", color: mailColor.ink },
  intro: { fontSize: 14, lineHeight: "22px", color: mailColor.muted, margin: "0 0 22px" },
  card: {
    backgroundColor: "#FFFFFF",
    border: `1px solid ${mailColor.line}`,
    borderRadius: 18,
    padding: "20px 20px 18px",
    margin: "0 0 14px",
  },
  number: {
    ...pill,
    padding: "0",
    width: 20,
    textAlign: "center" as const,
    color: "#FFFFFF",
    backgroundColor: mailColor.ink,
  },
  badgeOpen: { ...pill, color: "#1F5130", backgroundColor: "#D7F0DE" },
  badgePool: { ...pill, color: "#8A4B0F", backgroundColor: "#FFE8CC" },
  chip: { ...pill, fontWeight: 600, color: mailColor.muted, backgroundColor: "#F3ECE1" },
  headline: { fontSize: 19, fontWeight: 800, lineHeight: "27px", color: mailColor.ink, margin: "12px 0 2px" },
  origin: { fontSize: 13, lineHeight: "19px", color: mailColor.muted, margin: "0 0 12px" },
  summary: { fontSize: 14, lineHeight: "22px", color: mailColor.ink, margin: "0 0 3px" },
  bullet: { color: mailColor.accent, fontWeight: 800 },
  facts: { backgroundColor: "#FAF5EC", borderRadius: 12, padding: "10px 14px", margin: "14px 0 16px", width: "100%" },
  factLabel: { fontSize: 13, lineHeight: "22px", color: mailColor.muted, width: 72, verticalAlign: "top" as const, padding: "1px 0" },
  factValue: { fontSize: 13, lineHeight: "22px", color: mailColor.ink, fontWeight: 700, padding: "1px 0" },
  reason: { fontSize: 14, lineHeight: "21px", color: mailColor.accent, fontWeight: 700, margin: "0 0 6px" },
  today: { fontSize: 13, lineHeight: "20px", color: mailColor.ink, backgroundColor: "#FFF4D6", borderRadius: 10, padding: "8px 12px", margin: "0 0 14px" },
  todayLabel: { fontWeight: 800, color: mailColor.accent },
  stretchChip: { ...pill, color: "#FFFFFF", backgroundColor: "#6B4EFF" },
  sectionHeading: { fontSize: 18, fontWeight: 800, color: mailColor.ink, margin: "30px 0 4px" },
  sectionIntro: { fontSize: 13, lineHeight: "20px", color: mailColor.muted, margin: "0 0 14px" },
  button: {
    display: "block",
    textAlign: "center" as const,
    backgroundColor: mailColor.accent,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: 800,
    borderRadius: 999,
    padding: "13px 18px",
    textDecoration: "none",
  },
  buttonNote: { fontSize: 12, lineHeight: "18px", color: mailColor.muted, textAlign: "center" as const, margin: "8px 0 0" },
  smallLink: { fontSize: 12, color: mailColor.muted },
  tip: {
    backgroundColor: "#FFF4E6",
    border: `1px solid #F6D9B8`,
    borderRadius: 14,
    padding: "14px 16px",
    margin: "6px 0 0",
  },
  tipTitle: { fontSize: 14, fontWeight: 800, color: mailColor.ink, margin: "0 0 4px" },
  tipText: { fontSize: 13, lineHeight: "20px", color: mailColor.ink, margin: 0 },
  footer: { fontSize: 12, color: mailColor.muted, lineHeight: "18px", margin: "0 0 6px" },
  footerLink: { color: mailColor.muted, textDecoration: "underline" },
} as const;

function JobCard({ job, index }: { job: DailyFiveJob; index: number }) {
  return (
    <Section style={s.card}>
      <Text style={{ margin: 0, lineHeight: "20px" }}>
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
          <span style={s.todayLabel}>오늘 할 일</span> {job.today}
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

export default function DailyFive(props: DailyFiveProps) {
  const { brand, jobs } = props;
  const preview = jobs[0] ? `${jobs[0].headline} · ${jobs[0].summary[0] ?? ""}` : dailyFiveSubject(0, props.dateLabel);
  const host = props.appUrl.replace(/^https?:\/\//, "");

  return (
    <Html lang="ko">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <table role="presentation" cellPadding={0} cellSpacing={0} style={s.brandRow}>
            <tbody>
              <tr>
                <td style={{ paddingRight: 8, verticalAlign: "middle" }}>
                  <Img src={props.logoUrl} width="32" height="32" alt="" />
                </td>
                <td style={{ verticalAlign: "middle" }}>
                  <Text style={s.brandName}>{brand}</Text>
                </td>
              </tr>
            </tbody>
          </table>

          <Text style={s.day}>{`${props.dayLabel} · 좋은 아침이에요`}</Text>
          <Text style={s.heading}>{`오늘의 일감 ${jobs.length}개`}</Text>
          <Text style={s.intro}>
            {props.curation ?? "전 세계 단기 일감 중 한국에서 할 수 있는 것만 골라 한국어로 정리했어요."}
          </Text>

          {jobs.map((job, i) => (
            <Fragment key={job.id}>
              {job.stretch && !jobs[i - 1]?.stretch && (
                <>
                  <Text style={s.sectionHeading}>{`AI로 도전해 볼 일감 ${jobs.filter((j) => j.stretch).length}개`}</Text>
                  <Text style={s.sectionIntro}>주력 분야는 아니지만, AI 도구로 오늘 시안을 만들어 지원해 볼 만한 일이에요.</Text>
                </>
              )}
              <JobCard job={job} index={i} />
            </Fragment>
          ))}

          {props.profileNudge && (
            <Section style={{ ...s.card, padding: "16px 18px" }}>
              <Text style={s.tipTitle}>
                {props.profileNudge === "missing" ? "내 AI로 1분 분석하면 나에게 맞는 일감만 와요" : "분석한 지 2주가 지났어요"}
              </Text>
              <Text style={{ ...s.tipText, margin: "0 0 10px" }}>
                {props.profileNudge === "missing"
                  ? "지금은 모두에게 같은 일감이 가요. 평소 쓰는 AI가 나를 분석하게 하면 맞춤으로 바뀌어요. 더 넣고 싶은 내용은 AI에게 직접 말해서 넣어 달라고 하면 돼요."
                  : "AI에게 다시 분석받아 업데이트해 주세요. 그동안 해 본 일이나 더 넣고 싶은 내용은 AI에게 직접 말해서 넣어 달라고 하면 돼요."}
              </Text>
              <Link href={props.profileUrl} style={{ ...s.smallLink, color: mailColor.accent, fontWeight: 700, fontSize: 13 }}>
                {props.profileNudge === "missing" ? "1분 분석하기 →" : "다시 분석하기 →"}
              </Link>
            </Section>
          )}

          <Section style={s.tip}>
            <Text style={s.tipTitle}>지원 전에 확인하세요</Text>
            <Text style={s.tipText}>· 지원 가능 국가와 마감은 원문 공고 기준이에요.</Text>
            <Text style={s.tipText}>· 돈을 먼저 내라거나 메신저로만 연락하자는 곳은 지원하지 마세요.</Text>
          </Section>

          <Hr style={{ borderColor: mailColor.line, margin: "24px 0 14px" }} />
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
  logoUrl: "http://localhost:3000/duck-mail.png",
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
      reason: null,
      detailUrl: "http://localhost:3000/r/preview",
    },
  ],
} satisfies DailyFiveProps;
