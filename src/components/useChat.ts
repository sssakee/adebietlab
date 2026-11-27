"use client";
import { useState } from "react";
import { sfx } from "./Sfx";

export type Msg = { role: "user" | "assistant"; content: string };

/** One conversation with /api/chat; the answer streams in. path tells the server what the student is looking at. */
export function useChat(path: string, onAnswer?: () => void) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
      onAnswer?.();
      sfx.step();
    } catch {
      setMsgs(next.slice(0, -1));
      setError("Желі қатесі. Интернетті тексеріп, қайта көр.");
    } finally {
      setBusy(false);
    }
  }

  return { msgs, setMsgs, input, setInput, busy, error, setError, send };
}
