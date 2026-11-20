# 수집처 점검: 회사명이 공개된 AI 일감 (2026-11-20)

조건(2026-11-20 고용노동부 회신 뒤):
- 회사가 공개 채용 API로 올린 공고
- 회사명과 주소·전화를 확인할 수 있음
- 한국에서 원격으로 할 수 있는 AI 관련 단기 일감

방법:
- Greenhouse·Lever·Ashby 공개 API를 이 환경에서 직접 조회했다. 약 90개 회사 토큰을 시도했다.
- 채용 시스템 도메인을 대상으로 "Korean AI trainer/annotator/rater"를 검색해, 이런 공고를 올리는 회사를 찾았다.

## 추가함
| 회사 | 보드 | 공고 | 한국 | 비고 |
|---|---|---|---|---|
| LILT | Ashby `lilt-production` | 452 (계약 448) | **12개, 모두 "Korea (Remote)" 계약** | AI 학습 참여자, 분야 전문가(수학·자연과학·금융·의료·로봇·제조·법률·리테일), AI 벤치마크 엔지니어, 음성 녹음. 다른 나라 공고는 위치 규칙이 LLM 호출 전에 거른다. 회사 주소는 개인정보처리방침의 법무 우편 주소(`lib/jobs/employers.ts`) |

## 확인했지만 넣지 않음
| 회사 | 이유 |
|---|---|
| Innodata (Greenhouse `innodatainc`, 108) | AI 일감이지만 모두 미국 거주자 전용(주별 원격) |
| Anyone AI (Ashby `anyone-ai`, 227) | 거의 중남미 거주자 대상 |
| Cohere (Ashby, Data Annotation Specialist) | 캐나다 계약 |
| ElevenLabs (Ashby, Freelance) | 영국·독일 거주자 대상 |
| Speak (Ashby) | 미국 LA 현장 배우 |
| Terac, Harvey, G2i | 미국 전문가·엔지니어 대상(G2i는 주소도 미확정) |
| Appen (Lever) | 국가별 일감이지만 한국 공고 없음 |
| xAI (기존 수집처) | AI Tutor는 "Remote, International"이지만 본문상 한국 지원 불가. 지금 한국어 공고 없음 |
| Surge AI, Encord, Sapien, Synthesia, DeepL, Perplexity, Anthropic, OpenAI 등 | 직원 채용만 |

## 다음 후보 (어댑터나 약관 확인 필요)
- **Workable 보드**
  - 대상: Mindrift(Toloka의 AI 트레이너 일감, `toloka-annotators`), Keywords Studios(게임 번역·테스트 프리랜서, `keywords-intl1`), Remote Talent Cloud
  - Workable 어댑터가 없고, 이 환경에서는 API가 429(요청 제한)로 응답했다. 넣기 전에 약관을 확인해야 한다.
- **SmartRecruiters 보드**
  - 대상: Upwork·Lifted가 올린 "Korean Linguists – AI Trainer"(검색으로 발견)
  - 공개 API에서는 지금 공고가 0건으로 나왔다. 회사 식별자를 다시 확인해야 한다.
- **Alignerr, Outlier, DataAnnotation, Mindrift 자체 사이트**
  - 공개 채용 API가 없다. 페이지를 수집하려면 약관(자동 수집 금지 여부)을 먼저 확인해야 한다(규칙 11).
