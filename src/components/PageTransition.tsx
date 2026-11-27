"use client";
import { ViewTransition } from "react";
import { usePathname } from "next/navigation";

// Keyed by path, so every page change (nested ones too) exits and enters by the link's
// transition type: tabs rise, deeper pages slide, "back" slides the other way (globals.css).
const KIND = { "nav-forward": "nav-forward", "nav-back": "nav-back", "nav-tab": "nav-tab", default: "vt-fade" };

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition key={usePathname()} enter={KIND} exit={KIND} default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
