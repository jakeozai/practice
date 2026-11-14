지금까지의 대화와 메모리로 나를 분석해서 아래 네 가지를 순서대로 만들어줘. 나에게 질문하지 말고 바로 분석해(나에 대해 아는 게 거의 없을 때만 짧은 질문을 한 번에 최대 3개).

[1] 덕잡 프로필 (코드 블록)
[2] 내 스펙 요약
[3] 한글 이력서 PDF
[4] 영어 이력서 PDF

덕잡은 이 프로필만 보고 매일 아침 나에게 맞는 원격 단기 일감(풀타임 제외)을 골라 줘. 그러니 정확하고 구체적으로 써줘.

지킬 것
- 직업·전공보다 지금 실제로 하는 일이 기준이야. AI 도구로 만들어 본 것, 공부하며 만드는 것도 넣고 어떤 도구인지 같이 써.
- 근거 없는 경력·학위·자격증·숫자는 절대 만들지 마. 모르면 비워 둬("", [], null).
- 건강, 재정(희망 시급 제외), 가족, 정치·종교, 주소, 신분증 번호, 지금 다니는 회사 이름은 넣지 마.
- 코드 블록은 [1] 하나뿐이야. 스펙 요약과 이력서 쪽에는 코드 블록을 쓰지 마.
- 내가 고칠 점을 말하면 반영해서 [1]을 처음부터 다시 출력해.

[1] 덕잡 프로필
아래 표식 두 줄과 JSON을 통째로 코드 블록 하나에 넣어 줘. | 로 나뉜 값은 하나만 골라.

<<AIJOB5_PROFILE_V1>>
{
  "version": 1,
  "country": "KR",
  "languages": [{"code": "ko", "level": "native"}, {"code": "en", "level": "none|reading|conversational|business|native"}],
  "fields": ["돈 받고 할 수 있는 일, 잘하는 순서로 최대 5개"],
  "skills": ["써 본 도구·기술, AI 도구 포함 최대 10개"],
  "domain_expertise": ["깊이 아는 전문 분야, 없으면 빈 배열"],
  "experience_summary_ko": "실제로 해 온 일 2~3문장",
  "job_keywords": ["해외 공고 검색어 8~15개, 영어 2~3단어"],
  "portfolio_ko": ["보여줄 수 있는 개인 작업물·채널·앱, 최대 5개"],
  "weekly_hours": 0,
  "preferred_time": "morning|daytime|evening|night|any",
  "min_hourly_usd": null,
  "has_desktop": true,
  "avoid": ["하기 싫은 일, 예: 음성 녹음, 얼굴 촬영"],
  "notes_ko": "덕잡이 먼저 추천하면 좋을 일과 이유 1~2문장"
}
<<END_AIJOB5_PROFILE>>

- fields는 공고 제목처럼 구체적으로: "유튜브 영상 편집", "영→한 번역", "로고 디자인", "Claude Code로 만드는 웹앱 개발". "IT"·"콘텐츠" 같은 넓은 말은 쓰지 마.
- job_keywords는 "video editing", "korean translation", "logo design"처럼. "AI", "design" 같은 한 단어는 쓰지 마.
- portfolio_ko에 회사 안에서 만든 자료는 넣지 마.

[2] 내 스펙 요약 (5줄 이내, 보통 글로)
잘하는 일, AI로 할 수 있는 일, 언어 수준, 일할 수 있는 시간, 먼저 노려 볼 일감.

[3] 한글 이력서 PDF (이력서_한글.pdf)
크몽·숨고 같은 국내 프리랜서 마켓용 1페이지. 이름·연락처(모르면 [이름], [이메일] 같은 자리표시자) → 한 줄 소개 → 할 수 있는 일 → 경력 → 학력 → 작업물 → 가능한 시간.

[4] 영어 이력서 PDF (Resume_EN.pdf)
Freelancer.com, Mercor 같은 해외 플랫폼용 1페이지. Name·Contact → Summary 3줄 → Languages(수준) → Skills → Experience → Education → Availability(주당 시간, 한국 시간대).

PDF 파일을 만들 수 없으면 내용을 보여 주고 PDF로 저장하는 방법을 한 줄로 알려줘.
