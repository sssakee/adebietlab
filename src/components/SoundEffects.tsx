"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { sfx } from "./Sfx";

/**
 * One listener for the whole site instead of a handler on every control: taps on buttons and
 * links, a "pick" for checkboxes and radios, a whoosh up when a form is sent, a soft note on
 * page change. Everything is silent until the user turns sound on.
 */
export function SoundEffects() {
  const path = usePathname();
  const first = useRef(path);

  useEffect(() => {
    let last = 0;
    const click = (e: MouseEvent) => {
      const el = (e.target as Element).closest("button, a[href], label, summary, [role=button]");
      if (!el || el.matches(":disabled, [aria-disabled=true]") || e.timeStamp - last < 60) return;
      last = e.timeStamp;
      // A label click also clicks its input; only the input's own "pick" should sound.
      if (el.matches("label") || (el as HTMLElement).querySelector?.("input[type=checkbox], input[type=radio]")) return;
      if (el.matches("button[type=submit], button:not([type])") && el.closest("form")) return;
      sfx.tap();
    };
    const change = (e: Event) => {
      if ((e.target as Element).matches("input[type=checkbox], input[type=radio]")) sfx.pick();
    };
    const submit = () => sfx.send();
    document.addEventListener("click", click, true);
    document.addEventListener("change", change, true);
    document.addEventListener("submit", submit, true);
    return () => {
      document.removeEventListener("click", click, true);
      document.removeEventListener("change", change, true);
      document.removeEventListener("submit", submit, true);
    };
  }, []);

  useEffect(() => {
    if (path !== first.current) sfx.page();
    first.current = path;
  }, [path]);

  return null;
}
