// The film's own music, made here from code (no samples, no licence): npx tsx scripts/music.ts
// A galloping 6/8 in the site's key, D minor without its sixth: dombyra plucks playing the site's melody
// (src/lib/music.ts) over a light drum kit, bass and a soft pad. The sections follow the film (src/timeline.ts):
// quiet under the opening question, a drop on «зерттейміз!», a calm bar under the trust scene, a last hit at the end.
import { writeFileSync } from "node:fs";
import { BARS } from "../../src/lib/music";
import { cues } from "../src/timeline";

const SR = 48000;
const { total, drop, calmFrom, calmTo } = cues();
const N = Math.ceil((total + 1) * SR);
const EIGHTH = 0.2; // dotted quarter = 100 bpm
const BAR = EIGHTH * 6;

// bars are counted from the drop, so the downbeat lands on the word
const barAt = (n: number) => drop + n * BAR;
const firstBar = -Math.ceil(drop / BAR);
const lastBar = Math.floor((total - drop) / BAR);
const calmA = Math.round((calmFrom - drop) / BAR), calmB = Math.round((calmTo - drop) / BAR);

const hz = (name: string) => {
  const m = /^([A-G])(\d)$/.exec(name)!;
  const semi = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1] as "C"]!;
  return 440 * 2 ** ((semi + (Number(m[2]) - 4) * 12) / 12);
};
let seed = 11;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const noise = () => rand() * 2 - 1;

// buses: dry drums and bass in the middle, plucks and pad also go to the room
const L = new Float32Array(N), R = new Float32Array(N), send = new Float32Array(N), duck = new Float32Array(N).fill(1);
const put = (buf: Float32Array, at: number, sig: (t: number) => number, len: number, vol: number) => {
  const s = Math.round(at * SR);
  for (let i = 0; i < len * SR; i++) { const j = s + i; if (j >= 0 && j < N) buf[j] += vol * sig(i / SR); }
};
const stereo = (at: number, sig: (t: number) => number, len: number, vol: number, pan = 0, wet = 0) => {
  const s = Math.round(at * SR), gl = vol * Math.cos((pan + 1) * Math.PI / 4) * Math.SQRT2, gr = vol * Math.sin((pan + 1) * Math.PI / 4) * Math.SQRT2;
  for (let i = 0; i < len * SR; i++) { const j = s + i; if (j < 0 || j >= N) continue; const v = sig(i / SR); L[j] += gl * v; R[j] += gr * v; send[j] += wet * vol * v; }
};

