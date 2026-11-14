/** Operator pages keep their light, dense tables inside the dark site. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="theme-light -mx-5 rounded-[20px] px-5 py-6">{children}</div>;
}
