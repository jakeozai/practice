"use client";

import { useFormStatus } from "react-dom";

/** Shows that the click registered: confirming takes a second or two. */
export function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full text-lg">
      {pending ? "확인하는 중…" : "시작하기"}
    </button>
  );
}
