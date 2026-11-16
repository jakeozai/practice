/**
 * The example mail on the landing page, also used to fill the "이런 메일이
 * 가요" example on the onboarding finish screen when fewer real candidates
 * fit yet.
 */
export type ExampleRow = { title: string; meta: string; pay: string; kind: "fit" | "try" };

/**
 * One made-up subscriber (a video editor), laid out like the real mail
 * (2026-11-16): three fits from their profile, then two "AI로 도전" tries.
 * All overseas, like the real supply.
 */
export const EXAMPLE_JOBS: ExampleRow[] = [
  { kind: "fit", title: "숏폼 영상 5편 편집", meta: "영상 · 견적 입찰", pay: "$100" },
  { kind: "fit", title: "유튜브 영상 한국어 자막", meta: "영상 · 해외 원격", pay: "$90" },
  { kind: "fit", title: "AI 영상 결과물 평가", meta: "AI 평가 · 주 10시간부터", pay: "시간당 $25" },
  { kind: "try", title: "카페 로고 시안 3종", meta: "로고·그래픽 · 해외 원격", pay: "$120" },
  { kind: "try", title: "제품 3D 모델 1개", meta: "3D · 해외 원격", pay: "$150" },
];
