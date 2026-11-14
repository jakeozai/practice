import { Body, Container, Head, Hr, Html, Img, Preview, Text } from "@react-email/components";
import { mailColor, mailFont, mailFontFace, mailMono } from "./theme";

export type AccountCodeProps = {
  code: string;
  /** Wordmark for the dark header (PNG). */
  logoUrl: string;
  brand: string;
  fontUrl?: string | null;
};

export function accountCodeSubject(brand: string, code: string): string {
  return `${brand} 확인 코드 ${code}`;
}

const s = {
  body: { backgroundColor: mailColor.page, margin: 0, padding: "24px 0 40px", fontFamily: mailFont, color: mailColor.ink, wordBreak: "keep-all" as const },
  container: { maxWidth: 560, padding: "0 16px" },
  heading: { fontSize: 24, fontWeight: 800, lineHeight: "32px", letterSpacing: "-0.02em", color: mailColor.ink, margin: "30px 0 8px" },
  intro: { fontSize: 15, lineHeight: "24px", color: mailColor.inkSoft, margin: "0 0 20px" },
  code: {
    fontFamily: mailMono,
    fontSize: 40,
    fontWeight: 700,
    letterSpacing: "0.18em",
    color: mailColor.paperInk,
    backgroundColor: mailColor.paper,
    borderRadius: 18,
    padding: "18px 0",
    margin: 0,
    textAlign: "center" as const,
  },
  note: { fontSize: 13, lineHeight: "20px", color: mailColor.muted, margin: "14px 0 0" },
  footer: { fontSize: 12, color: mailColor.muted, lineHeight: "19px", margin: "0 0 6px" },
} as const;

/** Six digits to type into /account on whatever device the person is using; no link to click. */
export default function AccountCode({ code, logoUrl, brand, fontUrl }: AccountCodeProps) {
  return (
    <Html lang="ko">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        {fontUrl && <style dangerouslySetInnerHTML={{ __html: mailFontFace(fontUrl) }} />}
      </Head>
      <Preview>{`내 정보 확인 코드 ${code}`}</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Img src={logoUrl} width="100" height="29" alt={brand} style={{ display: "block" }} />
          <Text style={s.heading}>내 정보 확인 코드</Text>
          <Text style={s.intro}>덕잡 내 정보 화면에 아래 숫자를 입력해 주세요.</Text>
          <Text style={s.code}>{code}</Text>
          <Text style={s.note}>코드는 1시간 동안 한 번만 쓸 수 있어요. 직접 요청하지 않았다면 이 메일은 무시하세요. 누구에게도 알려 주지 마세요.</Text>
          <Hr style={{ borderColor: mailColor.line, margin: "28px 0 16px" }} />
          <Text style={s.footer}>{brand} · 매일 아침 6시, 해외 AI 일감 5개</Text>
        </Container>
      </Body>
    </Html>
  );
}

AccountCode.PreviewProps = {
  code: "123456",
  logoUrl: "http://localhost:3000/brand/duckjob-wordmark-ondark-240.png",
  brand: "덕잡",
} satisfies AccountCodeProps;
