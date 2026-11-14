/** Service name and public contact, in one place (spec §16: name still provisional). */
export const BRAND = {
  name: "덕잡",
  tagline: "매일 아침 6시, 해외 AI 일감 5개",
} as const;

/**
 * Public contact for the privacy policy and mail footers (개인정보 보호법 제30조 제1항 제6호).
 * Set CONTACT_EMAIL once the service domain exists; until then pages say it is being prepared.
 */
export function contactEmail(): string | null {
  const v = process.env.CONTACT_EMAIL?.trim();
  return v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
}
