import { logout } from "@/app/kiru/actions";
import { LogOut } from "lucide-react";
import { Logo } from "./Logo";
import { NavLink } from "./NavLink";
import { PageTransition } from "./PageTransition";
import { SoundToggle } from "./Sfx";
import { MusicToggle } from "./Music";
import { Tour, TourButton, type TourStep } from "./Tour";

export type NavItem = { href: string; label: string; short?: string; icon: React.ReactNode; exact?: boolean };

/** Sidebar on desktop; on phones a compact top bar and a bottom tab bar. */
export function Shell({
  nav,
  subtitle,
  aside,
  user,
  tour,
  floating,
  children,
}: {
  nav: NavItem[];
  subtitle?: string;
  aside?: React.ReactNode;
  user: { name: string; note: string };
  tour: { key: string; steps: TourStep[] };
  /** Fixed-position extras (the chat). Outside the page wrapper: its entry animation would pin them to the page instead of the screen. */
  floating?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4 p-3 sm:gap-6 sm:p-6 lg:flex-row">
      <a href="#main" className="sr-only focus:not-sr-only">
        Негізгі мазмұнға өту
      </a>
      {/* Phone: one compact bar on top, navigation in a thumb-reach bar at the bottom. */}
      <aside className="card flex shrink-0 items-center justify-between gap-3 p-3 lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)] lg:w-64 lg:flex-col lg:items-stretch lg:justify-start lg:gap-4 lg:p-5">
        <div className="min-w-0 px-1 lg:pt-1">
          <Logo subtitle={subtitle} />
        </div>
        <nav aria-label="Негізгі мәзір" className="hidden flex-col gap-1 lg:flex">
          {nav.map((n) => (
            <NavLink key={n.href} href={n.href} exact={n.exact}>
              <span className="wiggle bounce shrink-0 [&>svg]:size-5" aria-hidden="true">
                {n.icon}
              </span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-1 lg:mt-auto lg:flex-col lg:items-stretch lg:gap-3">
          {aside && <div className="hidden lg:block">{aside}</div>}
          {/* Help, sounds and music: one row of icons (names in tooltips) so the sidebar fits a laptop screen. */}
          <div className="flex items-center gap-1 lg:justify-around [&_span]:sr-only">
            <TourButton storageKey={tour.key} />
            <SoundToggle />
            <MusicToggle />
          </div>
          <div className="flex items-center gap-3 rounded-2xl lg:bg-soft lg:p-3">
            <span className="hidden size-10 shrink-0 place-items-center rounded-full bg-primary font-bold text-on-color lg:grid" aria-hidden="true">
              {user.name[0]}
            </span>
            <span className="hidden min-w-0 flex-1 lg:block">
              <span className="block font-bold leading-tight">{user.name}</span>
              <span className="block text-xs text-muted">{user.note}</span>
            </span>
            <form action={logout}>
              <button className="grid size-11 place-items-center rounded-full text-muted hover:bg-surface hover:text-ink" aria-label={`Шығу (${user.name})`}>
                <LogOut className="size-5" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main id="main" className="min-w-0 flex-1 pb-24 lg:pb-0">
        <PageTransition>{children}</PageTransition>
      </main>
      {floating}
      <Tour storageKey={tour.key} steps={tour.steps} />
      <nav aria-label="Негізгі мәзір" className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className={`mx-auto grid max-w-lg ${nav.length > 5 ? "grid-cols-6" : "grid-cols-5"}`}>
          {nav.map((n) => (
            <NavLink key={n.href} href={n.href} exact={n.exact} tab>
              <span className="bounce grid h-8 w-14 place-items-center rounded-full transition-colors group-aria-[current=page]:bg-accent-soft [&>svg]:size-6" aria-hidden="true">
                {n.icon}
              </span>
              <span>{n.short ?? n.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
