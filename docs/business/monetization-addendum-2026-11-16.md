# 덕잡 수익화 보완 검토 (2026-11-16 오후)

오전 문서 `docs/business/monetization-2026-11-16.md`를 보완한다. 그 뒤 비용 원칙이 바뀌었고(CLAUDE.md "비용 원칙"), 오전 문서에 없던 수익원을 찾아봤다. 법률 자문이 아니다.

표기: **[확인]** 공식 페이지 · **[2차]** 블로그·비교 사이트 · **[추정]** 계산 · **[미확인]** 근거 없음. 환율은 1달러 = 1,400원으로 계산했다 [추정].

## 결론
- **지금은 수익보다 구독자다.**
  - 11/16 기준 구독자 2명(첫 가입 11/12), 발송 5회, 클릭 1회다. 승인된 열린 공고는 662개다.
  - 오전 문서의 1단계(비용 0인 준비)에 해당한다.
- **비용 문제는 사라졌다.**
  - 사용자별 AI 호출을 끈 뒤로, 구독자 수에 비례하는 비용은 메일뿐이다. 1,000명 기준 월 약 5천 원이다.
  - 그래서 "AI가 직접 고른 3개 + 이유·오늘 할 일"이 프리미엄 상품으로 자연스럽게 나뉜다. 원가는 1인당 월 약 520원이다.
- **새 수익원 중 가장 맞는 것은 AI 도구 제휴다.**
  - 도전 칸은 이미 Ideogram·Canva·Meshy·Claude Code 같은 도구를 이름으로 추천한다.
  - 공개 제휴가 있는 도구(ElevenLabs·HeyGen·Synthesia)부터, 메일이 아닌 웹 페이지에서 시작한다.
  - 직업안정법과 무관하다. 다만 도전 칸이 실제로 추천하는 도구 대부분은 제휴 프로그램을 확인하지 못했다.
- **사용자가 정할 것**
  1. 프리미엄을 "AI 맞춤 추천"으로 정의할지
  2. 도구 안내에 제휴 링크를 붙일지

## 1. 오전 결론 중 바뀐 것: 비용

| | 오전 (사용자별 AI 켬) | 지금 (사용자별 AI 끔) |
|---|---|---|
| 1,000명 월 변동비 | 약 59만 원 | 메일 3만 통 × SES 1,000통당 $0.10~0.16 = $3~5 → **약 4~7천 원** [추정] |
| 고정비 | — | 무료 한도를 넘으면 Vercel Pro $20, Supabase Pro $25 → 월 약 6만 원. 바꾸기 전에 사용자에게 묻는다 |

프리미엄의 원가
- 생각을 켠 AI 추천 1회 $0.0123(`docs/experiments/pick-thinking-2026-11-16.md` 실측) × 30일 = 월 $0.37, **약 520원/명** [추정]
- 월 7,900원 기준으로 원가의 약 7%다. 결제 수수료(국내 PG 3%대, 해외 대행 5%+α) [미확인]가 AI 원가보다 크다.

1,000명, 전환 2%일 때 [추정]
- 매출: 20명 × 7,900원 = 15.8만 원
- 비용: AI 1만 원, 수수료 2만 원, 고정비 6만 원
- 남는 돈: 약 **6~7만 원**
- 전환 1%면 고정비를 겨우 넘는다. 손익분기는 유료 회원 약 10명이다.

**제안:** 프리미엄 = AI가 직접 고른 3개 + 추천 이유·오늘 할 일 + 영어 지원서 초안.
- 무료 메일은 지금처럼 규칙 상위 3개와 도전 2개를 보낸다.
- `PICK_WITH_MODEL` 스위치를 회원별로 켜는 구조라 코드 변경이 적다.
- 11/14 개인화 결정("철저히 따른 3개")은 무료에서도 규칙으로 지킨다. AI는 "더 잘 고르고 설명까지"를 담당한다.

## 2. 새로 찾은 수익원

### g) AI 도구 제휴 — 우선 추천
도전 칸(`lib/match/stretch.ts`, `prompts/digest-pick.md`)은 "어떤 AI 도구로 어떻게"를 쓴다. 웹에 "이 일에 쓸 도구" 안내를 두고 제휴 링크를 단다.

