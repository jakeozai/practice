/**
 * The example mail on the landing page, also used to fill the "이런 메일이
 * 가요" example on the onboarding finish screen when fewer than five real
 * candidates fit yet.
 */
export type ExampleRow = { title: string; meta: string; pay: string };

export const EXAMPLE_JOBS: ExampleRow[] = [
  { title: "상세페이지 카피 5종", meta: "AI로 약 2시간 · 국내", pay: "15만 원" },
  { title: "영어 인터뷰 한국어 자막", meta: "AI로 약 1.5시간 · 해외", pay: "$90" },
  { title: "설문 800건 분류·요약", meta: "AI로 약 3시간 · 국내", pay: "20만 원" },
  { title: "블로그 원고 4편", meta: "AI로 약 2시간 · 국내", pay: "12만 원" },
  { title: "상품 썸네일 10장", meta: "AI로 약 1시간 · 국내", pay: "8만 원" },
];
