"use client";
import { useEffect, useSyncExternalStore } from "react";
import { Music, VolumeOff } from "lucide-react";
import { EIGHTH, hits } from "@/lib/music";

// Background music is on unless the user turned it off. Browsers only allow sound after the
// first click or key press, so it starts then. The choice lives in localStorage.
const KEY = "al_music";
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(KEY, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(KEY, cb);
  };
};
const musicOn = () => localStorage.getItem(KEY) !== "off";

const VOLUME = 0.18;
let ctx: AudioContext | undefined;
let master: GainNode | undefined;
let timer: ReturnType<typeof setInterval> | undefined;
let step = 0;
let next = 0;
let ducked = false;
const plucks = new Map<number, AudioBuffer>();
/** Samples in the string's loop; with the averaging filter it sounds at sampleRate / (period + 0.5). */
const period = (sr: number, f: number) => Math.max(2, Math.round(sr / f - 0.5));

/** Karplus–Strong plucked string: a burst of noise in a short decaying loop sounds like a dombyra string. */
function pluck(c: AudioContext, f: number) {
  let b = plucks.get(f);
  if (b) return b;
  const sr = c.sampleRate;
  const n = Math.round(sr * (f < 200 ? 1.6 : 1.1));
  const p = period(sr, f);
  b = c.createBuffer(1, n, sr);
  const y = b.getChannelData(0);
  let seed = Math.round(f * 1000);
  for (let i = 0; i < p; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    y[i] = (seed / 0x7fffffff) * 2 - 1;
  }
  const keep = f < 200 ? 0.997 : 0.994;
  for (let i = p; i < n; i++) y[i] = keep * 0.5 * (y[i - p] + y[Math.max(0, i - p - 1)]);
  for (let i = n - 2000; i < n; i++) y[i] *= (n - i) / 2000; // no click at the end
  plucks.set(f, b);
  return b;
}

function play(c: AudioContext, out: AudioNode, t: number) {
  for (const h of hits(step)) {
    const at = Math.max(c.currentTime, t + h.at + (Math.random() - 0.5) * 0.012); // a human hand is never on the grid
    const vol = h.vol * (0.88 + Math.random() * 0.24);
    const g = c.createGain();
    g.connect(out);
    if (h.kind === "drum") {
      const o = c.createOscillator();
      o.frequency.setValueAtTime(h.f, at);
      o.frequency.exponentialRampToValueAtTime(h.f / 2, at + 0.15);
      g.gain.setValueAtTime(vol, at);
      g.gain.exponentialRampToValueAtTime(0.001, at + 0.28);
      o.connect(g);
      o.start(at);
      o.stop(at + 0.3);
    } else {
      const s = c.createBufferSource();
      s.buffer = pluck(c, h.f);
      // The loop is a whole number of samples; playback rate tunes the string exactly.
      s.playbackRate.value = (h.f * (period(c.sampleRate, h.f) + 0.5)) / c.sampleRate;
      g.gain.value = vol * 0.5;
      s.connect(g);
      s.start(at);
    }
  }
}

function tick() {
  if (!ctx || !master) return;
  if (next < ctx.currentTime + 0.05) next = ctx.currentTime + 0.05;
  while (next < ctx.currentTime + 0.4) {
    play(ctx, master, next);
    next += EIGHTH;
    step++;
  }
}

function level() {
  if (!ctx || !master) return;
  const target = ducked ? 0.0001 : VOLUME;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(target, ctx.currentTime + (target === VOLUME ? 3 : 0.4));
}

function start() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.0001;
    const soft = ctx.createBiquadFilter(); // takes the edge off the strings
    soft.type = "lowpass";
    soft.frequency.value = 3200;
    master.connect(soft).connect(ctx.destination);
  }
  void ctx.resume();
  level();
  timer ??= setInterval(tick, 100);
  tick();
}

function stop() {
  if (!ctx || !master) return;
  clearInterval(timer);
  timer = undefined;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15);
  const c = ctx;
  setTimeout(() => !timer && c.suspend(), 800);
}

/** Quiets the music while the microphone listens, so it doesn't end up in the transcript. */
export function duckMusic(on: boolean) {
  ducked = on;
  level();
}

// Phones grant sound only on a finished tap, desktops already on pointerdown: listen to all.
const GESTURES = ["pointerdown", "keydown", "click", "touchend"] as const;

/** Mounted once in the root layout: keeps playing across pages, pauses in a hidden tab. */
export function BackgroundMusic() {
  useEffect(() => {
    const first = () => {
      if (musicOn() && (!timer || ctx?.state !== "running")) start();
    };
    const toggle = () => (musicOn() ? start() : stop());
    const shown = () => {
      if (timer) void (document.hidden ? ctx?.suspend() : ctx?.resume());
    };
    for (const g of GESTURES) document.addEventListener(g, first, { once: true, capture: true });
    window.addEventListener(KEY, toggle);
    document.addEventListener("visibilitychange", shown);
    return () => {
      for (const g of GESTURES) document.removeEventListener(g, first, { capture: true });
      window.removeEventListener(KEY, toggle);
      document.removeEventListener("visibilitychange", shown);
    };
  }, []);
  return null;
}

export function MusicToggle({ className = "" }: { className?: string }) {
  const on = useSyncExternalStore(subscribe, musicOn, () => true);
  return (
    <button
      type="button"
      aria-pressed={on}
      title={on ? "Әуен қосулы" : "Әуен өшірулі"}
      onClick={() => {
        localStorage.setItem(KEY, on ? "off" : "on");
        window.dispatchEvent(new Event(KEY));
      }}
      className={`flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-bold text-muted hover:bg-soft hover:text-ink lg:justify-start ${className}`}
    >
      {on ? <Music className="wiggle size-5" aria-hidden="true" /> : <VolumeOff className="wiggle size-5" aria-hidden="true" />}
      <span className="max-lg:sr-only">{on ? "Әуен қосулы" : "Әуен өшірулі"}</span>
    </button>
  );
}