| 도구 | 조건 | 근거 |
|---|---|---|
| ElevenLabs (음성) | 12개월 동안 22% 반복. Business 요금제 11%, 엔터프라이즈 0. PartnerStack으로 지급, 발생 3개월 뒤 | [2차] 공식 약관(2026-06-10 개정)을 인용한 리뷰 |
| HeyGen (AI 영상) | Creator·Team 요금제 35%, 30일 쿠키, 월 지급. 지급 기간 3~6개월은 출처마다 다르다 | [확인] 공식 파트너 페이지 · 기간 [미확인] |
| Synthesia (AI 영상) | 12개월 동안 20~30%, 60일 쿠키 | [2차] |
| Descript (영상 편집) | 신규 구독 1건당 $25 정액이라는 최신 정보와 15% 반복이라는 이전 정보가 엇갈린다 | [2차] |
| Framer (웹) | 공식 프로그램은 있고 요율은 공개하지 않는다. 제3자 자료에는 12개월 50% | [확인] 존재 · 요율 [2차] |
| Canva | Canvassador 프로그램. 지역·파트너별로 다르다 | [2차] |
| Envato (소스·템플릿) | 신규 고객 대상. 요율은 가입 뒤 공개 | [2차] |
| Runway | 공개된 것은 양쪽에 크레딧을 주는 레퍼럴뿐. 현금 요율은 로그인해야 보인다 | [2차] |
| Leonardo AI | 출처마다 첫 달 60% / 15~20% 반복 / 프로그램 없음으로 다르다 | [2차] 신뢰 낮음 |
| Midjourney · Ideogram · Meshy · Tripo | 제휴 프로그램을 찾지 못했다 | [미확인] |

- **법적 판단**
  - 구직자에게서 돈을 받지 않고 구인자에게서 보상을 받지도 않으므로 직업안정법 쟁점이 없다.
  - **메일에는 넣지 않는다.** 메일에 넣으면 광고성 정보(정보통신망법 50조)가 된다.
  - 링크 옆에 "덕잡이 수수료를 받습니다"를 단정형으로 표시한다(추천·보증 심사지침, 오전 문서 e).
  - 도구 안내는 공고 목록과 떨어진 페이지(`/guide` 하위 등)에 둔다. Freelancer 공고와 한 화면에 광고 수익을 붙이지 않기 위해서다(CLAUDE.md 규칙 12).
- **원칙:** 도전 이유에 쓰는 도구는 지금처럼 일에 맞는 것으로 정한다. 제휴 여부로 바꾸지 않는다. 바꾸면 "그 사람에게 맞는 일"이라는 서비스의 신뢰가 무너진다.
- **한계:** 도전 칸이 가장 자주 추천하는 이미지·3D 도구(Ideogram·Midjourney·Meshy·Tripo)는 제휴를 찾지 못했다. 실제로 링크를 달 수 있는 것은 음성·영상·웹 도구다.
- **규모** [추정]
  - 가정: 구독자 1,000명 중 매달 0.1~0.5%가 링크로 유료 가입하고, 1건당 월 수수료는 약 $5다(요금 $10~30 × 22~35%).
  - 12개월 반복이 쌓이면 월 **약 8~42만 원**이다. 첫 몇 달은 그보다 훨씬 적다.

### h) 국내 강의 제휴
- 인프런 마케팅 파트너스: 공식 강의 제휴 프로그램이 있다. 요율은 확인하지 못했다 [확인/미확인].
- 클래스101: 제휴 프로그램을 찾지 못했다(크리에이터용 셀프 레퍼럴만 있다) [미확인].
- 도전 칸 옆 "이 일 배우기"로 붙일 수 있다. 법적 판단은 g와 같다. 요율을 확인한 뒤 g와 함께 검토한다.

### i) 기관 대상 (대학 취업센터·부트캠프·지자체)
- 개인 대신 기관이 학생·주민용 구독을 사는 방식이다.
- 오전 문서 c)처럼 직업정보제공사업 신고가 필요할 수 있다. 고용노동부 질의에 함께 넣는다.
- 공공 사업으로는 부산시 「부산형 원격 프로젝트 일자리」(2026 시범, 부산 거주 청년 개발자의 국내외 원격 프로젝트 지원)만 찾았다. 해외 원격 일감 자체를 지원하는 사업은 찾지 못했다 [확인/미확인].
- 가격 근거는 없다. 구독자 1,000명과 클릭률·지원 사례가 쌓인 뒤 제안서를 만든다.

### 검토했지만 우선순위가 낮은 것
- **웹 공고 페이지 광고(AdSense):**
  - 지금은 공개 공고 상세 페이지가 없어 새로 만들어야 한다.
  - Freelancer 공고에 광고를 붙이려면 서면 허락이 필요하다.
  - 일감 정보 페이지의 광고 단가는 낮을 것으로 본다 [추정].
