// Renders single frames of the film to check them by eye: node scripts/stills.mjs OUT_DIR frame frame…
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";

const [out, ...frames] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browserExecutable = process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium_headless_shell";
const composition = await selectComposition({ serveUrl, id: "Promo", browserExecutable });
for (const f of frames) {
  await renderStill({ serveUrl, composition, frame: Number(f), output: `${out}/f${String(f).padStart(5, "0")}.jpg`, imageFormat: "jpeg", jpegQuality: 80, scale: 0.5, browserExecutable });
  process.stdout.write(f + " ");
}
