import type { StatusBadge } from "../lib/jobs/format";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

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
  dateLabel: string;
  jobs: DailyFiveJob[];
  profileUrl: string;
  unsubscribeUrl: string;
  senderInfo: string;
};

export function dailyFiveSubject(count: number, dateLabel: string): string {
  return `오늘의 AI 일감 ${count}개 · ${dateLabel}`;
}

const font =
  '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", "Segoe UI", sans-serif';

const s = {
  body: { backgroundColor: "#f4f4f5", margin: 0, padding: "24px 0", fontFamily: font },
  container: { backgroundColor: "#ffffff", borderRadius: 12, maxWidth: 560, padding: "28px 24px" },
  heading: { fontSize: 20, lineHeight: "28px", margin: "0 0 4px", color: "#18181b" },
  lead: { fontSize: 14, color: "#52525b", margin: "0 0 20px" },
  card: { border: "1px solid #e4e4e7", borderRadius: 10, padding: "16px 16px 12px", margin: "0 0 14px" },
  badgeOpen: {
    display: "inline-block",
    fontSize: 12,
    fontWeight: 600,
    color: "#065f46",
    backgroundColor: "#d1fae5",
    borderRadius: 999,
    padding: "2px 10px",
    margin: "0 0 8px",
  },
  badgePool: {
    display: "inline-block",
    fontSize: 12,
    fontWeight: 600,
    color: "#92400e",
    backgroundColor: "#fef3c7",
    borderRadius: 999,
    padding: "2px 10px",
    margin: "0 0 8px",
  },
  company: { fontSize: 13, color: "#71717a", margin: "0 0 2px" },
  title: { fontSize: 16, fontWeight: 700, color: "#18181b", margin: "0 0 8px", lineHeight: "22px" },
  summary: { fontSize: 14, color: "#3f3f46", margin: "0 0 2px", lineHeight: "21px" },
  conditions: { fontSize: 13, color: "#18181b", fontWeight: 600, margin: "10px 0 2px" },
  reason: { fontSize: 13, color: "#4f46e5", margin: "0 0 10px" },
  button: {
    backgroundColor: "#18181b",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 600,
    borderRadius: 8,
    padding: "10px 16px",
    textDecoration: "none",
  },
  smallLink: { fontSize: 12, color: "#71717a", marginLeft: 12 },
  footer: { fontSize: 12, color: "#71717a", lineHeight: "18px", margin: "0 0 6px" },
  footerLink: { color: "#71717a", textDecoration: "underline" },
} as const;

export default function DailyFive({ dateLabel, jobs, profileUrl, unsubscribeUrl, senderInfo }: DailyFiveProps) {
  const preview = jobs[0]?.summary[0] ?? dailyFiveSubject(jobs.length, dateLabel);

  return (
    <Html lang="ko">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Heading as="h1" style={s.heading}>
            {dailyFiveSubject(jobs.length, dateLabel)}
          </Heading>
          <Text style={s.lead}>학위·자격증 없이 할 수 있는 원격 AI 일감을 골랐어요.</Text>

          {jobs.map((job) => (
            <Section key={job.id} style={s.card}>
              {job.badge && (
                <Text style={job.badge.tone === "open" ? s.badgeOpen : s.badgePool}>{job.badge.label}</Text>
              )}
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
                  자세히 보고 지원 준비
                </Button>
                {job.feedbackUrl && (
                  <Link href={job.feedbackUrl} style={s.smallLink}>
                    관심 없어요
                  </Link>
                )}
              </Section>
            </Section>
          ))}

          <Hr style={{ borderColor: "#e4e4e7", margin: "20px 0 14px" }} />
          <Text style={s.footer}>보수·지원 조건은 원문에서 최종 확인하세요. 지원은 원문 플랫폼에서 직접 해요.</Text>
          <Text style={s.footer}>
            <Link href={profileUrl} style={s.footerLink}>
              프로필 수정
            </Link>
            {"  ·  "}
            <Link href={unsubscribeUrl} style={s.footerLink}>
              수신거부
            </Link>
          </Text>
          <Text style={s.footer}>{senderInfo}</Text>
        </Container>
      </Body>
    </Html>
  );
}

/** Sample data for previewing the template locally. */
DailyFive.PreviewProps = {
  dateLabel: "11월 8일",
  profileUrl: "http://localhost:3000/onboarding",
  unsubscribeUrl: "http://localhost:3000/api/email/unsubscribe?t=preview",
  senderInfo: "AI잡5 (가칭)",
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
