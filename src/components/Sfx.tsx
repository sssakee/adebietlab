"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";

// Sounds are off until the user turns them on; the choice lives in localStorage.
const KEY = "al_sound";
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(KEY, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(KEY, cb);
  };
};
const soundOn = () => localStorage.getItem(KEY) === "on";

let ctx: AudioContext | undefined;
type Note = { f: number; to?: number; at?: number; len?: number; vol?: number; wave?: OscillatorType };

/** Plays short synthesized notes; nothing is downloaded. Silent unless the user turned sound on. */
function tones(notes: Note[]) {
  if (!soundOn()) return;
  ctx ??= new AudioContext();
  const now = ctx.currentTime;
  for (const { f, to, at = 0, len = 0.12, vol = 0.12, wave = "sine" } of notes) {
    const t = now + at;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + len);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + len + 0.02);
  }
}

/** The site's sound palette: soft, short, never louder than a click. */
export const sfx = {
  tap: () => tones([{ f: 620, to: 420, len: 0.07, vol: 0.06 }]),
  pick: () => tones([{ f: 880, len: 0.06, vol: 0.06, wave: "triangle" }, { f: 1175, at: 0.05, len: 0.08, vol: 0.05, wave: "triangle" }]),
  send: () => tones([{ f: 420, to: 840, len: 0.14, vol: 0.07 }]),
  page: () => tones([{ f: 300, to: 520, len: 0.12, vol: 0.035 }]),
  step: () => tones([{ f: 784, len: 0.1, vol: 0.07 }, { f: 988, at: 0.08, len: 0.14, vol: 0.07 }]),
  ok: () => tones([523.25, 659.25, 783.99].map((f, i) => ({ f, at: i * 0.11, len: 0.3, vol: 0.16 }))),
  no: () => tones([392, 329.63].map((f, i) => ({ f, at: i * 0.11, len: 0.3, vol: 0.14 }))),
};

/** Rising notes for a correct answer, two soft low notes otherwise. */
export function playSfx(ok: boolean) {
  (ok ? sfx.ok : sfx.no)();
}

/** Plays once when it appears; with `watch`, plays only when that value changes later. */
export function Sfx({ ok, watch }: { ok: boolean; watch?: unknown }) {
  const first = useRef(watch);
  useEffect(() => {
    if (watch !== undefined && watch === first.current) return;
    playSfx(ok);
  }, [ok, watch]);
  return null;
}

export function SoundToggle() {
  const on = useSyncExternalStore(subscribe, soundOn, () => false);
  return (
    <button
      type="button"
      data-tour="sound"
      aria-pressed={on}
      onClick={() => {
        localStorage.setItem(KEY, on ? "off" : "on");
        window.dispatchEvent(new Event(KEY));
        if (!on) playSfx(true);
      }}
      className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-2xl px-3 lg:justify-start text-sm font-bold text-muted hover:bg-soft hover:text-ink"
    >
      {on ? <Volume2 className="wiggle size-5" aria-hidden="true" /> : <VolumeX className="wiggle size-5" aria-hidden="true" />}
      <span className="max-lg:sr-only">{on ? "Дыбыс қосулы" : "Дыбыс өшірулі"}</span>
    </button>
  );
}
