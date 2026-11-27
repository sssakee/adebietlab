// Sound effects for the video, synthesized here (no files, no licence): the site's own palette from
// src/components/Sfx.tsx (tap, pick, send, step, ok) plus a whoosh, a pop and a typing tick.
// Writes public/sfx/*.wav.
import { mkdirSync, writeFileSync } from "node:fs";

const SR = 48000;
type Note = { f: number; to?: number; at?: number; len?: number; vol?: number; wave?: "sine" | "triangle" };

function wav(name: string, x: Float32Array) {
  const n = x.length, buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[i])) * 32767), 44 + i * 2);
  writeFileSync(new URL(`../public/sfx/${name}.wav`, import.meta.url), buf);
}

/** Same envelope as the browser version: 15 ms exponential attack, exponential decay to the end. */
function tones(notes: Note[]) {
  const end = Math.max(...notes.map((n) => (n.at ?? 0) + (n.len ?? 0.12))) + 0.05;
  const x = new Float32Array(Math.ceil(end * SR));
  for (const { f, to, at = 0, len = 0.12, vol = 0.12, wave = "sine" } of notes) {
    let ph = 0;
    for (let i = 0; i < len * SR; i++) {
      const t = i / SR, fr = to ? f * Math.pow(to / f, t / len) : f;
      ph += (2 * Math.PI * fr) / SR;
      const s = wave === "sine" ? Math.sin(ph) : (2 / Math.PI) * Math.asin(Math.sin(ph));
      const env = t < 0.015 ? Math.pow(10, -4 + 4 * (t / 0.015)) * vol / 1 : vol * Math.pow(0.0001 / vol, (t - 0.015) / (len - 0.015));
      x[Math.round(at * SR) + i] += s * env;
    }
  }
  return x;
}

let seed = 3;
const noise = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;

/** Band-passed noise whose centre sweeps up then down: air moving past. */
function whoosh(len = 0.55, lo = 300, hi = 2400, vol = 0.5) {
  const x = new Float32Array(Math.round(len * SR));
  let b1 = 0, b2 = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / x.length, fc = lo + (hi - lo) * Math.sin(Math.PI * t), q = 2.5;
    const w = (2 * Math.PI * fc) / SR, a = Math.sin(w) / (2 * q);
    // state-variable-ish two-pole resonator
    const y = noise() * a + 2 * Math.cos(w) * (1 - a) * b1 - (1 - 2 * a) * b2;
    b2 = b1; b1 = y;
    x[i] = y * Math.pow(Math.sin(Math.PI * t), 1.6);
  }
  const peak = x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  return x.map((v) => (v / peak) * vol);
}

/** A mouse click: two short filtered ticks (press, release). */
function click() {
  const x = new Float32Array(Math.round(0.09 * SR));
  for (const [at, f, v] of [[0, 3200, 0.55], [0.055, 4200, 0.3]] as const) {
    let prev = 0;
    for (let i = 0; i < 0.012 * SR; i++) { const n = noise(); x[Math.round(at * SR) + i] += (n - prev * 0.7) * v * Math.exp(-i / SR * 600) + Math.sin((2 * Math.PI * f * i) / SR) * v * 0.3 * Math.exp(-i / SR * 900); prev = n; }
  }
  return x;
}
/** Six seconds of light typing: keys at a human, uneven pace, the odd space bar. */
function typing() {
  const x = new Float32Array(6 * SR);
  let t = 0.01;
  while (t < 5.9) {
    const space = ((noise() + 1) / 2) < 0.15, v = (space ? 0.35 : 0.22) * (0.7 + ((noise() + 1) / 2) * 0.6);
    let prev = 0;
    for (let i = 0; i < (space ? 0.03 : 0.018) * SR; i++) { const n = noise(); x[Math.round(t * SR) + i] += (n - prev * (space ? 0.3 : 0.8)) * v * Math.exp(-i / SR * (space ? 160 : 320)); prev = n; }
    t += 0.055 + ((noise() + 1) / 2) * 0.06;
  }
  return x;
}
/** The hit on «Жоқ!»: a low thump with a bright crack on top. */
function hit() {
  const x = new Float32Array(Math.round(0.9 * SR));
  let ph = 0;
  for (let i = 0; i < x.length; i++) { const t = i / SR; ph += (2 * Math.PI * (45 + 120 * Math.exp(-t * 25))) / SR; x[i] = Math.sin(ph) * Math.exp(-t * 5) * 0.8 + noise() * Math.exp(-t * 30) * 0.35; }
  return x;
}

mkdirSync(new URL("../public/sfx/", import.meta.url), { recursive: true });
wav("click", click());
wav("typing", typing());
wav("hit", hit());
wav("boing", tones([{ f: 220, to: 660, len: 0.12, vol: 0.3, wave: "triangle" }, { f: 660, to: 520, at: 0.1, len: 0.16, vol: 0.2, wave: "triangle" }]));
wav("tap", tones([{ f: 620, to: 420, len: 0.07, vol: 0.3 }]));
wav("pick", tones([{ f: 880, len: 0.06, vol: 0.3, wave: "triangle" }, { f: 1175, at: 0.05, len: 0.08, vol: 0.25, wave: "triangle" }]));
wav("send", tones([{ f: 420, to: 840, len: 0.14, vol: 0.3 }]));
wav("step", tones([{ f: 784, len: 0.1, vol: 0.3 }, { f: 988, at: 0.08, len: 0.14, vol: 0.3 }]));
wav("ok", tones([523.25, 659.25, 783.99].map((f, i) => ({ f, at: i * 0.11, len: 0.3, vol: 0.35 }))));
wav("pop", tones([{ f: 300, to: 900, len: 0.08, vol: 0.35 }]));
wav("tick", tones([{ f: 2200, to: 1600, len: 0.025, vol: 0.12, wave: "triangle" }]));
wav("sparkle", tones([1568, 2093, 2637, 3136].map((f, i) => ({ f, at: i * 0.06, len: 0.35, vol: 0.12 }))));
wav("whoosh", whoosh());
wav("whoosh-soft", whoosh(0.8, 200, 1400, 0.3));
console.log("sfx written");
