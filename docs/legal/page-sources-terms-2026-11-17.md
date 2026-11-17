# 페이지 수집 3곳 이용약관 확인 (2026-11-17)

법률 자문이 아니다. `page` 수집처(사이트맵 + 공고 페이지의 JobPosting 데이터)는 공식 API가 아니라서, robots.txt와 별개로 각 사이트 이용약관이 자동 수집을 허락하는지 확인했다.

## 결론

| 사이트 | 약관 | 자동 수집 | 결정 |
|---|---|---|---|
| OpenTrain AI (`www.opentrain.ai`) | Terms of Service, 문서 버전 2026-11-07.1 | **금지**: "15.5 Engage in scraping, harvesting, or automated data collection without our prior written consent." [확인: 원문] | 수집 중단 |
| Mercor (`work.mercor.com`) | Terms of Service (mercor.com/terms-of-service, 이 환경에서 직접 열리지 않아 검색 발췌로 확인) | **금지**: 서비스나 Mercor IP의 어떤 부분도 자동·수동 "scraping"으로 복제하거나 2차 저작물을 만들 수 없다. 사람이 브라우저로 낼 수 있는 것보다 많은 요청을 보내는 robot·spider·scraper 사용도 금지(공개 검색엔진만 예외) [2차: 약관 발췌] | 수집 중단 |
| OneForma (`www.oneforma.com`) | Freelancer Terms & Conditions (CENTIFIC) | 금지 조항 없음. 약관은 기여자 플랫폼(my.oneforma.com) 이용 계약이고, 스크래핑·자동 접근을 다루는 조항이 없다. robots.txt도 `Allow: /` [확인: 원문] | 계속 수집 |

- 두 곳의 robots.txt는 공고 페이지를 허용한다. 하지만 robots.txt는 크롤러에게 주는 기술적 신호일 뿐이고, 약관이 따로 금지하면 계약 위반 위험이 남는다. 잡코리아-사람인 사건처럼 다툼이 되면 "약관으로 금지했는데도 수집했다"는 사실이 불리하다 [추정].
- 우리가 접근만 해도 약관에 묶이는지(브라우즈랩 약관의 효력)는 다툼이 있지만, 1인 서비스가 다툴 이유가 없어 보수적으로 멈췄다.

## 한 일 (2026-11-17)

- `lib/sources/pages.ts`: Mercor·OpenTrain에 `blockedByTerms`를 달았다. `sources` 행을 다시 켜도 수집기가 건너뛴다(`lib/workers/collect.ts`).
- `supabase/migrations/0021_page_sources_terms.sql`:
  - 두 수집처 `active=false`.
  - 두 곳에서 복제해 둔 원문(`raw_postings`) 전부 삭제.
  - 그 원문으로 만든 공고 중 한 번도 메일에 들어가지 않은 것은 삭제(실제로 전부 해당: Mercor 7건, OpenTrain 219건, 메일에 들어간 것 0건).
- 영향: Mercor 공고 7건이 후보에서 빠졌다. OpenTrain 공고는 신뢰하지 않는 출처라 검수 대기 상태였고, 보낸 적이 없다.

## 남은 것

- Mercor 자체 채용(Ashby 공개 API, `mercor` 보드)은 계속 수집한다. Ashby 채용 공고 API는 회사가 공고를 외부에 게시하라고 연 공개 API이고, Mercor 약관의 "서비스"(mercor.com 플랫폼)와 다르다 [추정].
- 두 곳 공고가 Himalayas에 다시 올라오면 Himalayas API로 받는다. 이건 Himalayas 약관(문의 중)의 문제다.
- 다시 수집하려면 서면 허락을 받는다(OpenTrain은 "prior written consent"를 명시). 허락을 받으면 `blockedByTerms`를 지우고 `sources.active`를 켠다.

## 출처

- OpenTrain AI Terms of Service: https://www.opentrain.ai/terms-of-service/ (2026-11-17 확인, 15.5조, 3.1조 만 18세 이상)
- Mercor Terms of Service: https://www.mercor.com/terms-of-service/ (검색 발췌, "Access to the Service; Service Restrictions")
- OneForma Terms & Conditions: https://www.oneforma.com/terms-and-conditions/ (만 18세 이상), Fraud and Scam Awareness: https://www.oneforma.com/fraud-and-scam-awareness/
