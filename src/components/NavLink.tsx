"use client";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

/** Menu items prefetch their whole page (not just the skeleton), so a tap shows it at once. */
export function NavLink({ href, exact, tab, children }: { href: string; exact?: boolean; tab?: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(href + "/");
  const look = tab
    ? `group relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-bold leading-none ${active ? "text-primary-dark" : "text-muted"}`
    : `relative flex min-h-12 shrink-0 items-center gap-3 rounded-2xl px-4 py-2 font-bold leading-tight transition-[background-color,color,translate] ${active ? "bg-primary text-on-color shadow-[0_3px_0_var(--color-primary-edge)]" : "text-ink hover:translate-x-1 hover:bg-accent-soft hover:text-primary-dark"}`;
  return (
    <Link href={href} prefetch data-nav="tab" aria-current={active ? "page" : undefined} className={look}>
      {children}
      <Pending />
    </Link>
  );
}

/** Answers the tap at once, before the server has replied: a bar runs under the clicked item. */
function Pending() {
  const { pending } = useLinkStatus();
  return pending ? <span className="nav-pending absolute inset-x-4 bottom-1 h-1 overflow-hidden rounded-full bg-gold/30" aria-hidden="true" /> : null;
}
