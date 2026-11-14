import { Body, Button, Container, Head, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import { mailColor, mailFont, mailMono } from "./theme";

export type LoginLinkProps = {
  confirmUrl: string;
  /** Wordmark for the dark header (PNG). */
  logoUrl: string;
  brand: string;
  /** prompts/profile-extract.md: what the person pastes into their own AI. */
  prompt: string;
  /** Where the AI's answer is pasted back (/onboarding). */
  pasteUrl: string;
};

export function loginLinkSubject(brand: string): string {
  return `${brand} 구독 확인 · AI에 붙여넣을 프롬프트`;
}

const s = {
  body: { backgroundColor: mailColor.page, margin: 0, padding: "24px 0 40px", fontFamily: mailFont, color: mailColor.ink, wordBreak: "keep-all" as const },
  container: { maxWidth: 560, padding: "0 16px" },
  clock: { fontFamily: mailMono, fontSize: 13, color: mailColor.accent, margin: 0, textAlign: "right" as const },
  heading: { fontSize: 28, fontWeight: 800, lineHeight: "36px", letterSpacing: "-0.03em", color: mailColor.ink, margin: "30px 0 10px" },
  intro: { fontSize: 15, lineHeight: "24px", color: mailColor.inkSoft, margin: "0 0 24px" },
  step: { backgroundColor: mailColor.surface, borderRadius: 22, padding: "18px 20px", margin: "0 0 12px" },
  stepNo: { fontFamily: mailMono, fontSize: 13, color: mailColor.accent, margin: 0 },
  stepTitle: { fontSize: 18, fontWeight: 800, color: mailColor.ink, margin: "6px 0 0", lineHeight: "26px" },
  stepText: { fontSize: 14, lineHeight: "22px", color: mailColor.inkSoft, margin: "6px 0 0" },
  chip: {
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 999,
    border: "1px solid #4A4945",
    fontSize: 13,
    fontWeight: 600,
    color: mailColor.ink,
    marginRight: 6,
  },
  button: {
    display: "block",
    textAlign: "center" as const,
    backgroundColor: mailColor.accent,
    color: mailColor.onAccent,
    fontSize: 16,
    fontWeight: 800,
    borderRadius: 999,
    padding: "14px 18px",
    textDecoration: "none",
    margin: "14px 0 0",
  },
  note: { fontSize: 12, lineHeight: "18px", color: mailColor.muted, margin: "10px 0 0" },
  promptBox: { backgroundColor: mailColor.paper, borderRadius: 18, padding: "16px 18px", margin: "14px 0 0" },
  promptLabel: { fontSize: 12, fontWeight: 800, color: mailColor.paperMuted, margin: "0 0 8px" },
  prompt: { fontSize: 13, lineHeight: "21px", color: mailColor.paperInk, margin: 0, whiteSpace: "pre-wrap" as const, wordBreak: "break-word" as const },
  link: { fontSize: 15, fontWeight: 800, color: mailColor.accent, textDecoration: "none" },
  lock: { fontSize: 13, lineHeight: "20px", color: mailColor.muted, margin: "16px 0 0" },
  footer: { fontSize: 12, color: mailColor.muted, lineHeight: "19px", margin: "0 0 6px" },
} as const;

/**
 * The confirmation mail (sign-in = subscription, spec §2.1), following the
 * landing page's steps: confirm, paste this prompt into your own AI, paste
 * its answer back into 덕잡.
 */
export default function LoginLink({ confirmUrl, logoUrl, brand, prompt, pasteUrl }: LoginLinkProps) {
  return (
    <Html lang="ko">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
      </Head>
      <Preview>구독을 확인하고, 아래 프롬프트를 평소 쓰는 AI에 붙여넣어 주세요</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
            <tbody>
              <tr>
                <td style={{ verticalAlign: "middle" }}>
                  <Img src={logoUrl} width="100" height="29" alt={brand} style={{ display: "block" }} />
                </td>
                <td style={{ verticalAlign: "middle" }}>
                  <Text style={s.clock}>● 매일 06:00 KST</Text>
                </td>
              </tr>
            </tbody>
          </table>

          <Text style={s.heading}>
            확인 메일이에요.
            <br />세 단계면 끝나요
          </Text>
          <Text style={s.intro}>내일 아침 6시부터, 그동안 익힌 AI 실력에 딱 맞는 단기 일감 5개를 보내드려요.</Text>

          <Section style={s.step}>
            <Text style={s.stepNo}>01</Text>
            <Text style={s.stepTitle}>구독 확인</Text>
            <Text style={s.stepText}>버튼을 누르면 구독이 확인되고 덕잡에 로그인돼요.</Text>
            <Button href={confirmUrl} style={s.button}>
              구독 확인하기
            </Button>
            <Text style={s.note}>버튼은 1시간 동안, 한 번만 쓸 수 있어요. 직접 요청하지 않았다면 이 메일은 무시하세요.</Text>
          </Section>

          <Section style={s.step}>
            <Text style={s.stepNo}>02</Text>
            <Text style={s.stepTitle}>아래 프롬프트를 복사해서 평소 쓰는 AI에 붙여넣기</Text>
            <Text style={{ ...s.stepText, margin: "10px 0 0" }}>
              <span style={s.chip}>ChatGPT</span>
              <span style={s.chip}>Claude</span>
              <span style={s.chip}>Gemini</span>
            </Text>
            <Text style={s.stepText}>AI가 나를 분석해서 덕잡에 넣을 프로필, 내 스펙 요약, 한글·영문 이력서를 만들어 줘요.</Text>
            <Section style={s.promptBox}>
              <Text style={s.promptLabel}>AI에 붙여넣을 프롬프트 (처음부터 끝까지 복사)</Text>
              <Text style={s.prompt}>{prompt}</Text>
            </Section>
          </Section>

          <Section style={s.step}>
            <Text style={s.stepNo}>03</Text>
            <Text style={s.stepTitle}>AI가 정리해 준 답을 덕잡에 다시 붙여넣기</Text>
            <Text style={s.stepText}>AI 답의 코드 블록을 통째로 복사해서 붙여넣으면, 그 분석대로 일감을 골라요.</Text>
            <Text style={{ ...s.stepText, margin: "12px 0 0" }}>
              <Link href={pasteUrl} style={s.link}>
                덕잡에 붙여넣기 →
              </Link>
            </Text>
          </Section>

          <Text style={s.lock}>🔒 붙여넣은 내용은 공고를 고르는 데만 쓰고, 원문은 저장하지 않아요.</Text>

          <Hr style={{ borderColor: mailColor.line, margin: "24px 0 16px" }} />
          <Text style={s.footer}>무료이고, 그만 받고 싶으면 일감 메일 맨 아래 [메일 그만 받기] 한 번이면 해지돼요.</Text>
          <Text style={s.footer}>{brand} · 매일 아침 6시, AI 일감 5개</Text>
        </Container>
      </Body>
    </Html>
  );
}

LoginLink.PreviewProps = {
  confirmUrl: "http://localhost:3000/auth/confirm?token_hash=preview&type=magiclink",
  logoUrl: "http://localhost:3000/brand/duckjob-wordmark-ondark-240.png",
  brand: "덕잡",
  prompt: "지금부터 네가 나에 대해 아는 것으로 네 가지를 만들어줘. …",
  pasteUrl: "http://localhost:3000/onboarding",
} satisfies LoginLinkProps;
