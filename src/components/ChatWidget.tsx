"use client";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { sfx } from "./Sfx";

type Msg = { role: "user" | "assistant"; content: string };
type Info = { mode: "off" | "limited" | "full"; title: string | null; remaining: number };

const QUICK = ["Бұл сөздің мағынасы не?", "Кейіпкер туралы түсіндірші", "Тапсырманы қалай бастаймын?"];
const MODE_NOTE = { off: "", limited: "Шектеулі режим: тек бағыт пен кеңес беремін.", full: "" };

export function ChatWidget() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<Info | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Context (and so the AI mode) changes with the page; the conversation starts over too.
  const [seenPath, setSeenPath] = useState(path);
  if (seenPath !== path) {
    setSeenPath(path);
    setMsgs([]);
    setError("");
  }
  useEffect(() => {
    let live = true;
    fetch(`/api/chat?path=${encodeURIComponent(path)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => live && setInfo(j))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [path]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const off = info?.mode === "off";

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setError("");
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, messages: next }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        setMsgs(next.slice(0, -1));
        setInput(q);
        setError(j.error ?? "Қате шықты. Қайта көр.");
        sfx.no();
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMsgs([...next, { role: "assistant", content: acc }]);
      }
      setInfo((i) => i && { ...i, remaining: Math.max(0, i.remaining - 1) });
      sfx.step();
    } catch {
      setMsgs(next.slice(0, -1));
      setError("Желі қатесі. Интернетті тексеріп, қайта көр.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={off}
        aria-expanded={open}
        aria-controls="chat-panel"
        title={off ? "Бұл тапсырмада мұғалім ЖИ көмекшісін өшірген" : undefined}
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-3 z-30 flex items-center gap-2 rounded-full bg-surface p-2 font-bold sm:pr-5 border-2 border-line shadow-[0_4px_0_var(--color-line)] transition-[translate,box-shadow,border-color] hover:-translate-y-1 hover:border-primary hover:shadow-[0_6px_0_var(--color-primary)] active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60 sm:right-6 lg:bottom-6"
      >
        <span className="grid size-12 place-items-center overflow-hidden rounded-full bg-accent-soft">
          {/* the mascot waves when hovered */}
          <Image src="/mascot/kyrantay.png" alt="" width={40} height={51} className="wiggle" />
        </span>
        {/* on phones only the mascot shows, so the button covers less of the page */}
        <span className="max-sm:sr-only">{off ? "ЖИ өшірулі" : "Сұрағың бар ма?"}</span>
      </button>

      {open && (
        <div className="backdrop fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)} aria-hidden="true" />
      )}
      <section
        id="chat-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-title"
        hidden={!open}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-surface shadow-2xl sm:inset-y-3 sm:right-3 sm:rounded-[28px]"
      >
        <header className="flex items-center gap-3 border-b border-line p-4">
          <Image src="/mascot/kyrantay.png" alt="" width={44} height={56} />
          <div className="min-w-0 flex-1">
            <h2 id="chat-title" className="font-bold">
              Қырантай көмекші
            </h2>
            <p className="truncate text-xs text-muted">
              {info?.title ? `«${info.title}» бойынша` : "Әдебиет пен қазақ тілі бойынша"}
              {info && ` · бүгін ${info.remaining} сұрақ қалды`}
            </p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-full hover:bg-soft" aria-label="Жабу">
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4" aria-live="polite">
          {info?.mode && MODE_NOTE[info.mode] && <p className="tag self-start bg-gold-soft text-ink">{MODE_NOTE[info.mode]}</p>}
          {!msgs.length && (
            <div className="rounded-2xl bg-soft p-4 text-sm">
              <p className="font-bold">Сәлем! Мен Қырантаймын.</p>
              <p className="mt-1 text-muted">Шығарма, кейіпкер немесе тапсырма туралы сұра. Жауапты бірге іздейміз.</p>
            </div>
          )}
          {msgs.map((m, i) => (
            <p
              key={i}
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[15px] ${m.role === "user" ? "pop self-end bg-primary text-on-color" : "self-start bg-soft"}`}
            >
              <span className="sr-only">{m.role === "user" ? "Сен: " : "Қырантай: "}</span>
              {m.content || <span className="text-muted">Ойланып жатырмын…</span>}
            </p>
          ))}
          {error && (
            <p role="alert" className="rounded-2xl bg-red-soft p-3 text-sm font-bold text-red-ink">
              {error}
            </p>
          )}
        </div>

        <div className="border-t border-line p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <button key={q} type="button" className="rounded-full border-2 border-line px-3 py-2 text-sm font-bold transition-colors hover:border-primary hover:bg-accent-soft hover:text-primary-dark" onClick={() => send(q)} disabled={busy}>
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
            <label htmlFor="chat-input" className="sr-only">
              Сұрағың
            </label>
            <textarea
              id="chat-input"
              ref={inputRef}
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
              placeholder="Сұрағыңды жаз…"
              className="field resize-none"
            />
            <button className="btn-primary size-12 shrink-0 px-0" disabled={busy || !input.trim()} aria-label="Жіберу">
              <Send className="size-5" aria-hidden="true" />
            </button>
          </form>
          <p className="mt-3 text-xs text-muted">ЖИ қателесуі мүмкін. Маңызды нәрсені мұғаліміңнен тексер.</p>
        </div>
      </section>
    </>
  );
}
