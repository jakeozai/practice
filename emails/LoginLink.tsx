import { Body, Button, Container, Head, Html, Img, Preview, Text } from "@react-email/components";
import { mailColor, mailFont } from "./theme";

export type LoginLinkProps = { confirmUrl: string; logoUrl: string; brand: string };

export function loginLinkSubject(brand: string): string {
  return `${brand} 로그인 링크`;
}

const s = {
  body: { backgroundColor: mailColor.page, margin: 0, padding: "32px 0", fontFamily: mailFont },
  container: { backgroundColor: mailColor.card, borderRadius: 16, maxWidth: 440, padding: "32px 28px" },
  title: { fontSize: 20, fontWeight: 700, color: mailColor.ink, margin: "16px 0 6px", lineHeight: "28px" },
  text: { fontSize: 14, color: mailColor.muted, margin: "0 0 22px", lineHeight: "21px" },
  button: {
    backgroundColor: mailColor.ink,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 700,
    borderRadius: 999,
    padding: "13px 26px",
    textDecoration: "none",
  },
  small: { fontSize: 12, color: mailColor.muted, margin: "22px 0 0", lineHeight: "18px" },
} as const;

/** One button, nothing else to choose (sign-in = subscription, spec §2.1). */
export default function LoginLink({ confirmUrl, logoUrl, brand }: LoginLinkProps) {
  return (
    <Html lang="ko">
      <Head />
      <Preview>버튼을 누르면 바로 시작돼요</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Img src={logoUrl} width="44" height="44" alt={brand} />
          <Text style={s.title}>{brand} 시작하기</Text>
          <Text style={s.text}>아래 버튼을 누르면 로그인되고, 매일 아침 6시에 일감 메일을 받아요.</Text>
          <Button href={confirmUrl} style={s.button}>
            시작하기
          </Button>
          <Text style={s.small}>링크는 1시간 동안, 한 번만 쓸 수 있어요. 직접 요청하지 않았다면 이 메일은 무시하세요.</Text>
          <Text style={s.small}>무료이고, 그만 받고 싶으면 일감 메일 맨 아래 [메일 그만 받기] 한 번이면 해지돼요.</Text>
        </Container>
      </Body>
    </Html>
  );
}

LoginLink.PreviewProps = {
  confirmUrl: "http://localhost:3000/auth/confirm?token_hash=preview&type=magiclink",
  logoUrl: "http://localhost:3000/duck-mail.png",
  brand: "덕잡",
} satisfies LoginLinkProps;