// ---------- instruments ----------
function kick(at: number, vol = 1) {
  let ph = 0;
  stereo(at, (t) => { ph += (2 * Math.PI * (48 + 95 * Math.exp(-t * 32))) / SR; return Math.sin(ph) * Math.exp(-t * 7.5) + (t < 0.004 ? noise() * 0.4 : 0); }, 0.5, 0.9 * vol);
  const s = Math.round(at * SR);
  for (let i = 0; i < 0.35 * SR; i++) if (s + i >= 0 && s + i < N) duck[s + i] = Math.min(duck[s + i], 1 - 0.45 * vol * Math.exp(-i / SR * 9));
}
function bandNoise(f: number, q: number) { // a two-pole resonator on white noise
  const w = (2 * Math.PI * f) / SR, r = 1 - w / (2 * q), c = 2 * r * Math.cos(w);
  let y1 = 0, y2 = 0;
  return () => { const y = noise() * (1 - r) + c * y1 - r * r * y2; y2 = y1; y1 = y; return y * 3; };
}
function clap(at: number, vol = 1) {
  const n = bandNoise(1400, 1.2);
  stereo(at, (t) => n() * (t < 0.03 ? Math.exp(-((t % 0.01) * 260)) : Math.exp(-(t - 0.02) * 24)), 0.3, 0.55 * vol, 0, 0.25);
}
function hat(at: number, open = false, vol = 1, pan = 0.25) {
  let prev = 0;
  stereo(at, (t) => { const x = noise(); const y = x - prev; prev = x; return y * Math.exp(-t * (open ? 9 : 70)); }, open ? 0.35 : 0.07, 0.16 * vol, pan);
}
function tom(at: number, vol = 1) {
  let ph = 0;
  stereo(at, (t) => { ph += (2 * Math.PI * (78 + 50 * Math.exp(-t * 20))) / SR; return Math.sin(ph) * Math.exp(-t * 13); }, 0.3, 0.35 * vol, -0.2);
}
function crash(at: number, vol = 1) {
  let prev = 0;
  stereo(at, (t) => { const x = noise(); const y = x - prev * 0.6; prev = x; return y * Math.exp(-t * 2.2); }, 2.2, 0.18 * vol, 0, 0.4);
}
function boom(at: number) {
  let ph = 0;
  stereo(at, (t) => { ph += (2 * Math.PI * (40 + 40 * Math.exp(-t * 6))) / SR; return Math.sin(ph) * Math.exp(-t * 2.2); }, 1.8, 0.8);
}
function riser(at: number, len: number) {
  let lp = 0;
  stereo(at, (t) => { const k = t / len; const a = Math.exp((-2 * Math.PI * (300 + 7000 * k * k)) / SR); lp = (1 - a) * noise() + a * lp; return lp * k * k * 1.6; }, len, 0.3, 0, 0.5);
}
function bass(at: number, f: number, len: number, vol = 1) {
  put(L, at, (t) => { const e = Math.min(1, t / 0.006) * (0.6 + 0.4 * Math.exp(-t * 6)) * Math.min(1, (len - t) / 0.04); const x = Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t); return Math.tanh(1.6 * x) * e; }, len, 0.42 * vol);
  put(R, at, (t) => { const e = Math.min(1, t / 0.006) * (0.6 + 0.4 * Math.exp(-t * 6)) * Math.min(1, (len - t) / 0.04); const x = Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t); return Math.tanh(1.6 * x) * e; }, len, 0.42 * vol);
}
const plucks = new Map<number, Float32Array>();
function pluckWave(f: number) { // Karplus–Strong, as the site's own synth
  let y = plucks.get(f);
  if (y) return y;
  const n = Math.round(SR * 1.6), p = Math.max(2, Math.round(SR / f));
  y = new Float32Array(n);
  let s = Math.round(f * 1000);
  for (let i = 0; i < p; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; y[i] = (s / 0x7fffffff) * 2 - 1; }
  for (let i = 1; i < p; i++) y[i] = 0.5 * (y[i] + y[i - 1]);
  for (let i = p; i < n; i++) y[i] = 0.996 * 0.5 * (y[i - p] + y[i - p - 1 < 0 ? 0 : i - p - 1]);
  for (let i = n - 3000; i < n; i++) y[i] *= (n - i) / 3000;
  plucks.set(f, y);
  return y;
}
function pluck(at: number, f: number, vol: number, pan = 0) {
  const y = pluckWave(f);
  stereo(at, (t) => y[Math.min(y.length - 1, Math.round(t * SR))], y.length / SR, vol, pan, 0.35);
}
function pad(at: number, fs: number[], len: number, vol = 1) {
  for (const f of fs) for (const d of [-0.004, 0, 0.004]) {
    let ph = rand(), lp = 0;
    const a = Math.exp((-2 * Math.PI * 1300) / SR);
    stereo(at, (t) => { ph = (ph + (f * (1 + d)) / SR) % 1; lp = (1 - a) * (2 * ph - 1) + a * lp; return lp * Math.min(1, t / 0.5, (len - t) / 0.7); }, len, 0.035 * vol, d * 150, 0.6);
  }
}

