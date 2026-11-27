"use client";
import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, CircleHelp } from "lucide-react";
import { sfx } from "./Sfx";

export type TourStep = { target?: string; title: string; text: string };

// Seen-or-not lives in localStorage, so the tour shows once per browser and can be replayed.
const EVENT = "al_tour";
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
};
const mark = (key: string, seen: boolean) => {
  if (seen) localStorage.setItem(key, "1");
  else localStorage.removeItem(key);
  window.dispatchEvent(new Event(EVENT));
};

/** The first visible element for a step (both the sidebar and the phone tab bar hold the same links). */
function find(target?: string) {
  if (!target) return null;
  return [...document.querySelectorAll<HTMLElement>(target)].find((el) => el.offsetParent !== null || getComputedStyle(el).position === "fixed") ?? null;
}

/**
 * First-visit walkthrough: dims the page, lights up one part of it at a time, and explains it
 * with the mascot. Non-modal: Esc or "Өткізу" closes it, arrow keys step through.
 */
export function Tour({ storageKey, steps }: { storageKey: string; steps: TourStep[] }) {
  const seen = useSyncExternalStore(subscribe, () => localStorage.getItem(storageKey) === "1", () => true);
  const [i, setI] = useState(0);
  const hole = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const step = steps[i];
  const last = i === steps.length - 1;

  const close = () => {
    mark(storageKey, true);
    setI(0);
  };
  const go = (n: number) => {
    if (n < 0 || n >= steps.length) return;
    sfx.step();
    setI(n);
  };

  // Place the spotlight on the step's element and the card beside it. Written straight to the
  // DOM so scrolling and resizing do not re-render React.
  useLayoutEffect(() => {
    if (seen) return;
    const place = () => {
      const el = find(step.target);
      const h = hole.current;
      const c = card.current;
      if (!h || !c) return;
      const w = c.offsetWidth;
      const ch = c.offsetHeight;
      const vw = innerWidth;
      const vh = innerHeight;
      if (!el) {
        h.style.cssText = `top:${vh / 2}px;left:${vw / 2}px;width:0;height:0`;
        c.style.cssText = `top:${Math.max(16, (vh - ch) / 2)}px;left:${(vw - w) / 2}px`;
        return;
      }
      const r = el.getBoundingClientRect();
      const pad = 6;
      h.style.cssText = `top:${r.top - pad}px;left:${r.left - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px`;
      const clampX = (x: number) => Math.min(Math.max(16, x), vw - w - 16);
      const clampY = (y: number) => Math.min(Math.max(16, y), vh - ch - 16);
      if (r.right + 24 + w < vw && r.width < vw / 3) c.style.cssText = `top:${clampY(r.top - 12)}px;left:${r.right + 24}px`;
      else if (r.top > vh / 2) c.style.cssText = `top:${clampY(r.top - ch - 20)}px;left:${clampX(r.left + r.width / 2 - w / 2)}px`;
      else c.style.cssText = `top:${clampY(r.bottom + 20)}px;left:${clampX(r.left + r.width / 2 - w / 2)}px`;
    };
    find(step.target)?.scrollIntoView({ block: "nearest" });
    place();
    addEventListener("resize", place);
    addEventListener("scroll", place, true);
    return () => {
      removeEventListener("resize", place);
      removeEventListener("scroll", place, true);
    };
  }, [seen, step]);

  useEffect(() => {
    if (seen) return;
    next.current?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") go(i + 1);
      if (e.key === "ArrowLeft") go(i - 1);
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  });

  if (seen) return null;
  return (
    <>
      <div ref={hole} className="tour-hole" aria-hidden="true" />
      <section
        ref={card}
        key={i}
        role="dialog"
        aria-labelledby="tour-title"
        aria-describedby="tour-text"
        className="tour-card card fixed z-[61] w-[min(22rem,calc(100vw-2rem))] p-5"
      >
        <div className="flex items-start gap-3">
          <Image src="/mascot/kyrantay.png" alt="" width={52} height={67} className="float shrink-0" />
          <div className="min-w-0">
            <p className="num text-xs font-bold text-muted">
              {i + 1} / {steps.length}
            </p>
            <h2 id="tour-title" className="text-lg font-bold leading-tight">
              {step.title}
            </h2>
          </div>
        </div>
        <p id="tour-text" className="mt-3 text-[15px] text-muted">
          {step.text}
        </p>
        <div className="mt-4 flex gap-1.5" aria-hidden="true">
          {steps.map((_, n) => (
            <span key={n} className={`h-2 rounded-full transition-all duration-300 ${n === i ? "w-6 bg-primary" : "w-2 bg-line"}`} />
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button type="button" onClick={close} className="mr-auto rounded-xl px-2 py-2 text-sm font-bold text-muted hover:text-ink">
            Өткізу
          </button>
          {i > 0 && (
            <button type="button" onClick={() => go(i - 1)} className="btn-ghost min-h-10 px-3" aria-label="Артқа">
              <ArrowLeft className="size-5" aria-hidden="true" />
            </button>
          )}
          <button ref={next} type="button" onClick={() => (last ? close() : go(i + 1))} className="btn-primary min-h-10 px-4">
            {last ? "Бастайық!" : "Келесі"}
            {!last && <ArrowRight className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </section>
    </>
  );
}

/** Replays the tour. */
export function TourButton({ storageKey }: { storageKey: string }) {
  return (
    <button
      title="Нұсқаулық"
      type="button"
      onClick={() => mark(storageKey, false)}
      className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-bold text-muted hover:bg-soft hover:text-ink lg:justify-start"
    >
      <CircleHelp className="wiggle size-5" aria-hidden="true" />
      <span className="max-lg:sr-only">Нұсқаулық</span>
    </button>
  );
}
