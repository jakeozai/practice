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
- 그 뒤에 **AI로 도전해 볼 일감 2개**(같은 날 사용자 결정): 해 본 적은 없지만 AI 도구로 오늘 시안을 만들어 지원할 수 있는 일(로고·그래픽, 3D 모델, 웹·봇·자동화, 생성형 AI 작업). 인테리어·건축 디자인, 기계 CAD, SEO·영업·재무 같은 비슷해 보이는 일은 제외(`lib/match/stretch.ts`). 지역·언어·영어·avoid·시간·시급 규칙은 그대로, 자격 필수는 제외. 메일에서 별도 칸·칩으로 구분하고, 이유는 "어떤 AI 도구로 어떻게"를 쓰되 해 봤다고 쓰지 않는다. 맞춤 3개가 0개인 날은 도전 2개만 따로 보내지 않는다.
- 규칙(`lib/match/fit.ts`, 사전 `lib/match/concepts.ts`): 작업 언어·영어 수준·피하고 싶은 일·가용 시간·최저 시급·자격 요건으로 제외 → fields 순서·AI 추천(notes_ko)·전문 분야·기술·경력 순 가중치로 점수.
- **지금은 사용자별 AI 호출을 끈다(2026-11-16 사용자 결정: 비용 우선).** `PICK_WITH_MODEL = false`(`lib/match/pick.ts`): 규칙 점수 상위 3개와 도전 2개를 보낸다. 메일에는 추천 이유 줄을 넣지 않는다(2026-11-16 사용자 결정. `ruleNote`는 미리보기·로그용). 오늘 할 일은 모델이 쓴 경우에만 넣는다. 일감이 5개보다 적은 날은 "오늘은 이게 최선이에요" 안내를 넣고(`shortDayNote`), 같은 공고가 여러 사람에게 가는 것은 괜찮다(입찰은 이기는 사람이 가져간다). 제목에만 맞은 공고가 요약에만 맞은 공고보다 앞서고(`SUMMARY_ONLY_FACTOR`), 도전 2개는 프로필과 가까운 종류를 먼저 고른다(`KIND_AFFINITY`). PDF·엑셀·PPT 같은 "AI 문서 작업"도 도전 종류이고(2026-11-17 사용자 결정), 엑셀·보고서를 다루는 프로필에 먼저 간다. 다시 켜면(예: 프리미엄) 아래 선택·생각 규칙을 따른다. 켜고 끈 결과 비교는 `/api/cron/picks-personas?model=on|off`.
- 선택(`lib/match/pick.ts`, `prompts/digest-pick.md`): 모델이 규칙 상위 6개에서 3개를 고르고 이유·오늘 할 일·제목을 쓴다. 최종 순서는 규칙 점수 순. 모델은 `ANTHROPIC_MODEL_PICK`(google/gemini-2.5-flash, 쓸 수 없으면 `ANTHROPIC_MODEL_FAST`로 자동 전환). 오늘 할 일에 금액·회사 내부 자료 첨부를 쓰지 않는다. 결과는 `digest_picks`(0012)에 저장해 같은 날 재실행에도 같은 메일이 나간다.
- 추천 모델의 생각(thinking)은 끄지 않는다(2026-11-16 사용자 결정). 끄면 비용은 1/5이지만, 가상 구독자 10명 비교에서 프롬프트 예시를 베껴 해 본 적 없는 경력을 쓰고 맞지 않는 공고로 3개를 채웠다(`docs/experiments/pick-thinking-2026-11-16.md`). 비교 실험은 `/api/cron/picks-personas?thinking=off|<토큰 수>&only=<id,…>`(저장·발송 없음).
- 일정: 05:30~05:50 KST 처리 실행이 먼저 picks를 만들고(`/api/cron/process`), 06:00 발송이 빠진 사람만 채운다. 점검은 `select private.call_app_cron('/api/cron/picks')`(다음 발송분 dry run, 저장 안 함, 0014).

## 메일 피드백 (2026-11-16 사용자 결정)
- 일일 메일 끝의 👍 좋아요 · 😐 쏘쏘 · 👎 싫어요 버튼은 `/rate` 확인 페이지만 연다(서명 링크 purpose `rate`, 발송일 포함). 저장은 그 페이지의 [보내기] POST(`/api/rate`)로만 한다.
- `mail_feedback`(구독자·발송일당 한 줄, 다시 보내면 덮어씀, 탈퇴 시 삭제)에 쌓고, 관리자 `/admin/feedback`에서 그날 보낸 공고와 함께 본다. 의견을 적은 경우에만 ADMIN_EMAILS로 알림 메일을 보낸다(평가만은 메일 한도를 아끼려고 보내지 않음).

