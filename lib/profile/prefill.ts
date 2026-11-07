/**
 * [확인 필요] "Open in ChatGPT / Claude" buttons that prefill the prompt
 * (spec §2.1-3). Whether these URLs still prefill, and how long a URL they
 * accept, has not been checked yet, so the buttons stay hidden and only the
 * copy button is shown. Set to true after testing both links by hand.
 */
export const PREFILL_LINKS_ENABLED = false;

export function aiPrefillLinks(prompt: string): { label: string; href: string }[] {
  const q = encodeURIComponent(prompt);
  return [
    { label: "ChatGPT에서 열기", href: `https://chatgpt.com/?q=${q}` },
    { label: "Claude에서 열기", href: `https://claude.ai/new?q=${q}` },
  ];
}
