# Amazon SES로 메일 전환 (준비 완료, 2026-11-16)

비용 원칙(CLAUDE.md)에 따라 구독자 약 80명이 되면 Resend 무료(하루 100통)에서 Amazon SES(1,000통당 $0.10~0.16)로 옮긴다. 코드는 이미 들어가 있다. 환경변수만 바꾸면 전환되고, 되돌리기도 환경변수 하나로 된다.

## 받는 사람에게 달라지는 것: 없음
- 보내는 주소(`EMAIL_FROM`, hello@duckjob.app)와 답장 주소(문의 메일)가 같다.
- 제목, 본문(HTML·텍스트), 디자인이 같다.
- 원클릭 수신거부 헤더(`List-Unsubscribe`, `List-Unsubscribe-Post`, CLAUDE.md 규칙 7)도 같다.
- 반송과 스팸 신고는 Resend 때와 똑같이 처리된다. 영구 반송은 `bounced`, 스팸 신고는 `unsubscribed`가 된다.
- 로그인 메일, 평가 알림 메일 등 모든 메일이 같은 경로(`lib/email/send.ts`)로 나가서 함께 바뀐다.

## 운영에서 달라지는 것
| | Resend | SES |
|---|---|---|
| 같은 메일 두 번 방지 | 중복 방지 키(같은 날 같은 사람) | 키 없음. `digest_sends` 기록이 막고, 시간 초과는 다시 보내지 않음. 첫 요청이 시간 초과로 끝났는데 실제로는 나간 경우, 7시 예비 발송 때 한 번 더 갈 수 있음(매우 드묾) |
| 반송·스팸 신고 수신 | `/api/webhooks/resend` | SNS → `/api/webhooks/ses` (Amazon 서명 확인) |
| 발송 기록 | Resend 대시보드 | AWS 콘솔(SES·CloudWatch) |
| 발송 속도 | 초당 10건 | 처음 초당 14건, 하루 5만 통부터 시작 (지금 600ms 간격이면 충분) |
| 처음 상태 | 바로 발송 | **샌드박스**: 인증한 주소에만 보낼 수 있음. 해제 신청 후 승인돼야 구독자에게 보낼 수 있음 |

## 전환 순서
**사용자가 할 일**은 1, 3, 4, 6이고, **Claude가 할 일**은 0, 2, 5, 7이다.

0. **처리방침에 Amazon Web Services 추가 (전환 30일 전)**
   - 메일을 보내는 수탁자가 바뀌는 것은 처리방침 제16조의 "중요한 변경"이다. 시행 **30일 전에 공지하고 메일로도 안내**한다고 약속했다. 그래서 전환 목표(구독자 약 80명)보다 앞서, **구독자 약 50명일 때** 시작한다.
   - `lib/privacy/vendors.ts`의 `SES_VENDOR`를 `PRIVACY_VENDORS`에 넣는다. 연락처는 AWS 개인정보 고지에서 다시 확인한다. Resend 행은 Resend 계정을 닫을 때까지 둔다(지난 발송 기록이 남아 있다).
   - 처리방침의 버전·시행일(`POLICY_VERSION`)을 올리고, 변경 이력 표에 "메일 발송 수탁자 추가(Amazon Web Services: SES·SNS)"를 적는다. 시행일은 공지일로부터 30일 뒤다.
   - 아침 메일 안내 상자로 구독자에게 알린다.
   - **안전장치:** 처리방침에 Amazon Web Services가 없으면 `EMAIL_TRANSPORT=ses`로 바꿔도 메일이 나가지 않고 오류가 난다(`lib/env.ts`). 처리방침보다 먼저 SES로 보내는 일을 막기 위해서다. 시행일 전에 환경변수를 바꾸지 않는다.
