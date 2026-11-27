"use client";
import { startTransition, useActionState, useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { creativeFeedback, saveCreative } from "@/app/oqushy/actions";
import { MIN_WORDS, words, type CreativeKind } from "@/lib/creative";
import { MicButton } from "./MicButton";
import { Submit } from "./Submit";

/** One creative task: the text (kept in state, so a failed save loses nothing) and the AI-comment request. */
export function CreativeForm({ slug, kind, cast, saved, canAsk }: { slug: string; kind: CreativeKind; cast: string[]; saved: { text: string; to?: string }; canAsk: boolean }) {
  const [text, setText] = useState(saved.text);
  const [to, setTo] = useState(saved.to ?? "");
  const [state, save, saving] = useActionState(saveCreative.bind(null, slug, kind), undefined);
  const [fb, ask] = useActionState(creativeFeedback.bind(null, slug, kind), undefined);
  const n = words(text);
  const dirty = text.trim() !== saved.text || to !== (saved.to ?? "");
  const id = `${kind}-text`;
  return (
    <div className="flex flex-col gap-4">
      {/* submitted by hand: a form action would reset the form afterwards, and a reset <select> stops showing its state */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => save(fd));
        }}
        className="flex flex-col gap-3"
      >
        {kind === "hat" && (
          <div>
            <label htmlFor="hat-to" className="label">Кімге</label>
            <select id="hat-to" name="to" value={to} onChange={(e) => setTo(e.target.value)} required className="field">
              <option value="" disabled>Кейіпкерді таңда</option>
              {cast.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        )}
        <div>
          <label htmlFor={id} className="label">{kind === "hat" ? "Хатың" : "Сенің нұсқаң"}</label>
          <textarea id={id} name="text" value={text} onChange={(e) => setText(e.target.value)} rows={10} maxLength={6000} className="field" placeholder={kind === "hat" ? "Сәлем, …" : "Сол кезде…"} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MicButton target={id} />
          <span className={`num text-sm font-bold ${n >= MIN_WORDS ? "text-green-ink" : "text-muted"}`}>Сөз саны: {n} / {MIN_WORDS}</span>
        </div>
        <button className="btn-primary w-fit" disabled={saving || !dirty || n < MIN_WORDS} aria-busy={saving || undefined}>
          {saving && <LoaderCircle className="size-4 shrink-0 animate-spin" aria-hidden="true" />}
          Сақтау
        </button>
        <p role="status" aria-live="polite" className={`text-sm font-bold ${state?.error ? "text-red-ink" : "text-green-ink"}`}>
          {state?.error ?? state?.ok}
        </p>
      </form>
      {canAsk && !dirty && (
        <form action={ask} className="flex flex-col gap-2 rounded-2xl bg-violet-faint p-4">
          <p className="text-sm">ЖИ жұмысыңды үш критерий бойынша оқып, пікір мен кеңес береді. Бағаны мұғалім қояды.</p>
          <Submit className="btn-ghost w-fit">
            <Sparkles className="size-4" aria-hidden="true" /> ЖИ пікірін алу
          </Submit>
          {fb?.error && <p role="alert" className="text-sm font-bold text-red-ink">{fb.error}</p>}
        </form>
      )}
    </div>
  );
}