- **AI 데이터 플랫폼 레퍼럴 추가 조사:** 모두 채용과 연동된 보상이라 오전 문서 d)와 같은 이유로 보류다.
  - Outlier·DataAnnotation·Alignerr는 공개 금액을 찾지 못했다.
  - Handshake AI는 피추천인 시급의 10%(상한 40배), Braintrust AIR는 1건 $1,000이다 [확인].
- **세금 신고 서비스 제휴(삼쩜삼 등):**
  - 해외 수입이 있는 프리랜서는 종합소득세 신고 대상이다.
  - 공개된 추천 보상은 찾지 못했다 [미확인].
  - 오전 문서 f)의 가이드 상품을 만들 때 협업 상대로만 메모해 둔다.

## 3. 순서 (오전 문서의 단계에 끼워 넣기)
1. **지금:** 구독자 늘리기, 겸업 규정 확인, 고용노동부 질의(오전 문서와 같다).
   - 질의에 "기관이 구독을 사는 경우"를 추가한다.
2. **300~500명:** 프리미엄 대기 명단의 상품 설명을 위 제안(AI 맞춤 추천 + 지원서)으로 쓴다.
3. **사업자등록 뒤, 약 1,000명:** 프리미엄과 함께 시작한다.
   - `/guide`에 AI 도구 안내 페이지를 두고, ElevenLabs·HeyGen·Synthesia부터 단다.
   - 요율이 확인되면 인프런도 단다.
   - 제휴 수익도 소득이므로 겸업 확인과 사업자등록 뒤에 받는다.
4. **지표가 생긴 뒤:** 기관 제안서.

## 출처
- AI 도구 제휴: [ElevenLabs 약관 요약](https://getreditus.com/affiliate-programs/elevenlabs), [ElevenLabs PartnerStack](https://market.partnerstack.com/page/elevenlabsinc), [HeyGen 파트너](https://www.heygen.com/en-ca/affiliate-program), [HeyGen 약관](https://www.heygen.com/affiliate-terms-conditions), [Descript(Lasso)](https://getlasso.co/affiliate/descript/), [AI 영상 제휴 비교](https://www.aistudios.com/best/best-ai-video-affiliate-programs-in-2026-compared), [AI 제휴 가이드](https://www.layer3labs.io/guides/best-ai-affiliate-programs), [Leonardo AI(RevShare)](https://www.revshare.so/programs/advertiser/leonardo-ai), [Framer 도움말](https://www.framer.com/help/articles/how-affiliate-links-work/), [Canva(Lasso)](https://getlasso.co/affiliate/canva/), [Envato(Referly)](https://www.referly.so/affiliate-programs/envato)
- 국내 강의: [인프런 마케팅 파트너스 안내](https://www.inflearn.com/course/temp_339805), [클래스101 크리에이터 헬프센터](https://docs.channel.io/creator/ko/articles/%ED%81%AC%EB%A6%AC%EC%97%90%EC%9D%B4%ED%84%B0-%EB%A9%A4%EB%B2%84%EC%8B%AD%EC%9D%80-%EC%96%B4%EB%96%BB%EA%B2%8C-%EC%84%A4%EC%A0%95%ED%95%B4%EC%9A%94-7d663ba2)
- 기관·공공: [부산시 보도자료](https://www.busan.go.kr/nbtnewsBU/1728111)
- 플랫폼 레퍼럴: [Handshake AI 약관](https://support.joinhandshake.com/hc/en-us/articles/34271833422871-Handshake-AI-Fellowship-Referral-Program-Terms-of-Service), [Braintrust AIR 약관](https://www.usebraintrust.com/air-referral-terms), [Outlier 블로그](https://outlier.ai/blog/why-referring-talented-contributors-to-outlier-benefits-everyone)
- 세금: [삼쩜삼 도움말(프리랜서 신고 의무)](https://help.3o3.co.kr/hc/ko/articles/57644729397017-%ED%94%84%EB%A6%AC%EB%9E%9C%EC%84%9C%EB%8A%94-%EB%AC%B4%EC%A1%B0%EA%B1%B4-%EC%A2%85%ED%95%A9%EC%86%8C%EB%93%9D%EC%84%B8-%EC%8B%A0%EA%B3%A0%ED%95%B4%EC%95%BC-%ED%95%A0%EA%B9%8C-%EC%95%88%ED%95%98%EB%A9%B4)
