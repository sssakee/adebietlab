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
/** Short synthesized chime: rising notes for a correct answer, two soft low notes otherwise. */
export function playSfx(ok: boolean) {
  if (!soundOn()) return;
  ctx ??= new AudioContext();
  const notes = ok ? [523.25, 659.25, 783.99] : [392, 329.63];
  notes.forEach((f, i) => {
    const t = ctx!.currentTime + i * 0.11;
    const o = ctx!.createOscillator();
    const g = ctx!.createGain();
    o.type = "sine";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(ctx!.destination);
    o.start(t);
    o.stop(t + 0.32);
  });
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
      aria-pressed={on}
      onClick={() => {
        localStorage.setItem(KEY, on ? "off" : "on");
        window.dispatchEvent(new Event(KEY));
        if (!on) playSfx(true);
      }}
      className="flex min-h-11 items-center gap-2 rounded-2xl px-3 text-sm font-bold text-muted hover:bg-soft hover:text-ink"
    >
      {on ? <Volume2 className="size-5" aria-hidden="true" /> : <VolumeX className="size-5" aria-hidden="true" />}
      {on ? "Дыбыс қосулы" : "Дыбыс өшірулі"}
    </button>
  );
}
