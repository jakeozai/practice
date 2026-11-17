/**
 * (선택) AI 분석 원문 수집·이용 동의 (2026-11-17 user decision).
 *
 * Optional, off by default, asked where the answer is confirmed (onboarding).
 * With it, the whole pasted AI answer (spec summary and both resumes included)
 * is kept in profile_raw; without it, only the confirmed profile items are kept,
 * as before. Refusing changes nothing about the service; it can be withdrawn
 * any time on /account, which deletes what was kept.
 *
 * The four things the law asks to tell (개인정보 보호법 제15조 제2항) are below;
 * the privacy policy shows the same text. Bump the version when they change.
 */
export const RAW_CONSENT_VERSION = "2026-11-17";

export const RAW_CONSENT = {
  title: "(선택) AI 분석 원문 수집·이용 동의",
  items: "붙여넣은 AI 답변 전체 (스펙 요약, 한글·영어 이력서 내용 포함)",
  purpose: "더 정확한 일감 추천과 서비스 개선, 새 서비스 개발을 위한 분석·연구 (추천 AI 개발 포함)",
  retention: "동의를 철회하거나 탈퇴할 때까지",
  refusal: "동의하지 않아도 덕잡을 똑같이 쓸 수 있어요. 그때는 확인한 분석 항목만 저장해요. 내 정보에서 언제든 철회할 수 있어요.",
} as const;
