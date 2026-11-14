import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description: "이메일만 넣으면, 영상·디자인·개발·AI 작업까지 전 세계 단기 일감 중 나에게 맞는 3개를 매일 아침 한국어로 보내드려요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <header>
          <div className="mx-auto flex max-w-2xl items-center px-5 py-4">
            <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
              {/* eslint-disable-next-line @next/next/no-img-element -- small static SVG logo */}
              <img src="/duck.svg" alt="" width={26} height={30} />
              {BRAND.name}
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8">{children}</main>
        <footer className="py-8 text-center text-xs text-muted">
          <Link href="/privacy" className="font-semibold underline underline-offset-2">
            개인정보 처리방침
          </Link>
          <span className="mx-2">·</span>
          {BRAND.name}은 공고 요약과 원문 링크만 보내요. 지원은 원문에서 직접 해요.
        </footer>
      </body>
    </html>
  );
}
