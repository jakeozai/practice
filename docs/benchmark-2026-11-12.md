# 벤치마킹 · 온보딩 프로세스 · AI 비용 — 2026-11-12

세 가지 질문을 정리한 문서다.

1. "내 AI로 분석"은 어떤 흐름인가
2. 매일 아침 매칭 메일에 드는 AI API 비용
3. Bloomberry Remote Jobs·JobAlert에서 가져올 것

## 요약

- **내 AI 분석:** 우리가 프롬프트를 주고, 사용자가 자기 AI의 답을 다시 붙여넣는 구조가 맞다. 이미 그렇게 구현돼 있고 우리 LLM 비용은 0원이다. 이탈은 "복사해서 돌아오기"에서 생기므로, 프롬프트에 "코드 블록으로 출력"을 넣어 AI 화면의 복사 버튼을 쓰게 하는 것이 가장 싼 개선이다.
- **AI 비용:** 구독자 수가 아니라 새 공고 수에 비례한다. 사용자별 LLM 호출은 0회다(CLAUDE.md 규칙 10). 지금 규모에서 **월 약 $0.4~2.6(약 600~3,600원)**이다. 실제로 먼저 드는 돈은 메일(Resend)이다.
- **벤치마킹:** 가장 먼저 할 것은 세 가지다. ① 온보딩 직후 "내일 받을 일감" 미리보기 ② "한국에서 지원 가능한 것만"을 핵심 문구로 ③ 메일에 큐레이션 수치 표시. 다음은 카테고리별 SEO 페이지와 가입 때 분야 한 번 탭으로 고르기.

---

## 1. "내 AI로 분석" 흐름

### 지금 구현 (`app/onboarding/onboarding-flow.tsx`, `lib/profile/*`)

| 단계 | 사용자 | 시스템 |
| --- | --- | --- |
| 1 | [ChatGPT로 분석]·[Claude로 분석]·[Gemini로 분석] 클릭 | `prompts/profile-extract.md`를 클립보드에 복사하고 AI를 새 탭으로 연다. ChatGPT·Claude는 `?q=`로 미리 채우고, Gemini는 사용자가 붙여넣는다 (`lib/profile/prefill.ts`) |
| 2 | — | 사용자의 AI가 메모리·대화 기록으로 분석해 `<<AIJOB5_PROFILE_V1>> {JSON} <<END_AIJOB5_PROFILE>>`를 출력한다 |
| 3 | 답을 복사해 덕잡 탭으로 돌아와 [불러오기] 또는 붙여넣기 | `POST /api/profile/preview` → `parseProfileText()` |
| 4 | 확인 카드에서 [맞아요] | `POST /api/profile/save` → 재검증 후 저장. 원문은 저장하지 않는다 |

### 이 방식을 쓰는 이유

- ChatGPT 메모리 같은 사용자 AI의 기억이 어떤 가입 폼보다 그 사람을 잘 안다.
- 사용자가 직접 쓰는 것이 없다. 확인만 한다.
- 비용 때문은 아니다. 서버에서 분석해도 Haiku 5.5 기준 1인당 1회 약 $0.0003이라 1만 명이어도 약 $3이다.

### 약점과 개선안

| 문제 | 개선안 | 난이도 |
| --- | --- | --- |
| 답을 드래그해서 복사하기 번거롭다 (특히 모바일) | 프롬프트 규칙 4를 "표식 두 줄과 JSON을 **코드 블록 하나로** 출력해"로 바꾼다. ChatGPT·Claude·Gemini 모두 코드 블록에 복사 버튼을 띄운다. 파서는 이미 코드펜스를 처리한다 | 낮음 |
| AI를 안 쓰거나 메모리가 없는 사람 | 같은 화면에 대체 경로를 둔다: 명세의 5문항 폼, 또는 자유 입력을 서버 LLM으로 정리(1인당 약 $0.0003, 1회) | 중간 |
| 어디서 이탈하는지 모른다 | 단계별 이벤트를 기록한다: AI 열기 → 돌아오기 → 파싱 성공 → 저장 | 낮음 |
| 나중에 프로필을 갱신할 때도 같은 번거로움 | Phase 3의 MCP·커넥터로 사용자의 AI가 직접 저장. 첫 가입보다 갱신용으로 적합하다 | 높음 |

