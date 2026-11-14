/**
 * 덕잡 mail colors and fonts, shared by every template: the landing page's
 * B안 (2026-11-14) — a near-black dawn with light paper cards, one orange
 * accent that always carries near-black text.
 */
export const mailFont =
  '"Pretendard", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", "Segoe UI", sans-serif';
export const mailMono = '"JetBrains Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

export const mailColor = {
  /** Page behind everything. */
  page: "#0D0D0C",
  /** Dark boxes on the page (tips, reminders). */
  surface: "#1A1A18",
  line: "#23231F",
  /** Text on the page. */
  ink: "#F4F3EF",
  inkSoft: "#C9C7C1",
  muted: "#A8A6A0",
  accent: "#FF6B3D",
  onAccent: "#111111",
  /** Light cards (the jobs). */
  paper: "#F4F3EF",
  paperInk: "#111111",
  paperMuted: "#5E5C57",
  paperLine: "#E2E0DA",
  paperWell: "#EAE8E2",
} as const;

/** Assets every mail shows (PNG: mail apps don't render SVG). */
export function mailAssets(appUrl: string) {
  return {
    wordmarkUrl: `${appUrl}/brand/duckjob-wordmark-ondark-240.png`,
    iconUrl: `${appUrl}/brand/duckjob-appicon-96.png`,
  };
}
