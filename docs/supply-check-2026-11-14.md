# 수집처 추가 조사 (2026-11-14)

목적: 영상·디자인·3D·개발·글쓰기 일감 124개가 전부 Freelancer.com(의뢰인 익명)에서 온다. 직업안정법 시행령 제28조(구인자 업체명 표시) 위험을 줄이려면 회사명이 공개되는 수집처가 필요하다. 표기: [실측] API 직접 호출, [약관] 공식 약관 확인, [검색] 검색 결과로 추정.

## 쓸 수 있는 곳

| 순위 | 수집처 | 접근 | 회사명 | 우리 분야 양 | 약관 | 메모 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Himalayas | `himalayas.app/jobs/api/search?country=KR&employment_type=Contractor` (Part Time, Temporary), 무료 키 필요 | [실측] 128/128 | [실측] 한국 지원 가능 표본 128건 중 57건(개발 37, AI 11, 디자인·영상·글쓰기 각 7). 창작 계약 일감은 약 2개월에 20~30건 | [약관 §113] 상업적 이용 가능. `applicationLink` 그대로, 출처 링크, 자체 사이트·앱에서만 노출, 만료 공고 삭제 | 이메일 다이제스트가 "자체 앱"에 해당하는지 hi@himalayas.app에 서면 확인 권장. micro1·TELUS 공고도 여기로 들어옴 |
| 2 | Jobicy | `jobicy.com/api/jobs?geo=south-korea` (anywhere, apac), 키 없음 | [실측] 100% | [실측] 이번 주 거의 0 | [약관] 뉴스레터·AI 요약·상업적 이용 명시 허용, 출처·링크 유지, 1시간 1회 이하 | 양은 적지만 약관이 가장 깨끗함 |
| 3 | Superside | Lever `superside` (기존 어댑터) | [실측] | [실측] Global 계약직 4건 중 아트 디렉터 1건 | 공개 채용 API | 그래픽·일러스트는 현재 남미 한정 |
| 4 | Toloka/Mindrift | Workable `toloka-annotators` (새 어댑터) | [검색] | 추정 | — | 이 환경에서 접속 차단돼 미확인 |
| 5 | RemoteOK | `remoteok.com/api` | [실측] 97/97 | [실측] 0~1건 | 링크백·출처 표기, 로고 금지 | 지역 정보 부실 |

## 쓸 수 없는 곳
- Remotive: API 응답에 "가입·이메일 수집용 노출은 약관 위반" 명시 [실측]
- We Work Remotely: API 약관이 저장·복사 금지, 대부분 정규직 [검색]
- Upwork·PeoplePerHour·Guru·Truelancer: 의뢰인 익명, Upwork는 수집 금지 [검색]
- Contra: 초대 회원만, 공개 API 없음. Adzuna: 상업적 이용 유료, 한국 미지원. Jooble: 재수집처, 약관 미확인 [검색]
- Dribbble·Behance·Krop·Mandy·ProductionHUB·Motionographer·Authentic Jobs: 공식 피드·API 없음 [검색]
- Alignerr Greenhouse `alignerr`: 404 [실측]. Outlier·DataAnnotation: 공개 보드 없음 [검색]
- 크몽·숨고·위시켓: 공식 API 없음. 원티드: openapi 흔적만, 제휴 문의 필요

## 위험
- 회사명 있는 창작 계약 일감은 하루 0.5건 안팎. Freelancer를 대체하지 못한다.
- 지역 칸이 비어 있어도 본문에 "U.S. Based"가 있는 공고가 있다 → 본문 판정(LLM) 유지.
- Xperteez 같은 중개업체 재게시 공고는 실제 구인자가 다를 수 있다(시행령 제28조 취지상 검토).
- Himalayas `pubDate`는 마지막 수정일이라 신선도가 과대 추정된다.
- Welo·TransPerfect 공고가 Himalayas에도 나온다 → 같은 공고는 직접 수집처(ATS) 우선.

## 반영 (같은 날 밤)

- Jobicy(geo=south-korea, 하루 1회), Himalayas(country=KR, 계약·파트타임·임시, `HIMALAYAS_API_KEY` 있을 때만), Superside(Lever) 추가(0016, `lib/sources/aggregators.ts`).
- 이미 직접 수집하는 회사(Welo, TransPerfect, Invisible 등)의 재게시는 건너뛴다. 목록을 다 못 읽은 실행에서는 공고를 닫지 않는다.
- 회사명은 공고에 적힌 회사, 메일 카드에 "출처: Jobicy/Himalayas" 표시, 제목의 "U.S. Based"는 미국 거주자 한정으로 본다.

## Himalayas 확인 메일 초안 (hi@himalayas.app)

Subject: Using the Himalayas Jobs API in a daily email digest

Hi Himalayas team,

I run duckjob (https://www.duckjob.app), a free service that emails subscribers in Korea a short list of remote contract and part-time jobs each morning. I'd like to include jobs from your public Jobs API.

How we would use it:
- We call /jobs/api/search once a day with a free API key (country=KR; Contractor, Part Time, Temporary).
- Each job appears only in our own email to a subscriber, as a short Korean summary with the company name, a "Source: Himalayas" credit, and an apply button that goes to the applicationLink you provide.
- We don't republish jobs on another site, don't add JobPosting structured data, and drop jobs once they expire or leave your listing.

Does sending jobs in our own email digest count as use within "your own website or app" under your API terms? If anything should change (wording of the credit, a link format), we're happy to follow it.

Thank you,
duckjob
