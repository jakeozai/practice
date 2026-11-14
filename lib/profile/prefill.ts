/**
 * "Open my AI" buttons. They open an empty chat in a new tab and the person
 * pastes the prompt they copied themselves (2026-11-14): a prompt that
 * arrives pre-filled through a link makes Claude show a warning about
 * malicious content, which scares people off, and no site can turn it off.
 */
export type AiAssistant = { id: "chatgpt" | "claude" | "gemini"; label: string };

export const AI_ASSISTANTS: AiAssistant[] = [
  { id: "chatgpt", label: "ChatGPT" },
  { id: "claude", label: "Claude" },
  { id: "gemini", label: "Gemini" },
];

export function assistantUrl(id: AiAssistant["id"]): string {
  switch (id) {
    case "chatgpt":
      return "https://chatgpt.com/";
    case "claude":
      return "https://claude.ai/new";
    case "gemini":
      return "https://gemini.google.com/app";
  }
}
