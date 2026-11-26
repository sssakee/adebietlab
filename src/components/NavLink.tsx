"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, exact, children }: { href: string; exact?: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(href + "/");
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-12 shrink-0 items-center gap-3 rounded-2xl px-4 py-2 font-bold leading-tight transition-colors ${
        active ? "bg-[#e4efff] text-primary" : "text-ink hover:bg-soft"
      }`}
    >
      {children}
    </Link>
  );
}
