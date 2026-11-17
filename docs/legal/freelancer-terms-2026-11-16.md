# Freelancer.com 약관: 상업적 이용 점검 (2026-11-16)

11/14에는 API 약관만 확인했다(`docs/status-2026-11-14.md`). 오늘은 API 약관과, API 약관이 참조로 포함하는 일반 이용약관(User Agreement)을 원문으로 다시 읽었다.

## API 약관 (freelancer.com/about/apiterms, 2017-12-21 개정)
- 3조 라이선스: API로 앱·웹사이트·서비스를 만들고 연동할 수 있다.
- 4조
  - "**You may charge for your Application.** However, you may not sell, rent, lease, sublicense, redistribute, or syndicate access to the API."
    → 앱을 유료로 운영하는 것은 명시적으로 허용된다. API 접근 자체를 되파는 것은 금지다.
  - "You may not use the API to replicate or compete with the services offered by Freelancer."
  - "You will not rely on the functioning or correct function of the API in the conduct of your ordinary course business."
- 5조: 캐시는 성능 목적만, 24시간 안에 새로고침, 강한 암호화로 저장·전송한다. 허용 범위 밖의 복사·저장은 금지다.
- 1조: User Agreement 등 다른 약관을 참조로 포함한다. 그래서 아래 일반 이용약관도 함께 지켜야 한다.

## 일반 이용약관 (freelancer.com/about/terms, 2025-06-05 개정)
- **4조 Using Freelancer:** 다음을 하면 안 된다.
  > "download and aggregate listings from our website for display with listings from other websites without our express written permission"

  덕잡 메일은 Freelancer 의뢰를 Greenhouse·Lever·Jobicy 등의 공고와 함께 보여 준다. 문언상 이 조항에 해당한다.
- **33조 Access and Interference**
  > "You agree that you will not use any robot, spider, scraper or other automated means to access the Website via any means, including for the avoidance of doubt access to our API or application programming interface, for any purpose without our express written permission."

  같은 조에 "copy, reproduce, modify, create derivative works from, distribute, or publicly display any content ... without the prior express written permission"도 있다. 한국어 요약은 파생물로 볼 수 있다.

## 판단
- **유료화 자체는 API 약관이 허용한다.** 유료 앱 운영은 명시적으로 허용되고, 광고·스폰서를 금지하는 조항은 찾지 못했다.
- **유료화와 별개로, 지금 방식에도 서면 허락이 필요하다.** 일반 이용약관 4조와 33조 때문이다. API 약관의 라이선스와 긴장 관계가 있지만, 둘 다 적용되는 계약이라 문언상 허락을 받는 것이 안전하다.
- Freelancer는 언제든 API 이용을 끊을 수 있다. API 약관은 이 API에 사업을 의존하지 말라고 적어 둔다.
- 창작·개발 일감(영상·디자인·3D·웹)은 거의 전부 Freelancer에서 온다(`docs/legal/overseas-gig-legal-check-2026-11-14.md`). 허락을 받지 못하면 C안의 창작 일감 대부분이 사라진다.
- 할 일
  1. 아래 메일로 서면 허락을 요청한다.
  2. 허락을 받을 때까지 Freelancer 공고가 들어간 메일에는 유료화·광고를 붙이지 않는다.
  3. 허락 전까지 계속 보낼지는 사용자가 정한다.

## 허락 요청 메일 초안 (Freelancer 개발자 포털 문의 또는 고객지원으로)

Subject: Request for written permission – Korean-language job digest using the Freelancer API (duckjob.app)

Hello Freelancer team,

I run 덕잡 (www.duckjob.app), a free daily email for people in South Korea who look for remote freelance work. Each morning a subscriber receives up to five openings that match their skills. Each opening has a short Korean summary and a link to the original page.

We read open projects from your public Projects API (projects/0.1/projects/active) with 47 keyword searches, once a day.

How we handle Freelancer data:
- We show a short Korean summary that we write, the budget, and a link to the project on Freelancer.com. We do not show client details, bids or reviews.
- Every bid and hire happens on Freelancer.com. We have no bidding, messaging or payment features.
- Cached data is refreshed at least every 24 hours. Projects that are no longer returned by the API are deleted from our database. Data is stored encrypted.

Your User Agreement (sections 4 and 33) asks for express written permission to access the API by automated means and to show listings together with listings from other websites. Our email also includes openings from company career pages, so we are writing to ask for that permission.

We may later offer an optional paid tier (for example, more openings per day). Please let us know whether that is acceptable, and whether your affiliate program would apply to links in our email.

If you would prefer that we stop, we will remove all Freelancer data within 24 hours.

Thank you,
[이름]
덕잡 (www.duckjob.app) · everydayfriday247@gmail.com

## 발송 기록 (2026-11-17)

- support@freelancer.com으로 보냈다. 이 주소는 freelancer.com/contact에 공식 연락처로 나와 있고, API 허락 전용 주소는 따로 없다. Resend 상태는 delivered.
- 보낸 사람은 `duckjob <hello@duckjob.app>`이다. 답장과 숨은 참조는 문의 주소(everydayfriday247@gmail.com)로 받고, 운영자 메일로도 숨은 참조를 보냈다.
- 초안과 달라진 점:
  - 서명을 "duckjob"으로 했다.
  - 수익화 문단에 "clearly labelled sponsored listings"를 더했다. 스폰서 공고를 붙일 계획이 있어서다.
- 회신이 오면 이 문서에 붙이고, 허락 범위에 맞춰 CLAUDE.md 규칙 12를 고친다.
- 2주 안에 답이 없으면 freelancer.com/support의 문의 양식으로 한 번 더 보낸다.