// ---------- the score ----------
const ROOT_NAMES = BARS.map(([r]) => r);
const chordOf = (root: string) => { // the drone note's triad, in D minor without the sixth
  const f = hz(root);
  const minor = ["D3", "A2", "G2"].includes(root);
  return [f * 2, f * 2 * 2 ** ((minor ? 3 : 4) / 12), f * 3];
};
const FORM = [0, 1, 2, 0]; // phrases A B C A, four bars each
for (let n = firstBar; n <= lastBar; n++) {
  const t0 = barAt(n);
  const k = ((n % 16) + 16) % 16;
  const [root, line] = BARS[FORM[Math.floor(k / 4)] * 4 + (k % 4)];
  const intro = n < 0, calm = n >= calmA && n < calmB, end = n >= lastBar - 1;
  const fRoot = hz(root);
  const tokens = line.split(" ");
  // dombyra: the melody, and the open drone string strummed in the gallop (long–short–short)
  tokens.forEach((tok, i) => {
    const at = t0 + i * EIGHTH + (rand() - 0.5) * 0.01;
    if (tok !== ".") pluck(at, hz(tok), (i === 0 ? 0.34 : 0.27) * (intro ? 0.8 : 1), 0.15);
    if (!intro || n >= -2) if (!end || i === 0) pluck(at + 0.012, fRoot * 2, [0.2, 0.08, 0.12, 0.17, 0.08, 0.12][i] * (calm ? 0.7 : 1), -0.2);
  });
  pad(t0, chordOf(root), BAR + 0.05, intro ? 0.8 : calm ? 1.1 : 0.7);
  if (intro || calm || end) {
    if (calm || end) bass(t0, fRoot / 2, BAR * 0.98, 0.6);
    continue;
  }
  // drums and bass after the drop
  kick(t0); kick(t0 + 3 * EIGHTH, 0.75);
  if (k % 8 === 7) for (let i = 0; i < 6; i++) clap(t0 + i * EIGHTH, 0.35 + i * 0.12); // a roll into the next phrase
  else clap(t0 + 3 * EIGHTH);
  for (let i = 0; i < 6; i++) hat(t0 + i * EIGHTH + (i % 3 === 2 ? 0.012 : 0), i === 5 && k % 4 === 3, [1, 0.5, 0.7, 0.9, 0.5, 0.7][i]);
  tom(t0 + 2 * EIGHTH, 0.7); tom(t0 + 5 * EIGHTH, 0.9);
  bass(t0, fRoot / 2, EIGHTH * 2.6); bass(t0 + 3 * EIGHTH, fRoot / 2, EIGHTH * 1.6, 0.8); bass(t0 + 5 * EIGHTH, fRoot, EIGHTH * 0.9, 0.7);
  if (k % 16 === 0 || n === calmB) crash(t0, 0.8);
}
riser(drop - 2 * BAR, 2 * BAR);
boom(drop); crash(drop, 1.2); kick(drop, 1.2);
riser(barAt(calmB) - BAR, BAR);
const lastHit = barAt(lastBar - 1);
boom(lastHit); crash(lastHit, 1.3); kick(lastHit, 1.2);

// ---------- room, pumping, master ----------
function room(spread: number) {
  const out = new Float32Array(N);
  for (const d of [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116]) {
    const len = Math.round(((d + spread) * SR) / 44100), buf = new Float32Array(len);
    let k = 0, lp = 0;
    for (let i = 0; i < N; i++) { const o = buf[k]; lp = o * 0.55 + lp * 0.45; buf[k] = send[i] + lp * 0.84; out[i] += o; k = (k + 1) % len; }
  }
  for (const d of [556, 441, 341, 225]) {
    const len = Math.round(((d + spread) * SR) / 44100), buf = new Float32Array(len);
    let k = 0;
    for (let i = 0; i < N; i++) { const b = buf[k]; buf[k] = out[i] + b * 0.5; out[i] = b - out[i]; k = (k + 1) % len; }
  }
  return out;
}
const rl = room(0), rr = room(23);
let peak = 0;
const fade = (i: number) => Math.min(1, i / (0.3 * SR), (N - i) / (1.5 * SR));
for (let i = 0; i < N; i++) {
  L[i] = Math.tanh(1.15 * (L[i] * duck[i] + 0.05 * rl[i])) * fade(i);
  R[i] = Math.tanh(1.15 * (R[i] * duck[i] + 0.05 * rr[i])) * fade(i);
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const gain = 0.89 / peak;
const wav = Buffer.alloc(44 + N * 4);
wav.write("RIFF", 0); wav.writeUInt32LE(36 + N * 4, 4); wav.write("WAVEfmt ", 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(SR, 24); wav.writeUInt32LE(SR * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { wav.writeInt16LE(Math.round(L[i] * gain * 32767), 44 + i * 4); wav.writeInt16LE(Math.round(R[i] * gain * 32767), 46 + i * 4); }
writeFileSync(new URL("../public/music.wav", import.meta.url), wav);
console.log(`music.wav ${total.toFixed(1)} s, drop at ${drop.toFixed(2)} s, calm ${calmFrom.toFixed(1)}–${calmTo.toFixed(1)} s, ${ROOT_NAMES.length} bars of melody`);
