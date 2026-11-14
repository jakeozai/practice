/**
 * The example mail on the landing page, also used to fill the "이런 메일이
 * 가요" example on the onboarding finish screen when fewer than five real
 * candidates fit yet.
 */
export type ExampleRow = { title: string; meta: string; pay: string };

/** All overseas, like the real supply (2026-11-14: every source is an overseas company or platform). */
export const EXAMPLE_JOBS: ExampleRow[] = [
  { title: "유튜브 영상 한국어 자막", meta: "AI로 약 1.5시간 · 해외 원격", pay: "$90" },
  { title: "AI 답변 한국어 평가", meta: "주 10시간부터 · 해외 원격", pay: "시간당 $25" },
  { title: "카페 로고 시안 3종", meta: "AI로 약 2시간 · 해외 원격", pay: "$120" },
  { title: "제품 3D 모델 1개", meta: "AI로 약 3시간 · 해외 원격", pay: "$150" },
  { title: "숏폼 영상 5편 편집", meta: "AI로 약 2시간 · 해외 원격", pay: "$100" },
];
