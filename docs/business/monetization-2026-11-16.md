# 덕잡 수익화 검토 (2026-11-16)

검색 결과 발췌를 바탕으로 정리했다. law.go.kr 같은 원문 사이트는 이 환경에서 열리지 않았다. 법률 자문이 아니며, 고용노동부 회신이 나오기 전에는 확정이 아니다.

표기: **[확인]** 공식 페이지 발췌로 확인 · **[2차]** 블로그·로펌·언론 · **[추정]** 계산 · **[미확인]** 근거 없음

## 결론
- 지금부터 약 300명까지는 수익을 받지 않고, 비용이 들지 않는 준비만 한다.
- 첫 수익 모델은 **유료 프리미엄**이고, **약 1,000명**에서 시작한다. 300~500명 구간에서는 결제 없는 대기 명단으로 지불 의사를 먼저 확인한다.
- 플랫폼의 채용 연동 레퍼럴(Mercor 등)은 보류한다. 직업소개로 볼 소지가 가장 크기 때문이다.
- **비용과 수익이 맞지 않는다.**
  - 생각을 켠 맞춤 추천을 전원에게 보내면 1,000명 기준 비용이 월 약 59만 원이다.
  - 프리미엄 월 7,900원에 전환율 1~3%면 수익은 월 8~24만 원이다 [추정].
  - 그래서 "무료 회원은 규칙 기반 추천, AI 맞춤 추천은 프리미엄"으로 나누는 방안을 검토한다. CLAUDE.md 규칙 10과 개인화 결정을 바꾸는 일이라 사용자가 정한다.

## 모델별 정리 (월 수익 [추정])

| 모델 | 방식 | 1천 명 / 5천 명 | 핵심 법적 쟁점 | 판정 |
|---|---|---|---|---|
| a) 프리미엄 | 월 4,900~7,900원: 일감 추가, 즉시 알림, 영어 지원서 초안 | 전환 1~5%: 8~40만 / 40~200만 원 | 직업정보제공사업자가 구직자에게 이용료를 받는 것을 금지하는 조항은 찾지 못했다(질의 필요). 지원은 사용자가 직접 한다(대행 금지). "취업추천·취업지원" 표현을 쓰지 않는다. 통신판매업 신고 또는 면제를 확인한다. 정기결제 전환·증액에는 사전 동의가 필요하다(전자상거래법, 2025-02-14 시행) [2차] | 회신 후 안전 |
| b) 스폰서·광고 | AI 도구·교육 광고 1칸 | 회당 3~10만 / 15~50만 원 | 정보통신망법 50조: 별도·선택 사전 동의, 제목 앞 "(광고)", 2년마다 재확인. 광고주가 세금계산서를 요구하므로 사업자등록이 필요하다 | 안전하지만 절차가 무겁다. 3천 명 이상부터 |
| c) 유료 게재 | 구인 회사·플랫폼이 돈을 내고 노출 | 월 0~2건 × 5~15만 원 | 직업정보제공사업 신고가 필수다. 시행령 28조(구인자 신원·연락처, 최저임금), 법 34조(거짓 구인광고) | 신고·회신 후 |
| d) 플랫폼 레퍼럴 | 덕잡 링크로 채용되면 보상 | 변동이 크다 | 채용 연동 보상은 유료직업소개로 볼 소지가 있다. 국외 유료직업소개는 고용노동부장관 등록 대상이다(19조 [확인]). (a)와 함께 하면 법 32조(응모자에게서 금품 수령 금지) 위험이 생긴다 | 보류 |
| e) 외화 수취 제휴 | `/guide`에 Payoneer·Wise 링크 | 월 7~18만 / 35~90만 원 | 직업안정법과 무관하다. 링크는 웹에만 둔다(메일에 넣으면 광고다). 링크 옆에 "덕잡이 수수료를 받습니다"를 단정형으로 표시한다(추천·보증 심사지침, 2024-12-01 시행) [2차] | 안전, 소액 |
| f) 디지털 상품 | 해외 일감 시작 가이드(W-8BEN·수취·세금·지원서) 14,900원 | 출시마다 15~45만 원 | 통신판매업, 디지털 콘텐츠 청약철회 제한 고지, "취업 보장" 표현 금지 | 안전 |

**모든 모델에 해당하는 것**
- **무료 메일의 성격이 바뀐다.** 수익이 생기면 "무료·무광고 정보 메일"이라는 기존 판단(`docs/legal/privacy-research-2026-11-09.md`)이 약해진다. 그래서 프리미엄 홍보는 웹에서 하거나 광고 동의자에게만 보낸다.
- **Freelancer 데이터:** 이 데이터가 들어간 메일을 유료화하거나 광고를 붙이기 전에 API 약관의 상업적 이용 조항을 확인해야 한다 [미확인]. Jobicy와 Himalayas는 확인을 마쳤다(`docs/supply-check-2026-11-14.md`).

## 벤치마크
- **유료 전환율**
  - Substack 독립 집계 중앙값 약 3% (Substack이 내세우는 수치는 5~10%) [2차]
  - beehiiv 중앙값 0.62% [2차]
  - 계획치로는 1~3%를 쓴다.
- **국내 유료 뉴스레터 가격:** 롱블랙 월 4,900원, 일간 이슬아 월 1만 원 [2차]
- **스폰서 단가**
  - beehiiv: 5천 명 미만 회당 $50~250, 5천~5만 명 $500~3,000 [확인]
  - 모비인사이드(약 1만 명): 배너 35~50만 원/회 [확인]
  - 비슷한 해외 서비스 Rat Race Rebellion(재택 일감 메일, 26만 명 이상): 메일 속 스폰서 일감 하루 $200 [확인]