---

## 2. 매일 아침 메일의 AI API 비용

### 비용 구조

```text
수집(19:00 KST) → 키워드·지역 필터(LLM 없음) → 남은 새 공고·바뀐 공고만 LLM 1회 → jobs
발송(06:00 KST) → 사용자별 매칭은 SQL·규칙, LLM 0회 → 메일
```

- LLM 비용은 **새 공고 수**에만 비례한다. 구독자가 1명이든 1만 명이든 같다.
- 같은 공고는 본문이 바뀌지 않으면 다시 처리하지 않는다(`processed_hash`).

### 실측 (Supabase, 2026-11-12)

| 항목 | 값 |
| --- | --- |
| 첫 수집 | 2026-11-12 11:57 UTC |
| 수집한 공고 | 3,020건 (미처리 2,202건) |
| 처리된 jobs | 72건, 승인 39건 |
| 구독자 | 1명 |
| 공고 본문 길이 | 평균 3,524자, 상위 10% 6,193자 |

### 공고 1건당 토큰 (추정)

- 입력 약 2,500토큰: 시스템 프롬프트 약 1,100(`prompts/job-extract.md`) + 출력 스키마 약 400 + 본문 평균 약 900 + 태그
- 출력 약 500토큰: 추출 필드 + 한국어 요약 3줄

### 비용 (1달러 ≈ 1,400원 가정)

| 모델 | 단가 (입력/출력, 100만 토큰당) | 공고 1건 | 하루 30~100건 | 한 달 |
| --- | --- | --- | --- | --- |
| Gemini 2.5 Flash-Lite (현재 `.env.example` 기본값) | $0.10 / $0.40 | 약 $0.00045 | $0.01~0.05 | **약 $0.4~1.4** |
| Claude Haiku 5.5 | $0.10 / $0.50 | 약 $0.0005~0.0009 | $0.03~0.09 | **약 $0.8~2.6** |

- 하루 30~100건은 공급 점검(`docs/supply-check-2026-11-07.md`)의 신규 유입(OpenTrain 하루 약 25건 등)과 본문 수정 재처리를 합친 추정이다. 실측되면 이 표를 갱신한다.
- 오늘 쌓인 미처리 2,202건을 한 번 처리하는 비용은 최대 $1~2다. 필터에서 걸러진 공고는 LLM을 부르지 않으므로 실제로는 더 적다.
- 임베딩(Phase 2, OpenAI `text-embedding-3-small` $0.02/100만 토큰): 공고·프로필당 약 150토큰이라 하루 1센트 미만이다.
- Batch(50% 할인)나 프롬프트 캐싱으로 줄일 수 있는 금액은 월 $1 안팎이라, 지금은 복잡도를 늘릴 가치가 없다.

### 주의: Haiku 5.5로 바꿀 때

- Haiku 5.5는 thinking이 기본으로 켜져 있어 출력 토큰이 늘어난다.
- `lib/llm/extractJob.ts`의 `max_tokens: 1500`에서 응답이 잘리면 재시도로 비용이 두 배가 된다.
- 전환할 때 요청에 `thinking: {type: "disabled"}`를 함께 넣는다.

### 실제로 먼저 드는 돈: 메일

| Resend 요금제 | 한도 | 매일 보낼 수 있는 구독자 |
| --- | --- | --- |
| Free | 월 3,000통, **하루 100통** | 약 90명 (로그인 메일 포함) |
| Pro $20/월 | 월 50,000통 | 약 1,600명 |

- 그 이상 요금제는 출처마다 가격이 달라 확인이 필요하다(월 10만 통 $35~90).

