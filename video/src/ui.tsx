import { useEffect, useState } from "react";
import { continueRender, delayRender, Img, staticFile } from "remotion";

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

/** The site's gold «қошқар мүйіз» border. */
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

/** Қырантай, the site's mascot. */
export function Mascot({ size = 260, style }: { size?: number; style?: React.CSSProperties }) {
  return <Img src={staticFile("mascot/kyrantay.png")} style={{ width: size, ...style }} />;
}
