import { logout } from "@/app/kiru/actions";
import { LogOut } from "lucide-react";
import { Logo } from "./Logo";
import { NavLink } from "./NavLink";

export type NavItem = { href: string; label: string; icon: React.ReactNode; exact?: boolean };

/** Sidebar on desktop, a scrollable top bar on phones. */
export function Shell({
  nav,
  subtitle,
  aside,
  user,
  children,
}: {
  nav: NavItem[];
  subtitle?: string;
  aside?: React.ReactNode;
  user: { name: string; note: string };
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-6 p-3 sm:p-6 lg:flex-row">
      <a href="#main" className="sr-only focus:not-sr-only">
        Негізгі мазмұнға өту
      </a>
      <aside className="card flex shrink-0 flex-col gap-4 p-4 lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)] lg:w-64 lg:p-5">
        <div className="px-1 pt-1">
          <Logo subtitle={subtitle} />
        </div>
        <nav aria-label="Негізгі мәзір" className="flex flex-wrap gap-1 lg:flex-col">
          {nav.map((n) => (
            <NavLink key={n.href} href={n.href} exact={n.exact}>
              <span className="shrink-0 [&>svg]:size-5" aria-hidden="true">
                {n.icon}
              </span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3">
          {aside && <div className="hidden lg:block">{aside}</div>}
          <div className="flex items-center gap-3 rounded-2xl bg-soft p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#dbe8fb] font-bold text-primary" aria-hidden="true">
              {user.name[0]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold leading-tight">{user.name}</span>
              <span className="block text-xs text-muted">{user.note}</span>
            </span>
            <form action={logout}>
              <button className="grid size-11 place-items-center rounded-full text-muted hover:bg-white hover:text-ink" aria-label="Шығу">
                <LogOut className="size-5" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main id="main" className="min-w-0 flex-1">
        {children}
      </main>
    </div>
  );
}
