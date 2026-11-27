"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { RotateCcw, Send } from "lucide-react";
import { MicButton } from "./MicButton";
import { useChat } from "./useChat";

/** The interview itself: the same chat endpoint, with the page telling the server who speaks. */
export function Interview({ name, starters }: { name: string; starters: string[] }) {
  const path = usePathname();
  const [left, setLeft] = useState<number | null>(null);
  const { msgs, setMsgs, input, setInput, busy, error, setError, send } = useChat(path, () => setLeft((n) => (n === null ? n : Math.max(0, n - 1))));
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/chat?path=${encodeURIComponent(path)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => live && j && setLeft(j.remaining))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [path]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs]);

  return (
    <section className="card flex min-h-[28rem] flex-col gap-4" aria-label={`${name}: сұхбат`}>
      <div ref={listRef} className="flex max-h-[60dvh] flex-1 flex-col gap-3 overflow-y-auto" aria-live="polite">
        {!msgs.length && (
          <p className="rounded-2xl bg-soft p-4 text-muted">
            Төмендегі сұрақтың бірін таңда не өзің жаз. {name} шығармадағы оқиғаларға сүйеніп жауап береді.
          </p>
        )}
        {msgs.map((m, i) => (
          <p key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 ${m.role === "user" ? "pop self-end bg-primary text-on-color" : "self-start bg-soft"}`}>
            <span className={m.role === "user" ? "sr-only" : "mb-1 block text-xs font-bold text-primary"}>{m.role === "user" ? "Сен: " : name}</span>
            {m.content || <span className="text-muted">Ойланып жатыр…</span>}
          </p>
        ))}
        {error && (
          <p role="alert" className="rounded-2xl bg-red-soft p-3 text-sm font-bold text-red-ink">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {starters.map((q) => (
          <button key={q} type="button" className="chip min-h-10 px-3 text-sm" onClick={() => send(q)} disabled={busy}>
            {q}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2"
      >
        <label htmlFor="interview-input" className="sr-only">
          Сұрағың
        </label>
        <textarea
          id="interview-input"
          rows={2}
          maxLength={2000}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder={`${name} кейіпкеріне сұрақ…`}
          className="field resize-none"
        />
        <button className="btn-primary size-12 shrink-0 px-0" disabled={busy || !input.trim()} aria-label="Жіберу">
          <Send className="size-5" aria-hidden="true" />
        </button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MicButton target="interview-input" />
        {msgs.length > 0 && (
          <button
            type="button"
            className="btn-ghost"
            disabled={busy}
            onClick={() => {
              setMsgs([]);
              setError("");
            }}
          >
            <RotateCcw className="size-4" aria-hidden="true" /> Қайта бастау
          </button>
        )}
      </div>
      <p className="text-xs text-muted">
        Бұл — кейіпкер рөліндегі ЖИ, ол қателесуі мүмкін: шығарманың өзімен тексер. Сұхбат сақталмайды.
        {left !== null && ` Бүгін ${left} сұрақ қалды (Қырантаймен ортақ).`}
      </p>
    </section>
  );
}