### 나중에 사용자별 LLM을 붙인다면

| 기능 | 1인 1일 | 1,000명 한 달 |
| --- | --- | --- |
| LLM이 쓰는 "추천 이유" (Haiku 5.5) | 약 $0.00025 | 약 $7.5 (Batch 사용 시 약 $3.8) |
| 후보 20개 LLM 재정렬 (Haiku 5.5) | 약 $0.0005 | 약 $15 (Batch 사용 시 약 $7.5) |

- 구독자가 늘기 전까지는 규칙 10(사용자별 LLM 0회)을 유지한다.

---

## 3. 벤치마킹

### Bloomberry Remote Jobs

| 항목 | 내용 |
| --- | --- |
| 무엇 | 지난 24시간 동안 올라온 원격 공고를 매일 메일로 보내는 서비스 |
| 수집 | 5만 개 넘는 회사 채용 페이지와 Workday·Ashby·Greenhouse 등 50개 이상의 채용 시스템 |
| 형태 | 직무별 페이지·메일(원격 PM, HR, 세일즈 인에이블먼트), GTM 엔지니어 전용 잡보드 |
| 성과 | 2024년 3월 Hacker News 글: 6주 만에 구독자 1,500명 이상 |
| 받은 불만 | "미국 위주로 보인다, EU·글로벌 원격 필터를 달라" |
| 사업 구조 | 본업은 데이터 판매다(운영사 Revealera, 기술 사용 데이터·채용공고 API, 월 $199선). 잡보드와 "원격 공고 100만 건 분석" 같은 글은 그 데이터로 만든 마케팅이다 |

### JobAlert

