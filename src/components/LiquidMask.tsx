"use client";
import { useEffect, useRef } from "react";

/**
 * Liquid mask for the entry hero: gooey blobs act as windows onto a vivid ink layer.
 * Three blobs drift on their own (CSS), one follows the pointer. Static when the
 * system asks for reduced motion. Decorative only.
 */
export function LiquidMask() {
  const svg = useRef<SVGSVGElement>(null);
  const drop = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const el = svg.current;
    const c = drop.current;
    const host = el?.parentElement;
    if (!el || !c || !host || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cur = { x: 760, y: 220, r: 0 };
    const to = { ...cur };
    let raf = 0;
    const tick = () => {
      cur.x += (to.x - cur.x) * 0.12;
      cur.y += (to.y - cur.y) * 0.12;
      cur.r += (to.r - cur.r) * 0.1;
      c.setAttribute("cx", cur.x.toFixed(1));
      c.setAttribute("cy", cur.y.toFixed(1));
      c.setAttribute("r", cur.r.toFixed(1));
      const busy = Math.abs(to.x - cur.x) + Math.abs(to.y - cur.y) + Math.abs(to.r - cur.r) > 0.5;
      raf = busy ? requestAnimationFrame(tick) : 0;
    };
    const go = () => (raf ||= requestAnimationFrame(tick));
    const move = (e: PointerEvent) => {
      const m = el.getScreenCTM();
      if (!m) return;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
      Object.assign(to, { x: p.x, y: p.y, r: 95 });
      go();
    };
    const leave = () => {
      to.r = 0;
      go();
    };
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);
    return () => {
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <svg ref={svg} className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 1000 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="lq-ink" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--ink-1)" />
          <stop offset="0.55" stopColor="var(--ink-2)" />
          <stop offset="1" stopColor="var(--ink-3)" />
        </linearGradient>
        <pattern id="lq-oyu" width="44" height="24" patternUnits="userSpaceOnUse">
          <path d="M22 21 V13 C22 6 13 4.5 10.5 9 C8.5 13 12.5 15.5 15 13 M22 13 C22 6 31 4.5 33.5 9 C35.5 13 31.5 15.5 29 13" fill="none" stroke="#ffd24d" strokeWidth="1.6" strokeLinecap="round" opacity="0.28" />
        </pattern>
        <filter id="lq-goo" filterUnits="userSpaceOnUse" x="-200" y="-200" width="1400" height="820">
          <feGaussianBlur stdDeviation="22" />
          <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -11" />
        </filter>
        <mask id="lq-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="420">
          <g filter="url(#lq-goo)" fill="#fff">
            <circle className="lq-1" cx="820" cy="90" r="120" />
            <circle className="lq-2" cx="640" cy="330" r="95" />
            <circle className="lq-3" cx="950" cy="320" r="110" />
            <circle className="lq-4" cx="430" cy="-10" r="80" />
            <circle ref={drop} cx="760" cy="220" r="0" />
          </g>
        </mask>
      </defs>
      <g mask="url(#lq-mask)">
        <rect width="1000" height="420" fill="url(#lq-ink)" />
        <rect width="1000" height="420" fill="url(#lq-oyu)" />
      </g>
    </svg>
  );
}
