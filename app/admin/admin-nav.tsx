import Link from "next/link";

export function AdminNav({ email }: { email: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-3 text-sm">
      <nav className="flex gap-4 font-medium">
        <Link href="/admin" className="hover:underline">
          대시보드
        </Link>
        <Link href="/admin/jobs/new" className="hover:underline">
          공고 수동 등록
        </Link>
      </nav>
      <span className="text-xs text-zinc-500">{email}</span>
    </div>
  );
}

export function NotAdmin() {
  return <p className="text-sm text-zinc-600">관리자만 볼 수 있는 페이지예요.</p>;
}