1. **AWS 계정 만들기** (카드 필요). 리전은 서울 `ap-northeast-2`.
2. **도메인 인증** (SES 콘솔 → Identities → Create identity → Domain `duckjob.app`, Easy DKIM RSA 2048)
   - SES가 CNAME 3개(`<토큰>._domainkey`)를 준다. 값을 알려 주면 Vercel DNS에 추가한다.
   - 기존 Resend 레코드(`resend._domainkey`, `send`)와 겹치지 않는다.
   - 선택: 사용자 지정 MAIL FROM `mail.duckjob.app`(MX + SPF)를 쓰면 SPF도 맞아 도달률에 조금 유리하다.
3. **샌드박스 해제 신청** (SES 콘솔 → Account dashboard → Request production access). 심사는 보통 하루 안팎이다. 아래 신청 문구를 쓴다.
4. **발송 전용 IAM 사용자와 키 만들기**
   - 권한은 아래 정책만 준다.
   - 키를 Vercel 환경변수에 넣는다(아래 표). 비밀 키는 채팅에 붙여넣지 않는다.
5. **반송·스팸 신고 연결**
   - SNS 토픽 `duckjob-ses-events`를 만들고 HTTPS 구독 `https://www.duckjob.app/api/webhooks/ses`를 건다.
   - SES Configuration set `duckjob-events`를 만들고, event destination을 SNS 토픽으로 정한다(Bounce, Complaint).
   - 구독 확인은 앱이 자동으로 한다.
6. **Vercel 환경변수**를 넣고 재배포한다. 0단계 처리방침의 시행일이 지난 뒤에 한다.

   | 이름 | 값 |
   |---|---|
   | `EMAIL_TRANSPORT` | `ses` (되돌릴 땐 `resend`) |
   | `SES_REGION` | `ap-northeast-2` |
   | `SES_ACCESS_KEY_ID` | IAM 키 ID |
   | `SES_SECRET_ACCESS_KEY` | IAM 비밀 키 (Sensitive로 저장) |
   | `SES_CONFIGURATION_SET` | `duckjob-events` |
   | `SES_SNS_TOPIC_ARN` | `arn:aws:sns:ap-northeast-2:<계정>:duckjob-ses-events` |

   `AWS_*` 이름은 Vercel이 자체용으로 예약해 둬서 쓰지 않는다.
7. **확인**
   - 테스트 주소로 로그인 메일을 보낸다.
   - Gmail "원본 보기"에서 DKIM=PASS, DMARC=PASS, List-Unsubscribe 헤더를 확인한다.
   - 다음 날 아침 메일이 나간 뒤 `digest_sends`와 SES 발송 지표를 확인한다.

## IAM 정책 (발송만)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "*",
      "Condition": { "StringEquals": { "ses:FromAddress": "hello@duckjob.app" } }
    }
  ]
}
```

## 샌드박스 해제 신청 문구 (영어)
> Mail type: Transactional.
> Website: https://www.duckjob.app
>
> duckjob is a free daily email for people in South Korea looking for remote freelance work. People sign up on our website with double opt-in: a confirmation link is sent first, and only confirmed addresses get mail. We send one email per subscriber each morning (curated job openings), plus sign-in links on request.
>
> Every email has a one-click unsubscribe (RFC 8058 List-Unsubscribe headers) and an unsubscribe link in the footer. We use a configuration set with SNS notifications: permanent bounces and complaints immediately stop all further mail to that address. We never buy or import lists.
>
> Current volume is under 100 emails per day; we expect up to a few thousand per day within a year.

## 코드 위치
- **발송:** `lib/email/send.ts`가 `EMAIL_TRANSPORT`에 따라 Resend, SES, 파일 중 하나를 고른다. SES 요청은 `lib/email/ses.ts`에서 만든다(한국어 보내는 이름은 MIME 인코딩).
- **수신:** `app/api/webhooks/ses/route.ts`와 `lib/email/sns.ts`가 SNS 서명을 확인하고 SES 이벤트를 해석한다. 공통 반영은 `lib/email/delivery.ts`가 한다.
- **테스트:** `lib/email/ses.test.ts`, `lib/email/sns.test.ts`
