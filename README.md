# AI잡5 (가칭)

이메일 하나로 가입하면, 사용자가 쓰는 AI가 정리한 프로필을 받아 매일 아침 맞는 "AI 간단 일감" 3개를 메일로 보내는 서비스.

- 전체 명세: [`docs/spec.md`](docs/spec.md) · 작업 규칙: [`CLAUDE.md`](CLAUDE.md)
- 현재 단계: **Phase 0 — 수동 검증** (자세한 범위는 아래 "Phase 0 진행 상황")

## 빠른 시작

```bash
npm install
cp .env.example .env.local   # 값 채우기 (아래 "환경 변수")
npm run dev                  # http://localhost:3000
```

검사 명령:

```bash
npm test            # 단위 테스트 (node:test + tsx)
npm run typecheck   # tsc
npm run lint        # eslint
npm run build       # next build
```

## Supabase 설정 (한 번만)

1. **스키마 적용**: Supabase 대시보드 SQL Editor에서 `supabase/migrations/0001_init.sql` 실행 (또는 `supabase db push`).
2. **Auth → URL Configuration**
   - Site URL: `APP_URL`과 같은 값
   - Redirect URLs: `{APP_URL}/auth/callback**` 추가 (로컬은 `http://localhost:3000/auth/callback**`)
3. **Auth → SMTP**: 커스텀 SMTP를 Resend로 연결해 서비스 도메인으로 발송.
4. **Auth → Email Templates → Magic Link**를 한국어로 바꾸고, 링크는 아래처럼 `token_hash` 방식을 권장합니다.
   다른 기기(예: PC에서 가입, 휴대폰에서 메일 열기)에서도 로그인이 됩니다. `/auth/callback`은 기본 `?code=` 방식도 받습니다.

   ```html
   <h2>AI잡5 로그인</h2>
   <p>아래 버튼을 누르면 바로 로그인돼요. 이 링크는 한 번만 쓸 수 있어요.</p>
   <p><a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">로그인하기</a></p>
   ```

   (`{{ .RedirectTo }}`는 앱이 넘기는 `{APP_URL}/auth/callback?next=...` 주소라 뒤에 `&`로 붙입니다.)

## 환경 변수

`.env.example` 참고. 서버 전용 값(`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_LINK_SECRET`)에는 `NEXT_PUBLIC_`를 붙이지 않습니다.

| 이름 | Phase 0 필요 | 설명 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 예 | 빌드 시점에도 있어야 함(`proxy.ts`가 사용) |
| `SUPABASE_SERVICE_ROLE_KEY` | 예 | 라우트 핸들러·서버 액션·워커 전용 |
| `APP_URL` | 예 | 메일 링크·로그인 리다이렉트 기준 주소 |
| `EMAIL_LINK_SECRET` | 예 | 메일 링크 서명 키, 32자 이상 난수 (`openssl rand -base64 48`) |
| `ADMIN_EMAILS` | 예 | `/admin` 접근 허용 이메일, 쉼표 구분 |
| `RESEND_API_KEY`, `EMAIL_FROM` | 발송 시 | |
| `EMAIL_TRANSPORT` | 선택 | `file`이면 실제 발송 대신 `.outbox/`에 HTML 저장 |
| `DIGEST_SIZE` | 선택 | 메일당 공고 수, 기본 3 |
| `ANTHROPIC_*`, 임베딩, `RESEND_WEBHOOK_SECRET` | 아니오 | Phase 1~2 |

## Phase 0 운영 방법

1. **가입·프로필**: `/`에서 이메일 → 메일 링크 → `/onboarding`에서 프롬프트 복사 → 내 AI에 붙여넣기 → 답변 붙여넣기 → 확인·저장.
2. **공고 등록**: `/admin/jobs/new`에서 원문 주소와 한국어 요약(1~3줄)을 입력. 관리자 입력이라 바로 승인되고, 원문 본문은 저장하지 않습니다.
3. **보낼 공고 고르기**: `/admin`에서 공고를 순서대로 체크하면 실행할 명령이 나옵니다.
4. **발송**:

   ```bash
   npm run send:manual -- <jobId> <jobId> ...                       # 미리보기(아무것도 안 보냄)
   npm run send:manual -- <jobId> ... --only me@example.com --send  # 나에게만 테스트
   npm run send:manual -- <jobId> ... --send                        # active 구독자 전원
   ```

   - 같은 날 같은 사람에게 두 번 가지 않고(`digest_sends`), 이미 받은 공고는 빠집니다(`matches`).
   - 실패한 사람은 `failed`로 남아 같은 날 다시 실행하면 그 사람만 재시도합니다. Resend 멱등 키(`digest-{user_id}-{send_date}`)로 중복 발송을 막습니다.
   - `.env.local`을 자동으로 읽습니다.
