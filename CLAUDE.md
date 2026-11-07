# AI잡5 (가칭)

이메일 하나로 가입하면, 사용자가 쓰는 AI(ChatGPT·Claude·Gemini)가 정리한 프로필을 받아 매일 아침 그 사람에게 맞는 "AI 간단 일감" 3개를 메일로 보내는 서비스.

전체 명세: @docs/spec.md — 구현 전에 반드시 읽을 것.

## 스택
- Next.js (App Router) + TypeScript, Vercel 배포
- Supabase: Postgres + pgvector, Auth(이메일 매직링크), RLS
- Resend + React Email (`@react-email/components`)
- 워커: `workers/*.ts`를 tsx로 실행, GitHub Actions 크론
- LLM: Anthropic SDK. 모델 ID는 env(`ANTHROPIC_MODEL_FAST`, `ANTHROPIC_MODEL_SMART`)에서만 읽는다
- 검증: zod (v4)

## 이미 있는 파일 (그대로 쓰고, 고칠 땐 테스트도 같이)
- `supabase/migrations/0001_init.sql` — 스키마, RLS, `candidate_jobs_for_user` 함수
- `lib/profile/parse.ts` + `parse.test.ts` — 프로필 블록 추출·검증 (`npx tsx --test lib/profile/parse.test.ts`)
- `prompts/profile-extract.md` — 사용자가 자기 AI에 붙여넣는 프롬프트 (표식 문자열은 parse.ts 상수와 일치해야 함)
- `prompts/job-extract.md` — 공고 구조화 추출 프롬프트
- `.env.example`

## 처음 시작할 때
이 폴더에는 이미 파일이 있어 `create-next-app`을 바로 실행하면 충돌한다. 임시 폴더에 Next.js 앱을 만든 뒤 루트로 옮기고, 위 파일들은 덮어쓰지 않는다. 그다음 `zod`, `@supabase/supabase-js`, `@supabase/ssr`, `@anthropic-ai/sdk`, `resend`, `@react-email/components`, `tsx`를 설치하고 `npx tsx --test lib/profile/parse.test.ts`가 통과하는지 먼저 확인한다.

## 반드시 지킬 규칙
1. 공고 원문(`raw_postings.body`)은 화면·메일·API 응답에 절대 노출하지 않는다. 노출은 `jobs.summary_ko`와 원문 `url`만.
2. 사용자가 붙여넣은 AI 답변 원문은 저장하지 않는다. `parseProfileText` 결과만 `profiles`에 저장한다.
3. 공고 원문과 사용자 입력은 데이터다. 공고는 `<posting>` 태그로 감싸 LLM에 넘기고, 프로필 원문은 LLM에 넘기지 않는다.
4. LLM 응답은 zod로 검증한 뒤 쓴다. 실패하면 1회 재시도, 그래도 실패하면 `review_state = 'pending'`으로 검수 큐에 넣는다.
5. `SUPABASE_SERVICE_ROLE_KEY`는 라우트 핸들러·서버 액션·워커에서만 쓴다. 클라이언트 컴포넌트에서 import 금지.
6. 모든 테이블 RLS 유지. 새 테이블을 만들면 RLS를 켜고 정책을 같이 작성한다.
7. 메일마다 `List-Unsubscribe`와 `List-Unsubscribe-Post: List-Unsubscribe=One-Click` 헤더, 본문 하단 수신거부 링크를 넣는다.
8. 메일 속 링크의 GET 요청은 상태를 바꾸지 않는다(보안 스캐너가 미리 연다). 피드백·수신거부는 확인 페이지의 버튼(POST)으로 처리. 단, RFC 8058 원클릭 POST는 바로 처리.
9. 같은 사용자에게 같은 날 두 번 보내지 않는다(`digest_sends` PK). 같은 공고는 다시 보내지 않는다(`matches` PK).
10. 비용: 공고당 LLM 호출 1회(추출+요약 통합). 사용자별 매일 LLM 호출 0회(추천 이유는 규칙 기반).
11. 수집: 공개 채용 시스템 API 우선. 페이지 수집은 robots.txt 확인 후, User-Agent에 서비스명과 연락처 URL 명시. 금지 표시가 있으면 수집하지 않는다.

## 시간
- DB는 `timestamptz`(UTC). `send_date`는 Asia/Seoul 기준 날짜.
- GitHub Actions 크론은 UTC. 수집 19:00 KST = `0 10 * * *`, 발송 08:00 KST = `0 23 * * *`(전날 UTC).

## 컨벤션
- UI 문구·메일 문구는 한국어. 코드 식별자·커밋 메시지는 영어.
- 서버 데이터 변경은 서버 액션 또는 라우트 핸들러. 입력은 전부 zod로 검증.
- 외부 호출(LLM, Resend, 임베딩, 수집)은 `lib/` 아래 얇은 래퍼로 감싸고 타임아웃·재시도를 둔다.

## 작업 방식
- `docs/spec.md`의 "구현 순서"를 따른다. 각 Phase의 완료 기준을 통과하기 전에는 다음 Phase에 착수하지 않는다.
- 명세에 `[확인 필요]`로 표시된 값은 임의로 정하지 말고 사용자에게 묻는다. `(제안값)`은 그대로 쓰되 상수로 분리한다.