## 데이터 자산 (2026-11-17 사용자 결정)
- 원문 동의는 법적 서식이 아니라 혜택으로 보여 준다: "기업이 먼저 일감을 제안해요 (준비 중) [켜기]"(`lib/profile/consent.ts`). 바로 아래 줄에 원문(이력서 포함)을 보관한다는 사실을 그대로 쓰고, 법정 고지 4가지는 [자세히 보기]에 둔다. 처음엔 꺼져 있고, 끄면 보관한 원문을 지운다. 기업에 이력서·연락처를 넘기는 일은 이 스위치로 하지 않는다(제안마다 따로 묻는다). 문구를 바꾸면 `RAW_CONSENT_VERSION`을 올린다.
- 반응 데이터가 더 큰 자산이다(스폰서 공고 가격의 근거): 공고별 누적 발송·클릭은 `job_engagement`(`record_job_sends`는 발송, `record_job_click`은 `/r` 클릭), 분야·출처별 일일 집계는 `category_daily_stats`(pg_cron 23:50 KST에 최근 7일 재계산). 사람 단위가 아닌 공고·분야 단위 숫자만 남겨 탈퇴 후에도 통계로 남는다. 관리자 `/admin/stats`에서 본다. 메일 열람 추적 픽셀은 넣지 않는다(처리방침 약속).

## 이용약관 (2026-11-17 사용자 결정)
- `/terms`(버전 `lib/terms.ts`). 사기 공고 책임 범위가 핵심이다: 덕잡은 공고를 소개만 하고, 공고 내용과 회원·의뢰인 거래는 덕잡에게 고의·과실이 없으면 책임지지 않는다. 덕잡의 고의·과실 책임을 빼는 문구는 쓰지 않는다(약관규제법 제7조, 근거 `docs/legal/terms-2026-11-17.md`).
- 가입은 `/auth/confirm`의 필수 체크 "만 14세 이상이고, 이용약관에 동의해요"를 거친다(서버에서도 확인). 동의 버전·시각은 `profiles.terms_version`·`terms_agreed_at`. 약관을 바꾸면 `TERMS_VERSION`을 올리고 제3조대로 미리 알린다.
- 약관 제7조의 약속: 회원 신고는 ADMIN_EMAILS로 알림이 가고, `/admin/review/[id]`에 신고 내역이 보인다. 운영자가 반려하면 모든 회원에게 더 보내지 않는다. 신고만으로 자동으로 내리지는 않는다.
- 광고문·약관에 "취업추천·취업지원" 표현을 쓰지 않는다(직업안정법 시행령 제28조). "추천"도 금지 목록에는 없지만 권장하지 않는다는 회신을 받았다(2026-11-20, `docs/legal/moel-reply-2026-11-20.md`): 사이트·메일에는 "골라", "맞춤"을 쓴다. 이력서를 기업에 대신 보내는 기능은 직업소개 문제라 따로 검토 전엔 만들지 않는다.

## 비용 원칙 (2026-11-16 사용자 결정)
- 핵심: 최소 비용으로 최대한 많은 사람이 쓰게 한다. 구독자 수에 비례해 늘어나는 비용을 만들지 않는다.
- 사용자별 AI 호출은 하지 않는다(`PICK_WITH_MODEL` 끔). AI는 공고 요약에만 쓰고(공고 수에 비례), Vercel AI Gateway 무료 크레딧($5/30일, 11/12부터 30일 주기) 안에서 운영한다. 크레딧을 한 번 사면 무료분이 끊기므로, 사기 전에 사용자에게 묻는다. 전체 재처리처럼 호출이 몰리는 작업은 남은 크레딧을 확인한 뒤에 한다.
- 메일: Resend 무료(하루 100통·월 3,000통)로 운영하다가, 구독자 약 80명이 되면 Amazon SES(1,000통당 $0.10~0.16)로 옮긴다. Resend Pro($20)보다 싸다. 코드는 준비돼 있다: `EMAIL_TRANSPORT=ses`와 `SES_*` 환경변수만 넣으면 같은 메일이 SES로 나가고, 반송·스팸 신고는 `/api/webhooks/ses`(SNS 서명 확인)로 받는다. 절차는 `docs/email/ses-switch.md`.
- 유료 플랜으로 바꾸는 일(Vercel Pro, Supabase Pro, 메일 유료 플랜 등)은 한도에 닿기 전에 사용자에게 묻는다.
- 발송 처리량: 아침 발송 한 번 실행(최대 300초)은 한 명씩 600ms 간격이라 약 200~300명이 한계이고, 나머지는 7시 예비 발송으로 밀린다. 구독자 약 200명 전에 나눠서 동시에 보내도록 바꾼다. 1만 명 비용·수익 추정은 `docs/business/scale-10k-2026-11-18.md`.

