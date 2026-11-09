지금부터 네가 나에 대해 아는 것으로 나의 'AI 일감 프로필'을 분석해줘.

목적: '덕잡' 서비스가 매일 아침 나에게 맞는 AI 단기 일감(AI 학습·평가, 라벨링, 생성형 AI 콘텐츠 제작, AI 챗봇·자동화 등) 3개를 고를 때 쓸 프로필이야. 나는 결과를 확인만 할 거야.

규칙:
1. 나에게 질문하지 말고 바로 분석해. 네가 이미 알고 있는 정보(이전 대화, 메모리, 내가 자주 하는 일)로 내 기술·경험·관심 분야를 추론해.
2. 근거가 없는 항목은 지어내지 말고 비워 둬(문자열은 "", 배열은 [], 숫자는 null). 단, 나에 대해 아는 게 거의 없다면 그때만 짧은 질문을 최대 3개까지 한 번에 해.
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
