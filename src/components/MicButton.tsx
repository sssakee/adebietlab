"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import { Mic, Square } from "lucide-react";

// Web Speech API: Chrome and Edge send the audio to their speech service, Safari recognises on the
// device. Kazakh (kk-KZ) depends on the browser; where the API is missing the button is not shown.
type Result = { isFinal: boolean; 0: { transcript: string } };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<Result> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type Ctor = new () => Recognition;
const recognizer = () => {
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};
const never = () => () => {};

const ERROR: Record<string, string> = {
  "not-allowed": "Микрофонға рұқсат берілмеді. Браузердің мекенжай жолындағы белгіден рұқсат бер.",
  "service-not-allowed": "Бұл браузерде дауысты тану өшірулі.",
  "no-speech": "Дауыс естілмеді. Қайта басып, сөйлеп көр.",
  "language-not-supported": "Бұл браузер қазақ тілін тани алмайды. Chrome-да көріп, не жазып жібер.",
  network: "Дауысты тану үшін интернет керек.",
};

/** Speak instead of typing: the recognised text is added to the field with id `target`. */
export function MicButton({ target }: { target: string }) {
  const supported = useSyncExternalStore(never, () => !!recognizer(), () => false);
  const [on, setOn] = useState(false);
  const [error, setError] = useState("");
  const rec = useRef<Recognition | null>(null);
  if (!supported) return null;

  const append = (text: string) => {
    const el = document.getElementById(target) as HTMLTextAreaElement | HTMLInputElement | null;
    if (!el || !text.trim()) return;
    const next = `${el.value}${el.value && !/\s$/.test(el.value) ? " " : ""}${text.trim()}`;
    // React keeps its own copy of the value: set it through the native setter and fire input, so onChange runs.
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set?.call(el, next);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const toggle = () => {
    if (on) return rec.current?.stop();
    const r = new (recognizer()!)();
    r.lang = "kk-KZ";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) append(e.results[i][0].transcript);
    };
    r.onerror = (e) => e.error !== "aborted" && setError(ERROR[e.error] ?? "Дауысты тану істемеді. Жазып жібер.");
    r.onend = () => setOn(false);
    setError("");
    rec.current = r;
    try {
      r.start();
      setOn(true);
    } catch {
      setError("Дауысты тану басталмады. Қайта көр.");
    }
  };

  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        aria-controls={target}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold ${on ? "bg-red text-on-color" : "bg-soft text-ink hover:bg-accent-soft"}`}
      >
        {on ? <Square className="size-4" aria-hidden="true" /> : <Mic className="size-4" aria-hidden="true" />}
        {on ? "Тоқтату" : "Дауыспен айту"}
      </button>
      {on && <span role="status" className="text-sm font-bold text-red-ink">Тыңдап тұрмын…</span>}
      {error && <span role="alert" className="text-sm text-red-ink">{error}</span>}
    </span>
  );
}
