"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, exact, tab, children }: { href: string; exact?: boolean; tab?: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(href + "/");
  const look = tab
    ? `flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-bold leading-none ${active ? "text-primary-dark" : "text-muted"}`
    : `flex min-h-12 shrink-0 items-center gap-3 rounded-2xl px-4 py-2 font-bold leading-tight transition-colors ${active ? "bg-accent-soft text-primary-dark" : "text-ink hover:bg-soft"}`;
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={look}>
      {children}
    </Link>
  );
}
