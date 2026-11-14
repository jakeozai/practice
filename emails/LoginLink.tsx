import { Body, Button, Container, Head, Hr, Html, Img, Preview, Text } from "@react-email/components";
import { mailColor, mailFont, mailFontFace, type MailBanners } from "./theme";

export type LoginLinkProps = {
  confirmUrl: string;
  /** Wordmark for the dark header (PNG). */
  logoUrl: string;
  brand: string;
  /** Dawn and blue-hour photo banners, like the landing page's backdrop. */
  banners?: MailBanners | null;
  /** Pretendard web font (used where the mail app loads fonts). */
  fontUrl?: string | null;
};

export function loginLinkSubject(brand: string): string {
  return `${brand} 구독 확인`;
}

const s = {
  body: { backgroundColor: mailColor.page, margin: 0, padding: "24px 0 40px", fontFamily: mailFont, color: mailColor.ink, wordBreak: "keep-all" as const },
  container: { maxWidth: 560, padding: "0 16px" },
  hero: { display: "block", width: "100%", height: "auto", borderRadius: 26, margin: "20px 0 0" },
  strip: { display: "block", width: "100%", height: "auto", borderRadius: 18, margin: "32px 0 0" },
  clock: { fontSize: 13, fontWeight: 700, color: mailColor.accent, margin: 0, textAlign: "right" as const },
  heading: { fontSize: 28, fontWeight: 800, lineHeight: "36px", letterSpacing: "-0.03em", color: mailColor.ink, margin: "26px 0 10px" },
  intro: { fontSize: 15, lineHeight: "24px", color: mailColor.inkSoft, margin: "0 0 22px" },
  button: {
    display: "block",
    textAlign: "center" as const,
    backgroundColor: mailColor.accent,
    color: mailColor.onAccent,
    fontSize: 17,
    fontWeight: 800,
    borderRadius: 999,
    padding: "16px 18px",
    textDecoration: "none",
  },
  note: { fontSize: 13, lineHeight: "20px", color: mailColor.muted, margin: "14px 0 0" },
  footer: { fontSize: 12, color: mailColor.muted, lineHeight: "19px", margin: "0 0 6px" },
} as const;

/**
 * The confirmation mail (sign-in = subscription, spec §2.1): one button.
 * Everything after it — copying the prompt, the person's own AI, pasting
 * the answer back — happens on 덕잡's own pages (2026-11-14 user decision).
 */
export default function LoginLink({ confirmUrl, logoUrl, brand, banners, fontUrl }: LoginLinkProps) {
  return (
    <Html lang="ko">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        {fontUrl && <style dangerouslySetInnerHTML={{ __html: mailFontFace(fontUrl) }} />}
      </Head>
      <Preview>버튼 하나만 누르면 덕잡이 시작돼요</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
            <tbody>
              <tr>
                <td style={{ verticalAlign: "middle" }}>
                  <Img src={logoUrl} width="100" height="29" alt={brand} style={{ display: "block" }} />
                </td>
                <td style={{ verticalAlign: "middle" }}>
                  <Text style={s.clock}>● 매일 아침 6시</Text>
                </td>
              </tr>
            </tbody>
          </table>

          {banners && <Img src={banners.dawn} width="528" height="264" alt="매일 아침 6시" style={s.hero} />}

          <Text style={s.heading}>구독 확인 메일이에요</Text>
          <Text style={s.intro}>아래 버튼을 누르면 덕잡이 열리고, 1분이면 나에게 맞는 일감 받을 준비가 끝나요.</Text>
          <Button href={confirmUrl} style={s.button}>
            구독 확인하기
          </Button>
          <Text style={s.note}>버튼은 1시간 동안 쓸 수 있어요. 직접 요청하지 않았다면 이 메일은 무시하세요.</Text>

          {banners && <Img src={banners.blueHour} width="528" height="200" alt="내일 아침 6시" style={s.strip} />}
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
} satisfies LoginLinkProps;
