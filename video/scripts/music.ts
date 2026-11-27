// Renders the site's own dombyra tune (src/lib/music.ts) to public/music.wav for the video.
// The same plucked-string synthesis as src/components/Music.tsx, done offline, plus a small room.
import { writeFileSync } from "node:fs";
import { hits, stepLength } from "../../src/lib/music";

const SR = 48000;
const SECS = Number(process.argv[2] ?? 86);
const N = SR * SECS;
const dry = new Float32Array(N);
let seed = 7;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

const cache = new Map<number, Float32Array>();
const period = (f: number) => Math.max(2, Math.round(SR / f - 0.5));
function pluck(f: number) {
  let y = cache.get(f);
  if (y) return y;
  const n = Math.round(SR * (f < 200 ? 3 : 2.4)), p = period(f);
  y = new Float32Array(n);
  let s = Math.round(f * 1000);
  for (let i = 0; i < p; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; y[i] = (s / 0x7fffffff) * 2 - 1; }
  for (let k = 0; k < 2; k++) for (let i = 1; i < p; i++) y[i] = 0.5 * (y[i] + y[i - 1]);
  const keep = f < 200 ? 0.998 : 0.997;
  for (let i = p; i < n; i++) y[i] = keep * 0.5 * (y[i - p] + y[Math.max(0, i - p - 1)]);
  for (let i = n - 2000; i < n; i++) y[i] *= (n - i) / 2000;
  cache.set(f, y);
  return y;
}

let t = 0.4;
for (let step = 0; t < SECS; step++) {
  for (const h of hits(step)) {
    const at = t + h.at + (rand() - 0.5) * 0.012;
    const vol = h.vol * (0.88 + rand() * 0.24) * 0.5;
    const y = pluck(h.f), rate = (h.f * (period(h.f) + 0.5)) / SR; // tune exactly, as playbackRate does
    const start = Math.round(at * SR);
    for (let i = 0; start + i < N; i++) {
      const x = i * rate, j = Math.floor(x);
      if (j + 1 >= y.length) break;
      if (start + i >= 0) dry[start + i] += vol * (y[j] + (x - j) * (y[j + 1] - y[j]));
    }
  }
  t += stepLength(step);
}

// lowpass at 2600 Hz, as in the browser
const a = Math.exp((-2 * Math.PI * 2600) / SR);
for (let i = 1; i < N; i++) dry[i] = (1 - a) * dry[i] + a * dry[i - 1];

// small room: Freeverb-style combs and allpasses, slightly different per channel for width
function room(spread: number) {
  const out = new Float32Array(N);
  for (const d of [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116]) {
    const len = Math.round(((d + spread) * SR) / 44100), buf = new Float32Array(len);
    let k = 0, lp = 0;
    for (let i = 0; i < N; i++) {
      const o = buf[k]; lp = o * 0.6 + lp * 0.4;
      buf[k] = dry[i] + lp * 0.86; out[i] += o; k = (k + 1) % len;
    }
  }
  for (const d of [556, 441, 341, 225]) {
    const len = Math.round(((d + spread) * SR) / 44100), buf = new Float32Array(len);
    let k = 0;
    for (let i = 0; i < N; i++) { const b = buf[k]; buf[k] = out[i] + b * 0.5; out[i] = b - out[i]; k = (k + 1) % len; }
  }
  return out;
}
const L = room(0), R = room(23);

const fadeOut = 4 * SR;
const ch = [new Float32Array(N), new Float32Array(N)];
let peak = 0;
for (let i = 0; i < N; i++) {
  const g = Math.min(1, i / (1.5 * SR), (N - i) / fadeOut);
  ch[0][i] = g * (dry[i] + 0.035 * L[i]);
  ch[1][i] = g * (dry[i] + 0.035 * R[i]);
  peak = Math.max(peak, Math.abs(ch[0][i]), Math.abs(ch[1][i]));
}
const gain = 0.89 / peak; // −1 dBFS
const wav = Buffer.alloc(44 + N * 4);
wav.write("RIFF", 0); wav.writeUInt32LE(36 + N * 4, 4); wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22); wav.writeUInt32LE(SR, 24);
wav.writeUInt32LE(SR * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) for (let c = 0; c < 2; c++) wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, ch[c][i] * gain)) * 32767), 44 + i * 4 + c * 2);
writeFileSync(new URL("../public/music.wav", import.meta.url), wav);
console.log(`music.wav: ${SECS} s, peak gain ${gain.toFixed(2)}`);
