"use client";

import { useActionState, useRef, useState } from "react";
import { requestMagicLink, type MagicLinkState } from "./actions";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INVALID = "이메일 주소를 다시 확인해 주세요.";

/**
 * The landing page's pill form (hero and final call to action). Checks the
 * address in the browser first, then asks the server for the confirmation
 * mail, which carries the prompt to paste into the person's own AI.
 */
export function SubscribeForm({ id, next, notice, center = false }: { id: string; next?: string; notice?: string; center?: boolean }) {
  const [state, action, pending] = useActionState<MagicLinkState, FormData>(requestMagicLink, { status: "idle" });
  const [invalid, setInvalid] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  if (state.status === "sent") {
    return (
      <p
        role="status"
        style={{
          margin: center ? "36px auto 0" : "32px 0 0",
          maxWidth: 520,
          padding: "18px 22px",
          borderRadius: 20,
          background: "var(--surface)",
          fontSize: 16,
          lineHeight: 1.65,
          textAlign: "left",
        }}
      >
        <strong>확인 메일을 보냈어요.</strong> 메일 속 프롬프트를 평소 쓰는 AI에 붙여넣어 주세요.
      </p>
    );
  }

  const error = invalid ? INVALID : state.status === "error" ? state.message : null;
  const errId = `${id}-err`;

  return (
    <div>
      {notice && (
        <p role="alert" style={{ margin: center ? "28px auto 0" : "28px 0 0", maxWidth: 520, fontSize: 14, fontWeight: 700, color: "var(--error)" }}>
          {notice}
        </p>
      )}
      <form
        action={action}
        noValidate
        className="lp-pillform"
        onSubmit={(e) => {
          if (!EMAIL.test(input.current?.value.trim() ?? "")) {
            e.preventDefault();
            setInvalid(true);
            input.current?.focus();
          }
        }}
        style={{
          margin: center ? "36px auto 0" : notice ? "12px 0 0" : "32px 0 0",
          maxWidth: 520,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          padding: 6,
          borderRadius: 999,
          background: "var(--surface)",
          boxShadow: "inset 0 0 0 1px var(--line-2)",
          textAlign: "left",
        }}
      >
        {next && <input type="hidden" name="next" value={next} />}
        {/* Honeypot: hidden from people, filled by naive bots. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" hidden aria-hidden="true" />
        <label htmlFor={id} className="sr-only">
          이메일 주소
        </label>
        <input
          ref={input}
          id={id}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="이메일 주소"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          onInput={() => setInvalid(false)}
          style={{
            flex: "1 1 200px",
            minWidth: 0,
            height: 50,
            boxSizing: "border-box",
            padding: "0 18px",
            border: 0,
            borderRadius: 999,
            background: "transparent",
            color: "var(--ink)",
            fontFamily: "inherit",
            fontSize: 16,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={pending}
          className="lp-btn"
          style={{
            flex: "0 0 auto",
            height: 50,
            padding: "0 24px",
            border: 0,
            borderRadius: 999,
            background: "var(--accent)",
            color: "var(--on-accent)",
            fontFamily: "inherit",
            fontSize: 16,
            fontWeight: 800,
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? "보내는 중…" : "무료로 구독하기"}
        </button>
      </form>
      {error && (
        <p id={errId} role="alert" style={{ margin: center ? "12px 0 0" : "10px 0 0 8px", fontSize: 14, fontWeight: 700, color: "var(--error)" }}>
          {error}
        </p>
      )}
      <p style={{ margin: center ? "14px 0 0" : "14px 0 0 8px", fontSize: 14, color: "var(--muted)" }}>무료 · 하루 5개 공고 · 언제든 해지</p>
    </div>
  );
}
