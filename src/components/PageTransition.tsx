"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Animates each new page in, by the kind of link that led to it (`data-nav` on the link):
 * menu tabs hop up, deeper pages slide in from the right, "back" from the left, anything else
 * fades. Plain CSS on the new content: the View Transitions API was tried and dropped, because
 * snapshotting the old page added 0.3–0.5 s to every click on a slow phone.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    const click = (e: MouseEvent) => {
      const a = (e.target as Element).closest("a[href]");
      if (a) root.dataset.nav = a.getAttribute("data-nav") ?? "fade";
    };
    const pop = () => (root.dataset.nav = "back");
    document.addEventListener("click", click, true);
    addEventListener("popstate", pop);
    return () => {
      document.removeEventListener("click", click, true);
      removeEventListener("popstate", pop);
    };
  }, []);
  // A new key per path re-mounts the content, which restarts its entry animation.
  return (
    <div key={usePathname()} className="page-enter">
      {children}
    </div>
  );
}
