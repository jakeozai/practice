# 공고 공급 점검 — 2026-11-07

Phase 0 완료 기준 "하루 5개를 채울 신규 공고 공급 확인"과 명세 §16 `[확인 필요] 시드 플랫폼별 채용 시스템 종류와 board token`을 위해, 공개 채용 API(Greenhouse·Lever·Ashby)에서 실제 공고를 조회했다.

- 방법: 공개 GET API만 사용(명세 규칙 11). 플랫폼 이름으로 board token을 추측해 조회했고, 결과를 명세 §8의 키워드·지역 규칙으로 거른 뒤 본문을 직접 읽어 판정했다.
- 데이터는 저장소에 커밋하지 않았다(원문 복제 금지). 아래는 요약과 원문 링크뿐이다.

## 결론

1. **한국 거주자가 지원할 수 있고 자격이 필요 없는 실제 공고는 3건**이고, 모두 RWS(TrainAI)다.
2. **최근 30일 안에 새로 올라온 공고는 0건**이다. 공개 채용 API만으로는 하루 5개는커녕 주 1개도 채우지 못한다.
3. 명세에 적힌 플랫폼 대부분(Mercor, Scale/Outlier, Labelbox/Alignerr, Prolific, Toloka, Turing 등)은 공개 채용 보드에 **자사 직원 채용**만 올린다. 실제 AI 일감은 각 회사의 **자체 작업 플랫폼**에 있다.
4. 따라서 Phase 0 공급은 수동 등록에 기대야 하고, Phase 1의 수집 소스는 공개 채용 API만으로는 부족하다. 어떤 자체 플랫폼을 소스로 삼을지(약관·robots.txt 확인 포함)는 결정이 필요하다.

## 채용 시스템 조사 결과

| 플랫폼 | 채용 시스템 · board token | 공고 수 | 내용 |
| --- | --- | --- | --- |
| RWS (TrainAI) | Lever `rws` | 125 | **언어별 AI 일감** (평가자·녹음·데이터 작업). 한국어 3건 + 글로벌 인재풀 |
| Appen | Lever `appen` | 48 | 국가별 음성 녹음 일감. 한국은 없음 |
| xAI | Greenhouse `xai` | 303 | AI Tutor 10건. 위치 칸은 "Remote, International"이지만 본문은 미국·영국·캐나다·호주(일부 인도)로 한정 → **한국 불가** |
| Mercor | Ashby `mercor` | 90 | 직원 채용만 (일감은 자체 플랫폼) |
| Handshake | Ashby `handshake` | 78 | 직원 채용만 |
| Scale AI | Greenhouse `scaleai` | 168 | 직원 채용만 (일감은 Outlier) |
| Labelbox (Alignerr 운영사) | Greenhouse `labelbox` | 10 | 직원 채용만 |
| Prolific | Greenhouse `prolific` | 28 | 직원 채용만 |
| Invisible | Greenhouse `invisibletech`, `invisible` | 20, 5 | 직원 채용만 |
| Toloka | Greenhouse `toloka` | 17 | 직원 채용만 |
| Turing | Greenhouse `turing` | 44 | 직원 채용만 |
| Snorkel AI | Greenhouse `snorkelai` | 41 | 직원 채용만 |

세 시스템 어디에서도 공개 보드를 찾지 못한 곳: OpenTrain AI, Alignerr(직접), Meridial, micro1, Welo Data(`welodata`, `welocalize`), Outlier, Surge, DataAnnotation, TELUS, LXT, e2f, Abaka, Datacurve.

## 등록 가능한 실제 공고 (`/admin/jobs/new`에 그대로 입력)

요약은 원문 번역이 아니라 새로 쓴 문장이다. 등록 전에 원문이 아직 열려 있는지 확인할 것.

### 1. RWS — AI Data Specialist - Korean

- 원문: https://jobs.lever.co/rws/d70afa3f-68d0-495b-b0b3-d0a2ec891b67 (게시 2026-06-18)
- 요약
  ```text
  AI가 만든 한국어 결과물을 비교·평가하고 라벨을 다는 일
  한국어 원어민, 영어 B2 이상이면 경력 없어도 지원 가능
  시간당 10달러, 주 10시간 이상, 원하는 시간에 재택
  ```
- 한국 지원 가능: 가능 / 지원 지역 문구: `South Korea (remote)` / 상태: open / 분류: 라벨링
- 작업 언어: `ko, en` / 영어 수준: 업무·유창(B2–C2) / 보수: 10~10 USD 시간당 / 최소 주당 시간: 10

### 2. RWS — Search Engine Evaluator - Korean (South Korea)

- 원문: https://jobs.lever.co/rws/6f793f72-c1e5-4818-8603-49f7fd0297e3 (게시 2024-10-14, 2년째 열려 있는 상시 모집)
- 요약
  ```text
  검색어에 대한 검색 결과가 알맞은지 평가하는 일
  한국 거주 18세 이상, 경력 무관, 교육·시험 통과 필요
  시간당 최대 10달러, 주 5~20시간 재택
  ```
- 한국 지원 가능: 가능(한국 거주 필수) / 지원 지역 문구: `Currently reside in South Korea` / 상태: pool / 분류: 기타
- 작업 언어: `ko, en` / 영어 수준: 언급 없음(원문은 "English and Korean proficiency"라고만 함) / 보수: 최대 10 USD 시간당 / 최소 주당 시간: 5

### 3. RWS — Join our global TrainAI talent pool

- 원문: https://jobs.lever.co/rws/f4e3ba40-dc02-4f86-a88a-9cc7e7891ede
- 요약
  ```text
  AI 라벨링·평가·언어 작업 인재풀에 미리 등록하는 공고
  전 세계 원격, 맞는 프로젝트가 생기면 연락을 받음
  보수와 시간은 프로젝트마다 다름
  ```
- 한국 지원 가능: 가능(본문 "global talent network". 단 위치 칸은 Florida/US라 애매함) / 상태: pool / 분류: 라벨링

### 발송 제외

- RWS — Legal Annotators - Korean (https://jobs.lever.co/rws/7560af27-12eb-42fc-995d-d2baa4fbbdb1): 계약·법률 전문 경력이 필수라 `requires_credential = true`. 시간당 22.95달러, 주 25시간 이상.

## Phase 1에 반영할 점

- **위치 칸보다 본문의 지역 조건이 우선이다.** xAI처럼 위치 칸은 "International"인데 본문에서 국가를 한정하는 경우가 있다. 지역 규칙(`lib/eligibility.ts`)에 `international`을 "가능" 단어로 넣으면 안 된다.
- 위치 칸의 `Seoul`, `KR`도 한국으로 인식해야 한다(명세 정규식에는 `korea`만 있음).
- 공개 채용 API는 RWS·Appen 정도만 일감을 올린다. 공급을 늘리려면 플랫폼 자체 일감 페이지를 소스로 넣는 결정이 필요하다(명세 규칙 11: robots.txt 확인, User-Agent 명시).
