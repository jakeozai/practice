import Link from "next/link";
import { BRAND } from "@/lib/brand";

/** Frame for every page but the landing page: the wordmark, the page, the legal links. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--bg)]">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-5 py-2.5">
          <Link href="/" aria-label={`${BRAND.name} 홈`} className="inline-flex min-h-[44px] items-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG wordmark */}
            <img src="/brand/duckjob-wordmark-ondark.svg" alt="duckjob" width={88} height={26} className="block h-[26px] w-[88px]" />
          </Link>
          <Link href="/account" className="text-sm font-medium text-[var(--ink-2)] hover:text-white hover:underline">
            내 정보
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">{children}</main>
      <footer className="mx-auto w-full max-w-2xl border-t border-[var(--line)] px-5 pb-10 pt-6 text-xs leading-relaxed text-muted">
        <Link href="/privacy" className="font-semibold underline">
          개인정보 처리방침
        </Link>
        <span className="mx-2">·</span>
        <Link href="/guide" className="font-semibold underline">
          해외 일감 이용 안내
        </Link>
        <span className="mx-2">·</span>
        <Link href="/account" className="font-semibold underline">
          내 정보·해지
        </Link>
        <span className="mx-2">·</span>
        {BRAND.name}은 공고 요약과 원문 링크만 보내요. 지원은 원문에서 직접 해요.
      </footer>
    </>
  );
}
