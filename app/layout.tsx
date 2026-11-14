import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const pretendard = localFont({
  src: "./fonts/pretendard-kr.woff2",
  weight: "45 930",
  display: "swap",
  variable: "--font-pretendard",
});

const jetbrains = localFont({
  src: [
    { path: "./fonts/jetbrains-mono-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/jetbrains-mono-latin-600-normal.woff2", weight: "600" },
  ],
  display: "swap",
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description: "매일 아침 6시, 엄선한 해외 단기 AI 일감 5개를 한국어로 정리해 메일로 보내드려요. 무료 · 언제든 해지.",
};

export const viewport: Viewport = {
  themeColor: "#0D0D0C",
  colorScheme: "dark",
};

/** Fonts and colors only: the landing page draws its own frame, the other pages use app/(site)/layout.tsx. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pretendard.variable} ${jetbrains.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
