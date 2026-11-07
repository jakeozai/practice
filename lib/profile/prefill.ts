/**
 * "Analyze with my AI" buttons. Clicking one copies the prompt to the
 * clipboard AND opens the assistant, so the flow works whether or not the
 * site honours a prefill parameter:
 * - ChatGPT `?q=` prefills the message (third-party reports, 2026)
 * - Claude `/new?q=` was reported to stop working in Oct 2025; harmless if ignored
 * - Gemini has no prefill parameter; the user pastes
 */
export type AiAssistant = { id: "chatgpt" | "claude" | "gemini"; label: string; prefills: boolean };

export const AI_ASSISTANTS: AiAssistant[] = [
  { id: "chatgpt", label: "ChatGPT", prefills: true },
  { id: "claude", label: "Claude", prefills: true },
  { id: "gemini", label: "Gemini", prefills: false },
];

export function assistantUrl(id: AiAssistant["id"], prompt: string): string {
  const q = encodeURIComponent(prompt);
  switch (id) {
    case "chatgpt":
      return `https://chatgpt.com/?q=${q}`;
    case "claude":
      return `https://claude.ai/new?q=${q}`;
    case "gemini":
      return "https://gemini.google.com/app";
  }
}
