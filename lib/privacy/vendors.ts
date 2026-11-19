/**
 * Processors named in the privacy policy (app/(site)/privacy, §6 위탁 and
 * §7 국외 이전). Kept here so code that starts using a vendor can check the
 * policy names it first: lib/env.ts refuses EMAIL_TRANSPORT=ses until
 * Amazon Web Services is in this list.
 *
 * Adding a vendor is a 중요한 변경 under the policy's §16: publish the new
 * version 30 days before it takes effect and tell subscribers by mail
 * (docs/email/ses-switch.md, step 0).
 */
export type PrivacyVendor = {
  name: string;
  /** Short name for the policy's 한눈에 보기 row. */
  short: string;
  contact: string;
  work: string;
  country: string;
  when: string;
  items: string;
  period: string;
};

export const PRIVACY_VENDORS: readonly PrivacyVendor[] = [
  {
    name: "Supabase, Inc.",
    short: "Supabase",
    contact: "privacy@supabase.com",
    work: "데이터베이스 보관, 이메일 로그인(인증) 처리",
    country: "대한민국(서울 리전)에 저장. 운영·장애 대응 과정에서 미국 등에서 접근될 수 있음",
    when: "가입·이용할 때 수시로, 암호화된 네트워크로 전송",
    items: "회원 정보, 프로필, 메일 서비스 기록, 로그인 기록, (선택 동의 시) AI 분석 원문",
    period: "탈퇴 시 또는 위탁 계약 종료 시까지",
  },
  {
    name: "Vercel Inc.",
    short: "Vercel",
    contact: "privacy@vercel.com",
    work: "웹사이트·서버 기능 운영(서울 리전), 매일 수집·발송 작업 실행",
    country: "대한민국(서울 리전)에서 처리. 접속 기록과 운영 지원은 미국에서 처리될 수 있음",
    when: "웹사이트에 접속하거나 매일 발송 작업이 실행될 때, 암호화된 네트워크로 전송",
    items: "접속 기록(IP 주소, 브라우저 정보, 요청 주소·시각), 처리 과정에서 일시적으로 다루는 이메일·프로필 항목과 붙여넣은 AI 답변",
    period: "요청 처리 즉시 삭제. 접속 기록은 Vercel의 로그 보관 기간이 지나면 자동 삭제",
  },
  {
    name: "Plus Five Five, Inc. (Resend)",
    short: "Resend",
    contact: "support@resend.com",
    work: "로그인 메일과 일일 메일 발송, 반송·스팸 신고 처리",
    country: "미국",
    when: "메일을 보낼 때, 암호화된 네트워크로 전송",
    items: "이메일 주소, 메일 본문(추천 공고, 수신거부·프로필 링크), 발송 결과",
    period: "발송 후 Resend의 기록 보관 기간이 지나면 삭제",
  },
];

/**
 * The row to add to PRIVACY_VENDORS for the Amazon SES switch (not in the
 * policy yet). Check the contact against AWS's privacy notice when adding it.
 * Keep the Resend row until the Resend account is closed: it still holds
 * past sending records.
 */
export const SES_VENDOR: PrivacyVendor = {
  name: "Amazon Web Services, Inc.",
  short: "Amazon Web Services",
  contact: "https://aws.amazon.com/privacy/",
  work: "로그인 메일과 일일 메일 발송(Amazon SES), 반송·스팸 신고 전달(Amazon SNS)",
  country: "대한민국(서울 리전)에서 처리. 운영 지원 과정에서 미국 등에서 접근될 수 있음",
  when: "메일을 보낼 때와 반송·스팸 신고가 생길 때, 암호화된 네트워크로 전송",
  items: "이메일 주소, 메일 본문(추천 공고, 수신거부·프로필 링크), 발송 결과(전달·반송·스팸 신고)",
  period: "발송 후 AWS의 기록 보관 기간이 지나면 삭제",
};

/** True once the privacy policy names Amazon Web Services, so mail may go through SES. */
export function policyCoversSes(vendors: readonly PrivacyVendor[] = PRIVACY_VENDORS): boolean {
  return vendors.some((v) => v.name === SES_VENDOR.name);
}