5. **지표**: `/admin` 상단 — 구독 수, 프로필 완료율, 메일 클릭률(공고 링크를 1번 이상 누른 메일 ÷ 보낸 메일), 하루 신규 공고 수.

## 구조

```text
app/
  page.tsx, login-form.tsx, actions.ts   랜딩 + 매직링크 요청(서버 액션)
  auth/callback/route.ts                 세션 교환, profiles 생성
  onboarding/                            프롬프트 → 붙여넣기 → 확인 → 저장
  api/profile/{preview,save}/route.ts    파싱(저장 안 함) / 재검증 후 저장
  admin/                                 지표 대시보드, 발송 공고 선택, 수동 공고 등록
  r/[token]/route.ts                     클릭 기록 후 원문으로 이동 (Phase 2에 /j/[id]로 변경)
  api/email/unsubscribe/route.ts         GET=확인 페이지로, POST=수신거부(RFC 8058 원클릭 포함)
  unsubscribe/page.tsx                   수신거부 확인 페이지
emails/DailyFive.tsx                     아침 메일 템플릿
lib/
  supabase/{server,service,admin}.ts     요청용 / 서비스 롤(워커) / 서비스 롤(Next, server-only)
  supabase/database.types.ts             스키마 타입 (마이그레이션과 동기화 유지)
  profile/                               파서(기존), 프롬프트, 확인 폼 변환
  digest/{plan,compose}                  발송 대상 계산, 메일 조립
  email/send.ts                          Resend 래퍼(타임아웃·재시도·멱등 키)
  links.ts                               메일 링크 HMAC 서명
  jobs/{format,manual}.ts                표시 형식, 수동 등록 검증
workers/send-manual.ts                   Phase 0 수동 발송
proxy.ts                                 세션 갱신, 비로그인 보호 페이지 리다이렉트
```

## Phase 0 진행 상황

- [x] Next.js + Supabase 세팅, `parse.test.ts` 통과
- [ ] `0001_init.sql`을 실제 Supabase 프로젝트에 적용 — 로컬 Postgres 16 + pgvector에서는 적용·RLS 확인 완료
- [x] 랜딩 + 매직링크 가입 + `/auth/callback` + profiles 생성
- [x] `/onboarding` 프로필 가져오기 — [ ] 지인 10명의 ChatGPT·Claude·Gemini로 테스트
- [x] `/admin/jobs/new` 수동 공고 등록
- [x] `workers/send-manual.ts` (수신거부 헤더·링크, `digest_sends`·`matches` 기록)
- [x] 지표: 구독 수, 프로필 완료율, 메일 클릭률, 하루 신규 공고 수 (`/admin`)

완료 기준(명세 §15): 하루 3개를 채울 신규 공고 공급 확인, 구독 100명, 메일 클릭률 20% 이상.

공급 점검(2026-11-07): 공개 채용 API에서 한국 거주자가 지원할 수 있는 실제 일감은 3건(모두 RWS), 최근 30일 신규는 0건이었다. 등록용 요약까지 [`docs/supply-check-2026-11-07.md`](docs/supply-check-2026-11-07.md)에 정리했다.

## 확인 필요 (코드에 자리표시값으로 둔 것)

| 항목 | 위치 | 지금 값 |
| --- | --- | --- |
| ChatGPT·Claude 미리 채우기 링크 | `lib/profile/prefill.ts` `PREFILL_ENABLED` | 둘 다 꺼짐. 외부 자료상 ChatGPT `?q=`는 입력만 채움, Claude `?q=`는 2025년 10월쯤 끊겼다는 보고. 직접 눌러 보고 하나씩 켜기 |
| 메일 하단 발신자(운영자) 표기 | `lib/email/constants.ts` `MAIL_FOOTER_SENDER` | `AI잡5 (가칭)` |
| Resend 일·월 발송 한도 | Resend 대시보드 | 요금제마다 다름. 초당 한도는 팀당 10건(전 요금제 동일)이라 `SEND_INTERVAL_MS` 600ms로 충분 |
| 수집 소스(플랫폼 자체 일감 페이지) | Phase 1 | 공개 채용 API는 공급 부족 — 공급 점검 문서 참고 |
| 서비스 이름·도메인 | 전체 | 가칭 AI잡5 |
| 개인정보 처리방침·국외 이전 고지 | Phase 2 | 미작성 |