이름이 같은 서비스가 여럿이라 [jobalert.world](https://jobalert.world/)로 가정했다. 다른 후보는 개인용 오픈소스 [advjr/jobalert](https://github.com/advjr/jobalert)(공개 공고 피드를 기술 기준으로 점수 매기는 개인 CRM)다.

| 항목 | 내용 |
| --- | --- |
| 무엇 | 회사 채용 페이지·잡보드를 하루 여러 번(8시간마다) 확인해 메일로 알림 |
| 내세우는 점 | "LinkedIn에 뜨기 전에" — 빨리 지원하는 쪽이 유리하다는 점 |
| 설정 | 직무, 레벨(인턴~리더), 지역·원격, 고용형태 |
| 요금 | 설정과 매칭 미리보기는 무료. 메일 알림은 월 $6.99부터, 7일 체험, AI 커버레터 포함 |
| 유입 | 직무×지역별 SEO 페이지 대량 생성. 예: "Remote Product Designer Jobs — 73 New This Week", "Remote Jobs Berlin — New Today, Before LinkedIn" |

### 가져올 것 (우선순위순)

| 순위 | 내용 | 출처 | 난이도 | 덕잡에서 쓸 데이터 |
| --- | --- | --- | --- | --- |
| 1 | 온보딩 완료 화면에 **"내일 받을 일감 미리보기" 3개**. 첫 메일까지 기다리지 않고 바로 가치를 보여준다 | JobAlert 무료 미리보기 | 낮음 | `jobs.summary_ko`, `url` (규칙 1 범위 안) |
| 2 | **"한국에서 지원 가능한 것만"을 핵심 문구로**. 메일 하단에 "이번 주 미국 한정 공고 N개 걸러냄" | Bloomberry가 받은 불만 | 낮음 | `korea_eligible = false` 수 |
| 3 | 메일 제목이나 상단에 **"어제 새 공고 41개 중 3개 골랐어요"** | Bloomberry의 "지난 24시간" | 낮음 | 하루 신규 jobs 수 |
| 4 | **카테고리·언어별 SEO 페이지**. 예: "한국어 AI 라벨링 재택 일감 — 이번 주 새로 12개". 요약과 원문 링크만 노출하고 구독 버튼을 단다 | 두 서비스 공통 | 중간 | `category`, `languages`, `first_seen_at` |
| 5 | 가입 때 **분야 한 번 탭으로 고르기**(번역·언어 / 코딩·STEM / 법·의료 전문직 / 단순 라벨링). 임베딩 전 간이 개인화. 전문직 일감을 맞는 사람에게만 보낼 수 있다 | JobAlert 설정, Bloomberry 직무별 메일 | 중간 | `category`, `requires_credential` |
| 6 | 데이터가 쌓이면 **월간 "AI 부업 시장 리포트"**: 평균 시급, 플랫폼별 미국 한정 비율(예: Mercor 94%) 등. 커뮤니티 홍보용 | Bloomberry 데이터 콘텐츠 | 낮음 | `pay_*`, `korea_eligible`, 출처 |
| 7 | 카드에 **"N시간 전 게시"** 표시. 즉시 알림은 나중에 유료 기능 후보로 | JobAlert의 속도 강조 | 나중 | JSON-LD 게시일 |

### 가져오지 않을 것

| 항목 | 이유 |
| --- | --- |
| 5만 개 회사 범용 크롤링 | 우리 병목은 채용 시스템 수가 아니라 AI 일감 플랫폼의 자체 페이지다 |
| 지금 유료화 | 구독자 1명. 사람인 약관(이용자에게 대가를 받으면 안 됨)과 광고성 정보 규정 문제도 있다 |
| AI 커버레터 | 2026-11-09에 영어 지원서를 보류로 결정했다 |

---

## 4. 다음 작업 후보

- [ ] `prompts/profile-extract.md` 규칙 4: 코드 블록으로 출력하게 수정 (+ `prompt.test.ts` 확인)
- [ ] 온보딩 완료 화면에 미리보기 3개
- [ ] 메일 문구: "한국에서 지원 가능", 큐레이션 수치, 걸러낸 공고 수
- [ ] 온보딩 단계별 이탈 기록
- [ ] Haiku 5.5로 전환할 때 `thinking: {type: "disabled"}` 추가
- [ ] 구독자 80명 근처에서 Resend Pro로 전환 준비
- [ ] 하루 신규 공고 수 실측 후 비용 표 갱신

## 조사 한계

- 이 환경의 네트워크가 bloomberry.com과 news.ycombinator.com을 허용하지 않아 페이지를 직접 열지 못했다. 두 서비스 정보는 웹 검색 결과 요약 기준이다.
- 토큰 수와 하루 공고 수는 추정이다. Resend 상위 요금제 가격은 출처마다 다르다.

## 출처

- [The Latest Remote Jobs (Globally) — Bloomberry](https://bloomberry.com/blog/remote-jobs/)
- [Bloomberry 창업자 글 — Hacker News](https://news.ycombinator.com/item?id=39829835)
- [Remote work trends (analysis of 1M remote jobs) — Bloomberry](https://bloomberry.com/blog/the-state-of-remote-work/)
- [GTM Engineering Job Board — Bloomberry](https://bloomberry.com/gtm_jobs.html)
- [Daily sales enablement jobs email — Bloomberry](https://bloomberry.com/blog/subscribe-to-get-a-daily-email-with-the-latest-sales-enablement-jobs/)
- [Bloomberry Review — coldiq](https://coldiq.com/tools/bloomberry)
- [jobalert.world](https://jobalert.world/), [Pricing](https://jobalert.world/pricing), [Remote Product Designer Jobs](https://jobalert.world/remote-product-designer-jobs)
- [advjr/jobalert — GitHub](https://github.com/advjr/jobalert)
- [Gemini 2.5 Flash-Lite pricing — computeprices](https://computeprices.com/providers/google/models/gemini-2-5-flash-lite)
- [Resend pricing](https://resend.com/pricing.md), [Resend free tier explained](https://automationatlas.io/answers/resend-free-tier-explained-2026/)
- Claude Haiku 5.5 단가: Anthropic API 문서 (2026-11-03 기준 $0.10 / $0.50)
