"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, exact, tab, children }: { href: string; exact?: boolean; tab?: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(href + "/");
  const look = tab
    ? `group flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-bold leading-none ${active ? "text-primary-dark" : "text-muted"}`
    : `flex min-h-12 shrink-0 items-center gap-3 rounded-2xl px-4 py-2 font-bold leading-tight transition-[background-color,color,translate] ${active ? "bg-linear-120 from-primary to-violet text-on-color shadow-[0_10px_20px_-12px_var(--color-primary)]" : "text-ink hover:translate-x-1 hover:bg-accent-soft hover:text-primary-dark"}`;
  return (
    <Link href={href} transitionTypes={["nav-tab"]} aria-current={active ? "page" : undefined} className={look}>
      {children}
    </Link>
  );
}
