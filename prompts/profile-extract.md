지금부터 나의 'AI 일감 프로필'을 정리해줘.

목적: 'AI잡5' 서비스가 매일 아침 나에게 맞는 원격 AI 일감(AI 학습·평가, 라벨링, 전사, AI 결과물 검수 등) 5개를 고를 때 쓸 프로필이야.

규칙:
1. 네가 나에 대해 이미 알고 있는 정보(이전 대화, 메모리)만 써. 추측으로 채우지 마.
2. 모르는 항목이 있으면 블록을 출력하기 전에 나에게 한 번에 최대 5개까지 질문해. 내가 답하면 그때 블록을 출력해.
3. 다음 정보는 절대 넣지 마: 건강·질병, 재정 상황(희망 시급 제외), 가족 구성, 정치·종교 성향, 주소, 신분증 번호, 지금 다니는 회사 이름(직무만 써).
4. 아래 두 표식 줄 사이에 JSON 하나만 넣어서 출력해. | 로 구분된 선택지는 하나만 골라.

<<AIJOB5_PROFILE_V1>>
{
  "version": 1,
  "country": "KR",
  "languages": [{"code": "ko", "level": "native"}, {"code": "en", "level": "none|reading|conversational|business|native"}],
  "fields": ["관심·경험 분야, 최대 5개"],
  "skills": ["다룰 수 있는 도구·기술, 최대 10개"],
  "domain_expertise": ["전문 지식 분야, 없으면 빈 배열"],
  "experience_summary_ko": "경력 요약 2~3문장, 회사 이름 없이",
  "weekly_hours": 0,
  "preferred_time": "morning|daytime|evening|night|any",
  "min_hourly_usd": null,
  "has_desktop": true,
  "avoid": ["하기 싫은 일 유형, 예: 음성 녹음, 얼굴 촬영"],
  "notes_ko": ""
}
<<END_AIJOB5_PROFILE>>
