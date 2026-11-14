# 덕잡 (가칭 AI잡5에서 변경, 2026-11-09)

이메일 하나로 가입하면, 사용자가 쓰는 AI(ChatGPT·Claude·Gemini)가 정리한 프로필을 받아 매일 아침 그 사람에게 맞는 단기 일감 3개를 메일로 보내는 서비스.

범위(2026-11-14 사용자 결정, C안): 한국 거주자가 할 수 있는 **단기 일감 전반**(영상 편집·제작, 포토샵·디자인, 3D·모션, 개발·자동화, 글쓰기·번역, AI 학습·평가 등). AI를 써도 되거나 AI와 무관한 일은 모두 포함하고, **AI 사용을 금지한 일감만 제외**한다(LLM `ai_prohibited` + 문구 규칙 `forbidsAi`). 기간 없는 정규직, 성인 콘텐츠, 한국 거주자가 지원할 수 없는 일도 제외.

전체 명세: @docs/spec.md — 구현 전에 반드시 읽을 것.

## 스택
- Next.js (App Router) + TypeScript, Vercel 배포
- Supabase: Postgres + pgvector, Auth(이메일 매직링크 — 링크는 앱이 `auth.admin.generateLink`로 만들어 Resend로 직접 발송), RLS
- Resend + React Email (`@react-email/components`)
- 워커: 로직은 `lib/workers/*.ts`. `/api/cron/*`을 Supabase pg_cron(정각)과 Vercel Cron(예비)이 매일 부르고, `workers/*.ts`는 같은 로직의 CLI(tsx)
- LLM: Anthropic SDK를 Vercel AI Gateway 경유로 사용(OIDC, 별도 키 없음). 모델 ID는 env(`ANTHROPIC_MODEL_FAST`)에서만 읽는다
- 임베딩(Phase 2): OpenAI `text-embedding-3-small`(1536차원), AI Gateway 경유
- 검증: zod (v4)

## 이미 있는 파일 (그대로 쓰고, 고칠 땐 테스트도 같이)
- `supabase/migrations/0001_init.sql` — 스키마, RLS, `candidate_jobs_for_user` 함수
- `lib/profile/parse.ts` + `parse.test.ts` — 프로필 블록 추출·검증 (`npx tsx --test lib/profile/parse.test.ts`)
- `prompts/profile-extract.md` — 사용자가 자기 AI에 붙여넣는 프롬프트 (표식 문자열은 parse.ts 상수와 일치해야 함)
- `prompts/job-extract.md` — 공고 구조화 추출 프롬프트
- `.env.example`

## 처음 시작할 때
이 폴더에는 이미 파일이 있어 `create-next-app`을 바로 실행하면 충돌한다. 임시 폴더에 Next.js 앱을 만든 뒤 루트로 옮기고, 위 파일들은 덮어쓰지 않는다. 그다음 `zod`, `@supabase/supabase-js`, `@supabase/ssr`, `@anthropic-ai/sdk`, `resend`, `@react-email/components`, `tsx`를 설치하고 `npx tsx --test lib/profile/parse.test.ts`가 통과하는지 먼저 확인한다.

## 개인화 (2026-11-14 사용자 결정)
- 프로필이 있는 구독자에게는 **그 사람의 AI 분석을 철저히 따른 3개**만 보낸다. 종류를 섞지 않는다. 맞는 게 없으면 그날은 보내지 않고(공용 목록으로 채우지 않음) 기록만 남긴다.
- 규칙(`lib/match/fit.ts`, 사전 `lib/match/concepts.ts`): 작업 언어·영어 수준·피하고 싶은 일·가용 시간·최저 시급·자격 요건으로 제외 → fields 순서·AI 추천(notes_ko)·전문 분야·기술·경력 순 가중치로 점수.
- 선택(`lib/match/pick.ts`, `prompts/digest-pick.md`): 모델이 규칙 상위 6개에서 3개를 고르고 이유·오늘 할 일·제목을 쓴다. 최종 순서는 규칙 점수 순. 모델은 `ANTHROPIC_MODEL_PICK`(google/gemini-2.5-flash, 쓸 수 없으면 `ANTHROPIC_MODEL_FAST`로 자동 전환). 오늘 할 일에 금액·회사 내부 자료 첨부를 쓰지 않는다. 결과는 `digest_picks`(0012)에 저장해 같은 날 재실행에도 같은 메일이 나간다.
- 일정: 05:30~05:50 KST 처리 실행이 먼저 picks를 만들고(`/api/cron/process`), 06:00 발송이 빠진 사람만 채운다. 점검은 `select private.call_app_cron('/api/cron/picks')`(다음 발송분 dry run, 저장 안 함, 0014).

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
10. 비용: 공고당 LLM 호출 1회(추출+요약 통합). 사용자별 LLM 호출은 하루 1회까지(2026-11-14 사용자 결정): 프로필로 규칙이 거르고 순위를 매긴 상위 12개 중 3개 고르기 + 추천 이유·오늘 할 일·메일 제목(`lib/match/pick.ts`). 모델이 실패하면 규칙 결과로 보낸다. 모델에는 검증된 프로필과 우리 한국어 요약만 넘긴다.
11. 수집: 공개 채용 시스템 API 우선. 페이지 수집은 robots.txt 확인 후, User-Agent에 서비스명과 연락처 URL 명시. 금지 표시가 있으면 수집하지 않는다.
12. Freelancer.com API 데이터는 약관상 캐시로만 둔다: 매일 새로고침하고, 목록에서 빠진 의뢰는 jobs째 삭제한다(`lib/workers/collect.ts` purgeRaw). 서비스 복제·경쟁 용도로 쓰지 않는다.

## 시간
- DB는 `timestamptz`(UTC). `send_date`는 Asia/Seoul 기준 날짜.
- 발송은 매일 06:00 KST 정각(2026-11-12 결정). Supabase pg_cron이 `0 21 * * *`(UTC)에 pg_net으로 `/api/cron/digest`를 부른다(`0007_exact_daily_schedule.sql`, 토큰은 Vault에만 있고 앱은 `verify_cron_token`으로 확인).
- 예약 호출 주소는 `https://www.duckjob.app`(0013). `private.call_app_cron`을 다시 정의할 땐 최신 마이그레이션의 경로 목록과 주소를 그대로 이어받는다.
- 공고 처리(AI 요약)는 pg_cron이 19:00~05:50 KST에 10분마다 `/api/cron/process` 호출(`0009_process_window.sql`). 무료 Gateway 분당 5회 제한에 맞춰 호출 간격을 둔다(`lib/llm/pace.ts`).
- Vercel Cron(`vercel.json`, UTC, Hobby는 지정한 시각부터 1시간 안에 실행): 수집 19:00 KST = `0 10 * * *`, 발송 예비 07:00 KST = `0 22 * * *`(6시에 못 받은 사람만 보냄).

## 컨벤션
- UI 문구·메일 문구는 한국어. 코드 식별자·커밋 메시지는 영어.
- 서버 데이터 변경은 서버 액션 또는 라우트 핸들러. 입력은 전부 zod로 검증.
- 외부 호출(LLM, Resend, 임베딩, 수집)은 `lib/` 아래 얇은 래퍼로 감싸고 타임아웃·재시도를 둔다.

## 작업 방식
- `docs/spec.md`의 "구현 순서"를 따른다. 각 Phase의 완료 기준을 통과하기 전에는 다음 Phase에 착수하지 않는다.
- 명세에 `[확인 필요]`로 표시된 값은 임의로 정하지 말고 사용자에게 묻는다. `(제안값)`은 그대로 쓰되 상수로 분리한다.