- **구인 게재:** Remotive $299/30일, RemoteJobs.org $149 [확인]
- **오픈·클릭률:** beehiiv 2025 오픈 41.2% / 클릭 4.59% [확인], 스티비 5천 명 이하 24.7% / 4.6% [2차]

## 제휴·레퍼럴 조건

| 프로그램 | 조건 | 공개 게시 | 상태 |
|---|---|---|---|
| Payoneer | 피추천인이 첫 $1,000을 받으면 양쪽에 $25 | 개인 사이트·블로그 허용, 유료 광고 금지 | 확인 |
| Wise | 신규 고객 교차통화 거래 시 CPA(Partnerize), 금액 비공개 | 한국 퍼블리셔 가입 가능 여부 미확인 | 일부 |
| WorldFirst(한국) | 추천 1건 US$100, 사업자 대상 | 세부 조건 미확인 | 일부 |
| Mercor | 추천 1건 $250~15,000, 채용·청구가 시작된 뒤 지급 | 동의 기반, 스팸 금지 | 확인(보류 대상) |
| micro1 | 채용 후 10시간 근무하면 최대 $3,000 | 추천 전 후보자 동의 필수 | 확인(보류 대상) |
| Freelancer.com | 30일 안에 가입한 신규 사용자 보너스, 금액 미확인 | 명시 없음 | 일부 |

## 순서
1. **지금(비용 0)**
   - 본업의 겸업 규정을 확인한다. 모든 수익의 전제다.
   - 고용노동부 질의문(`docs/legal/moel-inquiry-draft-2026-11-14.md`)에 수익화 질문을 추가한다: ① 구직자 월 구독료, ② 구인자 유료 게재, ③ 플랫폼 보상이 직업소개인지.
   - 가입 화면에 별도·선택 "광고성 정보 수신 동의"(기본 해제)를 넣고 동의 일시를 저장한다.
2. **300~500명:** 웹에 프리미엄 대기 명단을 두고 지불 의사를 확인한다.
3. **회신 후:** 직업정보제공사업 신고, 사업자등록(간이과세, 건강보험 피부양자 영향 확인), 통신판매업 신고, Vercel Pro($20).
4. **약 1,000명:** 프리미엄과 `/guide` 외화 수취 제휴를 시작한다. 가이드 상품은 시험판으로 함께 낸다.
5. **3천~5천 명:** 광고 동의자에게만 스폰서를 보낸다.
6. **신고·회신 후, 3천 명 이상:** 유료 게재.

## 출처
- 직업안정법: [제19조](https://korea.legal/wiki/%ec%a7%81%ec%97%85%ec%95%88%ec%a0%95%eb%b2%95-%ec%a0%9c19%ec%a1%b0/), [제32조](https://korea.legal/wiki/%ec%a7%81%ec%97%85%ec%95%88%ec%a0%95%eb%b2%95-%ec%a0%9c32%ec%a1%b0/), [법원 2010 판결 보도](https://www.scourt.go.kr/portal/dcboard/DcNewsViewAction.work?gubun=44&seqnum=6962)
- 광고·표시: [정보통신망법 제50조](https://korea.legal/wiki/%ec%a0%95%eb%b3%b4%ed%86%b5%ec%8b%a0%eb%a7%9d-%ec%9d%b4%ec%9a%a9%ec%b4%89%ec%a7%84-%eb%b0%8f-%ec%a0%95%eb%b3%b4%eb%b3%b4%ed%98%b8-%eb%93%b1%ec%97%90-%ea%b4%80%ed%95%9c-%eb%b2%95-21/), [KISA 안내서 개정](https://m.boannews.com/html/detail.html?idx=142460), [추천·보증 심사지침(신김)](https://shinkim.com/kor/media/newsletter/2613)
- 전자상거래: [통신판매업 면제](https://thecheck.co.kr/mail-order-business-report-exemption/), [다크패턴(신김)](https://www.shinkim.com/kor/media/newsletter/3545), [Lemon Squeezy 지원 국가](https://docs.lemonsqueezy.com/help/getting-started/supported-countries)
- 벤치마크: [Simon Owens](https://simonowens.substack.com/p/whats-a-realistic-conversion-rate), [beehiiv 2026](https://www.beehiiv.com/blog/the-state-of-newsletters-2026), [beehiiv CPM](https://www.beehiiv.com/blog/what-is-a-cpm-for-email-ads), [모비인사이드 미디어킷](https://adure.net/uploads/adure/1681696409_1679899225_%EB%AA%A8%EB%B9%84%EC%9D%B8%EC%82%AC%EC%9D%B4%EB%93%9C_%EA%B4%91%EA%B3%A0_%EC%83%81%ED%92%88_%EC%86%8C%EA%B0%9C%EC%84%9C_v1.4.pdf), [롱블랙(요즘IT)](https://yozm.wishket.com/magazine/detail/1754/), [Rat Race 광고](https://ratracerebellion.com/advertise-with-us/), [Remotive](https://remotive.com/hire/resources/how-much-does-it-cost-1cdq0y7), [RemoteJobs.org](https://remotejobs.org/post-a-job)
- 제휴: [Payoneer 약관](https://payoneer.com/raf-terms-of-use), [Wise 지침](https://wise.com/partner/guidelines), [WorldFirst KR](https://www.worldfirst.com/kr/affiliate-program/), [Mercor 약관](https://talent.docs.mercor.com/policies/referral-terms-and-conditions), [micro1 약관](https://www.micro1.ai/legal/referral-terms), [Freelancer 제휴 약관](https://www.freelancer.com/page.php?p=info%2Faffiliate_program)
