/**
 * (선택) 기업 제안 받기 — AI 분석 원문 수집·이용 동의 (2026-11-17 user decisions).
 *
 * Shown as a benefit, not a legal form: "기업이 먼저 일감을 제안해요 (준비 중) [켜기]".
 * The line right under it still says plainly what turning it on keeps (the whole
 * pasted AI answer, résumés included), and 자세히 보기 lists the four things the
 * law asks to tell (개인정보 보호법 제15조 제2항). Off by default; refusing
 * changes nothing; turning it off on /account deletes what was kept.
 *
 * Company offers are not live yet. When they are, any hand-over of a résumé or
 * contact to a company is asked separately, per offer (제17조) — this switch
 * never covers that. Bump the version when the text below changes.
 */
export const RAW_CONSENT_VERSION = "2026-11-17.3";

export const RAW_CONSENT = {
  benefit: "기업이 먼저 일감을 제안해요",
  badge: "준비 중",
  /** Visible right under the switch: what is kept and every use of it (the law asks for clear notice of important parts). */
  pitch:
    "켜 두면 서비스가 열리는 대로 내 분석에 맞는 기업 제안을 먼저 받아요. 이를 위해 AI 답변 원문(이력서 포함)을 보관하고, 추천과 서비스 개발(추천 AI 포함)에도 써요. 만 14세 이상만 켤 수 있어요.",
  title: "(선택) 기업 제안 받기와 AI 분석 원문 수집·이용 동의",
  items: "붙여넣은 AI 답변 전체 (스펙 요약, 한글·영어 이력서 내용 포함)",
  purpose:
    "기업 일감 제안 연결(준비 중), 더 정확한 일감 추천과 서비스 개선, 새 서비스 개발을 위한 분석·연구(추천 AI 개발 포함)",
  retention: "끄거나(동의 철회) 탈퇴할 때까지",
  refusal: "켜지 않아도 덕잡을 똑같이 쓸 수 있어요. 그때는 확인한 분석 항목만 저장해요. 내 정보에서 언제든 끌 수 있어요.",
  sharing: "기업에 내 이력서나 연락처를 넘겨야 할 때는 제안마다 따로 물어보고, 내가 수락한 경우에만 넘겨요.",
} as const;