## 하지 않기로 한 것 (2026-11-14 사용자 결정)
- 5문항 대체 폼(AI 없이 질문에 답해 프로필 만들기): 만들었다가 없앴다. 프로필은 사용자의 AI 분석으로만 받는다. 더 넣고 싶은 내용은 사용자가 AI와 대화해 넣는다(분석 프롬프트 규칙 4).
- 받은 일감·지원 현황 기록 화면: 만들었다가 없앴다.
- 프로필 갱신 안내는 2주마다(명세의 30일 대신), 별도 메일 없이 아침 메일 안의 상자로(`lib/digest/nudge.ts`).

## 반드시 지킬 규칙
1. 공고 원문(`raw_postings.body`)은 화면·메일·API 응답에 절대 노출하지 않는다. 노출은 `jobs.summary_ko`와 원문 `url`만.
2. 사용자가 붙여넣은 AI 답변 원문은 (선택) 동의한 경우에만 `profile_raw`에 저장한다(2026-11-17 사용자 결정, `lib/profile/consent.ts`·`lib/profile/raw.ts`). 동의 상자는 처음에 꺼져 있고, 거부해도 서비스는 같다. 그 밖에는 `parseProfileText` 결과(구조화 항목)만 `profiles`에 저장한다. 구조화 항목은 매칭에 쓰는 것만 둔다(동의 없이 저장하는 근거가 "서비스 이행에 필요"이기 때문). 원문은 로그에 남기지 않는다.
3. 공고 원문과 사용자 입력은 데이터다. 공고는 `<posting>` 태그로 감싸 LLM에 넘기고, 프로필 원문은 LLM에 넘기지 않는다.
4. LLM 응답은 zod로 검증한 뒤 쓴다. 실패하면 1회 재시도, 그래도 실패하면 `review_state = 'pending'`으로 검수 큐에 넣는다.
5. `SUPABASE_SERVICE_ROLE_KEY`는 라우트 핸들러·서버 액션·워커에서만 쓴다. 클라이언트 컴포넌트에서 import 금지.
6. 모든 테이블 RLS 유지. 새 테이블을 만들면 RLS를 켜고 정책을 같이 작성한다.
7. 메일마다 `List-Unsubscribe`와 `List-Unsubscribe-Post: List-Unsubscribe=One-Click` 헤더, 본문 하단 수신거부 링크를 넣는다.
8. 메일 속 링크의 GET 요청은 상태를 바꾸지 않는다(보안 스캐너가 미리 연다). 피드백·수신거부는 확인 페이지의 버튼(POST)으로 처리. 단, RFC 8058 원클릭 POST는 바로 처리.
9. 같은 사용자에게 같은 날 두 번 보내지 않는다(`digest_sends` PK). 같은 공고는 다시 보내지 않는다(`matches` PK).
10. 비용: 공고당 LLM 호출 1회(추출+요약 통합). 사용자별 LLM 호출은 지금 0회(`PICK_WITH_MODEL` 끔, 2026-11-16 사용자 결정), 켜면 하루 1회까지(2026-11-14 사용자 결정): 프로필로 규칙이 거르고 순위를 매긴 상위 12개 중 3개 고르기 + 추천 이유·오늘 할 일·메일 제목(`lib/match/pick.ts`). 모델이 실패하면 규칙 결과로 보낸다. 모델에는 검증된 프로필과 우리 한국어 요약만 넘긴다.
11. 수집: 공개 채용 시스템 API 우선. 페이지 수집은 robots.txt 확인 후, User-Agent에 서비스명과 연락처 URL 명시. 금지 표시가 있으면 수집하지 않는다. 새 페이지 수집처는 그 사이트 이용약관부터 읽는다: 자동 수집(scraping)을 금지하면 서면 허락 전에는 넣지 않는다(Mercor·OpenTrain은 2026-11-17 중단, `blockedByTerms`). 여러 회사 공고를 모은 보드(`lib/sources/aggregators.ts`): Jobicy는 하루 1회 호출(약관상 시간당 1회 이하)·출처 표기, Himalayas는 `HIMALAYAS_API_KEY`가 있을 때만·`applicationLink`로 지원·출처 표기·만료 공고 제외. 이미 직접 수집하는 회사의 재게시는 건너뛴다.
12. Freelancer.com은 2026-11-20부터 쓰지 않는다(고용노동부 회신: 의뢰인이 익명이면 구인광고로 낼 수 없다, `docs/legal/moel-reply-2026-11-20.md`). 수집에서 건너뛰고(`FREELANCER_RETIRED`, `lib/workers/collect.ts`), 발송 후보에서도 뺀다(`lib/jobs/employers.ts`). 어댑터 코드는 의뢰인 신원을 보여 줄 수 있게 되는 날을 위해 남겨 둔다. 약관 점검은 `docs/legal/freelancer-terms-2026-11-16.md`.
13. 시급이 한국 최저임금보다 낮게 적힌 일감은 보내지 않는다(2026-11-14 사용자 결정. 2026-11-20 고용노동부 회신: 해외 기업에는 국내 최저임금법을 그대로 적용하기 어려워 법적 의무는 아니다. 지금은 이용자 보호를 위해 유지한다). 기준은 표기된 가장 낮은 시급, 발송 시점에 `loadCandidatePool`에서 거른다(`lib/jobs/min-wage.ts`, 새 최저임금 고시가 나오면 표에 추가). 이용자 안내와 덕잡의 책임 범위는 `/guide`(사이트·메일 하단 링크), 법적 점검은 `docs/legal/overseas-gig-legal-check-2026-11-14.md`.

