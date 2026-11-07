/**
 * [확인 필요] "Open in ChatGPT / Claude" buttons that prefill the prompt
 * (spec §2.1-3). Neither service documents these URLs. What third-party
 * tools reported as of 2026-11-07:
 * - ChatGPT `?q=` prefills the input without sending it.
 * - Claude `/new?q=` reportedly stopped working around October 2025.
 * Both stay off until each one is tested by hand; enable them one at a time.
 */
export const PREFILL_ENABLED = {
  chatgpt: false,
  claude: false,
} as const;

const LINKS = [
  { key: "chatgpt", label: "ChatGPT에서 열기", base: "https://chatgpt.com/?q=" },
  { key: "claude", label: "Claude에서 열기", base: "https://claude.ai/new?q=" },
] as const;

export function aiPrefillLinks(
  prompt: string,
  enabled: Record<(typeof LINKS)[number]["key"], boolean> = { chatgpt: true, claude: true },
): { label: string; href: string }[] {
  const q = encodeURIComponent(prompt);
  return LINKS.filter((l) => enabled[l.key]).map((l) => ({ label: l.label, href: `${l.base}${q}` }));
}
