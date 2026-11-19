/**
 * The example mail on the landing page, also used to fill the "이런 메일이
 * 가요" example on the onboarding finish screen when fewer real candidates
 * fit yet.
 */
export type ExampleRow = { title: string; meta: string; pay: string; kind: "fit" | "try" };

/**
 * One made-up subscriber, the most common one: an office worker (경영지원·사무직)
 * who uses ChatGPT at work (2026-11-17 user decision). Laid out like the real
 * mail: three AI jobs their work experience qualifies them for, then two
 * "AI로 도전" document jobs. All are kinds of postings in the real supply
 * (Productive Playhouse, Invisible, Appen, Freelancer.com, 2026-11-16).
 */
export const EXAMPLE_JOBS: ExampleRow[] = [
  { kind: "fit", title: "한국어 AI 챗봇 답변 평가", meta: "AI 평가 · 영어는 읽기 수준", pay: "시간당 $20" },
  { kind: "fit", title: "관리자 경험으로 AI 답변 평가", meta: "AI 트레이너 · 업무 경력이 자격", pay: "시간당 $20~100" },
  { kind: "fit", title: "AI 번역 결과 품질 평가", meta: "AI 평가 · 하루 2시간부터", pay: "건별 지급" },
  { kind: "try", title: "AI로 PDF 표를 엑셀로 정리", meta: "AI 문서 작업 · 견적 입찰", pay: "$140~420" },
  { kind: "try", title: "AI로 영업 제안서 PPT 만들기", meta: "AI 문서 작업 · 견적 입찰", pay: "£250~750" },
];