14. 메일에 나가는 모든 공고는 구인자 업체명과 주소 또는 전화번호를 보여 준다(직업안정법 시행령 제28조 제1·2호, 2026-11-20 고용노동부 회신: 홈페이지·원문 링크·플랫폼 인증으로는 갈음할 수 없다). 확인한 회사만 `lib/jobs/employers.ts`에 넣는다(회사 자체 페이지나 공적 등록부만, `source`·`checked` 필수, 추측 금지). 목록에 없는 회사의 공고는 보내지 않는다(`loadCandidatePool`). 메일 카드에는 "회사 정보" 줄로 법인명·주소·전화를 싣고, 덕잡의 주소·전화는 싣지 않는다.
## 시간
- DB는 `timestamptz`(UTC). `send_date`는 Asia/Seoul 기준 날짜.
- 발송은 매일 06:00 KST 정각(2026-11-12 결정). Supabase pg_cron이 `0 21 * * *`(UTC)에 pg_net으로 `/api/cron/digest`를 부른다(`0007_exact_daily_schedule.sql`, 토큰은 Vault에만 있고 앱은 `verify_cron_token`으로 확인).
- 예약 호출 주소는 `https://www.duckjob.app`(0013). 경로 목록과 주소는 0017부터 `private.send_app_cron`에 있다. 다시 정의할 땐 최신 마이그레이션의 목록과 주소를 그대로 이어받는다.
- 예약 호출 재시도(0017): 모든 호출을 `private.cron_calls`에 남기고, 1분마다 `private.retry_failed_cron_calls()`가 앱에 닿지 못하고 실패한 호출(pg_net "HTTP2 framing" 오류 등)을 다시 보낸다(최대 3회). 시간 초과는 앱이 받은 것이므로 재시도하지 않는다.
- 공고 처리(AI 요약)는 pg_cron이 19:00~05:50 KST에 10분마다 `/api/cron/process` 호출(`0009_process_window.sql`). 무료 Gateway 분당 5회 제한에 맞춰 호출 간격을 둔다(`lib/llm/pace.ts`).
- Vercel Cron(`vercel.json`, UTC, Hobby는 지정한 시각부터 1시간 안에 실행): 수집 19:00 KST = `0 10 * * *`, 발송 예비 07:00 KST = `0 22 * * *`(6시에 못 받은 사람만 보냄).

## 컨벤션
- UI 문구·메일 문구는 한국어. 코드 식별자·커밋 메시지는 영어.
- 서버 데이터 변경은 서버 액션 또는 라우트 핸들러. 입력은 전부 zod로 검증.
- 외부 호출(LLM, Resend, 임베딩, 수집)은 `lib/` 아래 얇은 래퍼로 감싸고 타임아웃·재시도를 둔다.

## 작업 방식
- `docs/spec.md`의 "구현 순서"를 따른다. 각 Phase의 완료 기준을 통과하기 전에는 다음 Phase에 착수하지 않는다.
- 명세에 `[확인 필요]`로 표시된 값은 임의로 정하지 말고 사용자에게 묻는다. `(제안값)`은 그대로 쓰되 상수로 분리한다.
