import type { StatusBadge } from "../lib/jobs/format";
import { Body, Button, Container, Head, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import { mailColor, mailFont } from "./theme";

export type DailyFiveJob = {
  id: string;
  company: string;
  title: string;
  /** Korean 3-line summary (jobs.summary_ko). Never the original posting text. */
  summary: string[];
  badge: StatusBadge | null;
  conditions: string;
  reason: string | null;
  detailUrl: string;
  /** Phase 2 (/feedback). Hidden when absent. */
  feedbackUrl?: string | null;
};

export type DailyFiveProps = {
  brand: string;
  dateLabel: string;
  jobs: DailyFiveJob[];
  recipientEmail: string;
  logoUrl: string;
  appUrl: string;
  profileUrl: string;
  unsubscribeUrl: string;
  privacyUrl: string;
  /** Public contact (privacy policy §14); omitted until the service domain exists. */
  contactEmail: string | null;
};

export function dailyFiveSubject(count: number, dateLabel: string): string {
  return `오늘의 AI 일감 ${count}개 · ${dateLabel}`;
}

const pill = { display: "inline-block", fontSize: 12, fontWeight: 700, borderRadius: 999, padding: "2px 10px", margin: "0 0 8px" };
const s = {
  body: { backgroundColor: mailColor.page, margin: 0, padding: "24px 0", fontFamily: mailFont },
  container: { backgroundColor: mailColor.card, borderRadius: 16, maxWidth: 560, padding: "28px 24px" },
  heading: { fontSize: 20, fontWeight: 800, lineHeight: "28px", margin: "12px 0 18px", color: mailColor.ink },
  card: { border: `1px solid ${mailColor.line}`, borderRadius: 14, padding: "16px 16px 12px", margin: "0 0 12px" },
  badgeOpen: { ...pill, color: "#1F5130", backgroundColor: "#D3F2DC" },
  badgePool: { ...pill, color: "#8A4B0F", backgroundColor: "#FFE8CC" },
  company: { fontSize: 13, color: mailColor.muted, margin: "0 0 2px" },
  title: { fontSize: 16, fontWeight: 700, color: mailColor.ink, margin: "0 0 8px", lineHeight: "22px" },
  summary: { fontSize: 14, color: mailColor.ink, margin: "0 0 2px", lineHeight: "21px" },
  conditions: { fontSize: 13, color: mailColor.ink, fontWeight: 700, margin: "10px 0 2px" },
  reason: { fontSize: 13, color: mailColor.accent, margin: "0 0 10px" },
  button: {
    backgroundColor: mailColor.ink,
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 700,
    borderRadius: 999,
    padding: "10px 18px",
    textDecoration: "none",
  },
  smallLink: { fontSize: 12, color: mailColor.muted, marginLeft: 12 },
  footer: { fontSize: 12, color: mailColor.muted, lineHeight: "18px", margin: "0 0 6px" },
  footerLink: { color: mailColor.muted, textDecoration: "underline" },
} as const;

export default function DailyFive(props: DailyFiveProps) {
  const { brand, dateLabel, jobs } = props;
  const preview = jobs[0]?.summary[0] ?? dailyFiveSubject(jobs.length, dateLabel);
  const host = props.appUrl.replace(/^https?:\/\//, "");

  return (
    <Html lang="ko">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Img src={props.logoUrl} width="36" height="36" alt={brand} />
          <Text style={s.heading}>{dailyFiveSubject(jobs.length, dateLabel)}</Text>

          {jobs.map((job) => (
            <Section key={job.id} style={s.card}>
              {job.badge && <Text style={job.badge.tone === "open" ? s.badgeOpen : s.badgePool}>{job.badge.label}</Text>}
              <Text style={s.company}>{job.company}</Text>
              <Text style={s.title}>{job.title}</Text>
              {job.summary.slice(0, 3).map((line, i) => (
                <Text key={i} style={s.summary}>
                  · {line}
                </Text>
              ))}
              <Text style={s.conditions}>{job.conditions}</Text>
              {job.reason && <Text style={s.reason}>{job.reason}</Text>}
              <Section style={{ margin: "8px 0 4px" }}>
                <Button href={job.detailUrl} style={s.button}>
                  자세히 보기
                </Button>
                {job.feedbackUrl && (
                  <Link href={job.feedbackUrl} style={s.smallLink}>
                    관심 없어요
                  </Link>
                )}
              </Section>
            </Section>
          ))}

          <Hr style={{ borderColor: mailColor.line, margin: "20px 0 14px" }} />
          {/* Footer per docs/legal/privacy-research-2026-11-09.md (c): why you got this, how to stop, policy, contact. */}
          <Text style={s.footer}>
            {props.recipientEmail}님이 {brand} 일일 메일을 구독해서 보내 드렸어요. 조건과 마감은 원문 공고에서 꼭 다시 확인하세요.{" "}
            {brand}은 지원서를 대신 내거나 회원 정보를 채용사에 넘기지 않아요.
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
            <Link href={props.privacyUrl} style={s.footerLink}>
              개인정보 처리방침
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
  dateLabel: "11월 8일",
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
      company: "Example AI",
      title: "Korean AI Trainer",
      summary: ["한국어 AI 답변을 평가하고 고쳐 쓰는 일", "한국어 원어민, 전 세계 원격 지원 가능", "시간당 30~35달러, 주 15시간부터"],
      badge: { label: "실제 프로젝트", tone: "open" },
      conditions: "시간당 $30~35 · 주 15시간~",
      reason: null,
      detailUrl: "http://localhost:3000/r/preview",
    },
  ],
} satisfies DailyFiveProps;
