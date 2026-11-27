"use client";
import { useId, useState, useTransition } from "react";
import { BookmarkPlus, Check, X } from "lucide-react";
import { saveWord } from "@/app/oqushy/sozdik/actions";

/** A dictionary word inside running text: pressing it opens the explanation (native popover). */
export function Word({ text, word, meaning, saved }: { text: string; word: string; meaning: string; saved: boolean }) {
  const id = useId();
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" popoverTarget={id} className="gloss">
        {text}
        <span className="sr-only"> (түсіндірмесі)</span>
      </button>
      <span popover="auto" id={id} role="dialog" aria-label={`«${word}» сөзінің түсіндірмесі`} className="card m-auto w-[min(92vw,26rem)] whitespace-normal p-5 text-base text-ink backdrop:bg-ink/30">
        <span className="flex items-start justify-between gap-3">
          <b className="text-xl">{word}</b>
          <button type="button" popoverTarget={id} popoverTargetAction="hide" className="grid size-9 shrink-0 place-items-center rounded-xl bg-soft hover:bg-accent-soft" aria-label="Жабу">
            <X className="size-4" aria-hidden="true" />
          </button>
        </span>
        <span className="mt-2 block leading-relaxed">{meaning}</span>
        {saved || done ? (
          <span role="status" className="mt-4 flex items-center gap-2 font-bold text-green-ink">
            <Check className="size-4" aria-hidden="true" /> Сөздігіңде бар
          </span>
        ) : (
          <button type="button" className="btn-primary mt-4" disabled={pending} onClick={() =>
              start(async () => {
                await saveWord(word);
                setDone(true);
              })
            }>
            <BookmarkPlus className="size-4" aria-hidden="true" /> Сөздігіме қосу
          </button>
        )}
      </span>
    </>
  );
}
