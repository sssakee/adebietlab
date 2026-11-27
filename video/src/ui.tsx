import { useEffect, useState, type ReactNode } from "react";
import { continueRender, delayRender, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";

// The site's own tokens (src/app/globals.css), so the video looks like the product.
export const C = {
  primary: "#0f5cf2", hero: "#1450e0", navyDeep: "#13309c", ink: "#0b1f4d", muted: "#4a5b80",
  bg: "#f4f7ff", soft: "#eef3ff", line: "#d3e0fa", gold: "#ffb800", violet: "#6a2cf0", blobA: "#5b2ee0",
  blobB: "#a3168a", green: "#00b86b", greenSoft: "#d9f7e8", white: "#ffffff",
};
export const FONT = "JUZ40, system-ui, sans-serif";

/** Loads the site's JUZ40 font before the first frame is rendered. */
export function useFonts() {
  const [handle] = useState(() => delayRender("JUZ40"));
  useEffect(() => {
    const faces = [["Regular", "400"], ["Medium", "500"], ["Bold", "700"]].map(([f, w]) =>
      new FontFace("JUZ40", `url(${staticFile(`fonts/JUZ40-${f}.woff2`)})`, { weight: w }));
    Promise.all(faces.map((f) => f.load())).then((loaded) => {
      loaded.forEach((f) => document.fonts.add(f));
      continueRender(handle);
    });
  }, [handle]);
}

/** 0 → 1 spring that starts at `delay` frames. */
export function useIn(delay = 0, damping = 18) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, mass: 0.8 } });
}

export const ease = (frame: number, from: number, to: number, a: number, b: number) =>
  interpolate(frame, [from, to], [a, b], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.45, 0, 0.2, 1) });

/** Rises and fades in. */
export function Rise({ delay = 0, y = 40, children, style }: { delay?: number; y?: number; children: ReactNode; style?: React.CSSProperties }) {
  const p = useIn(delay);
  return <div style={{ opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * y}px)`, ...style }}>{children}</div>;
}

/** The ram's-horn ornament strip from the site (src/components/Ornament.tsx). */
export function Ornament({ color = C.gold, width = 1920, opacity = 1 }: { color?: string; width?: number; opacity?: number }) {
  const id = `oyu-${color.replace("#", "")}`;
  return (
    <svg width={width} height={18} style={{ opacity, display: "block" }}>
      <defs>
        <pattern id={id} width="36" height="18" patternUnits="userSpaceOnUse">
          <path d="M18 16 V10 C18 4 11 3 9 7 C7.5 10 10.5 12.5 12.5 10.5 M18 10 C18 4 25 3 27 7 C28.5 10 25.5 12.5 23.5 10.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </pattern>
      </defs>
      <rect width={width} height="18" fill={`url(#${id})`} />
    </svg>
  );
}

/** Brand backdrop: the hero's blue with the site's slow violet and magenta blobs. */
export function HeroBg({ children }: { children?: ReactNode }) {
  const f = useCurrentFrame();
  const blob = (color: string, size: number, x: number, y: number, phase: number): React.CSSProperties => ({
    position: "absolute", width: size, height: size, borderRadius: "50%", background: color,
    left: x + Math.sin(f / 70 + phase) * 40, top: y + Math.cos(f / 85 + phase) * 30, opacity: 0.85,
  });
  return (
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${C.hero} 0%, ${C.navyDeep} 100%)`, overflow: "hidden" }}>
      <div style={blob(C.blobA, 900, 1250, -300, 0)} />
      <div style={blob(C.blobB, 520, 1050, 640, 2)} />
      <div style={blob(C.navyDeep, 640, -260, -280, 4)} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 36 }}><Ornament opacity={0.9} /></div>
      {children}
    </div>
  );
}

/** Light backdrop of the app pages, with the dotted texture. */
export function PageBg({ children }: { children?: ReactNode }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: C.bg, backgroundImage: `radial-gradient(${C.line} 1.6px, transparent 1.6px)`, backgroundSize: "28px 28px" }}>
      {children}
    </div>
  );
}

export type Box = { x: number; y: number; w: number; h: number };

/**
 * A browser window with a real screenshot inside. Shots are 1440 css px wide (2× pixels).
 * `scroll` is in css px; `zoom` scales around `focus` (css px).
 */
export function Browser({ src, url, width = 1180, height = 738, scroll = 0, zoom = 1, focus = { x: 720, y: 450 }, ring, ringOn = 0, style }: {
  src: string; url: string; width?: number; height?: number; scroll?: number; zoom?: number; focus?: { x: number; y: number };
  ring?: Box; ringOn?: number; style?: React.CSSProperties;
}) {
  const bar = 46;
  const s = width / 1440;
  return (
    <div style={{ width, borderRadius: 22, background: C.white, boxShadow: "0 40px 90px rgba(11,31,77,.28), 0 8px 24px rgba(11,31,77,.12)", overflow: "hidden", border: `1px solid ${C.line}`, ...style }}>
      <div style={{ height: bar, display: "flex", alignItems: "center", gap: 9, padding: "0 18px", background: C.soft, borderBottom: `1px solid ${C.line}` }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />)}
        <div style={{ marginLeft: 18, flex: 1, maxWidth: 560, height: 28, borderRadius: 14, background: C.white, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", padding: "0 14px", fontFamily: FONT, fontSize: 15, color: C.muted, fontWeight: 500 }}>
          🔒&nbsp; adebietlab.vercel.app<span style={{ color: C.ink }}>{url}</span>
        </div>
      </div>
      <div style={{ position: "relative", height: height - bar, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 1440, transformOrigin: "0 0", transform: `scale(${s}) translate(${focus.x}px, ${focus.y}px) scale(${zoom}) translate(${-focus.x}px, ${-focus.y - scroll}px)` }}>
          <Img src={staticFile(`shots/${src}.png`)} style={{ width: 1440, display: "block" }} />
          {ring && (
            <div style={{ position: "absolute", left: ring.x - 8, top: ring.y - 8, width: ring.w + 16, height: ring.h + 16, borderRadius: 18, border: `5px solid ${C.gold}`, opacity: ringOn, transform: `scale(${1.15 - 0.15 * ringOn})`, boxShadow: `0 0 0 ${9999}px rgba(11,31,77,${0.28 * ringOn})` }} />
          )}
        </div>
      </div>
    </div>
  );
}

/** A phone with a real mobile screenshot (390 css px wide). */
export function Phone({ src, style }: { src: string; style?: React.CSSProperties }) {
  return (
    <div style={{ width: 330, height: 690, borderRadius: 48, background: "#0b1230", padding: 12, boxShadow: "0 40px 80px rgba(11,31,77,.35)", ...style }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 38, overflow: "hidden", position: "relative" }}>
        <Img src={staticFile(`shots/${src}.png`)} style={{ width: "100%", display: "block" }} />
        <div style={{ position: "absolute", top: 8, left: "50%", marginLeft: -50, width: 100, height: 26, borderRadius: 14, background: "#0b1230" }} />
      </div>
    </div>
  );
}

export function Chip({ children, color = C.primary, bg = "#dde8ff", style }: { children: ReactNode; color?: string; bg?: string; style?: React.CSSProperties }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 20px", borderRadius: 999, background: bg, color, fontFamily: FONT, fontWeight: 700, fontSize: 24, ...style }}>{children}</span>;
}

export function Mascot({ size = 260, style }: { size?: number; style?: React.CSSProperties }) {
  return <Img src={staticFile("mascot/kyrantay.png")} style={{ width: size, ...style }} />;
}
