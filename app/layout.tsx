import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI잡5 — 매일 아침 나에게 맞는 AI 일감 3개",
  description: "이메일 하나로 가입하면, 내 AI가 정리한 프로필로 매일 아침 원격 AI 일감 3개를 보내드려요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
            <Link href="/" className="text-base font-bold tracking-tight">
              AI잡5 <span className="text-xs font-normal text-zinc-400">가칭</span>
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">{children}</main>
        <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-400">
          지원은 원문 플랫폼에서 직접 해요. AI잡5는 공고 요약과 원문 링크만 보내드려요.
        </footer>
      </body>
    </html>
  );
}
