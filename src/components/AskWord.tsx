"use client";
import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { explainWord } from "@/app/oqushy/sozdik/actions";
import { Submit } from "./Submit";

/** Asks the AI about a word the school dictionary lacks. */
export function AskWord({ word, limit }: { word: string; limit: number }) {
  const [state, action] = useActionState(explainWord, undefined);
  const ok = state && "meaning" in state ? state : undefined;
  return (
    <div className="card flex flex-col gap-3">
      {ok ? (
        <>
          <p className="flex flex-wrap items-center gap-2">
            <b className="text-xl">{ok.word}</b>
            {ok.ai && <span className="tag bg-violet-soft">ЖИ түсіндірмесі</span>}
          </p>
          <p className="leading-relaxed">{ok.meaning}</p>
          <p role="status" className="text-sm font-bold text-green-ink">{ok.saved ? "✓ Сөздігіңе қосылды" : "Демо режимде сөздікке сақталмайды."}</p>
          {ok.ai && <p className="text-sm text-muted">ЖИ қателесуі мүмкін: күмәнді болса, мұғаліммен не түсіндірме сөздікпен тексер.</p>}
        </>
      ) : (
        <form action={action} className="flex flex-col gap-3">
          <p>
            Мектеп сөздігінде «<b>{word}</b>» жоқ. ЖИ-ден қысқа түсіндірме сұрап, сөздігіңе қосуға болады.
          </p>
          <input type="hidden" name="word" value={word} />
          <Submit className="btn-primary w-fit">
            <Sparkles className="size-4" aria-hidden="true" /> ЖИ-ден сұрау
          </Submit>
          <p className="text-sm text-muted">Бір сұрау күндік {limit} сұрақтың біреуі (чатпен ортақ). Басқа оқушы сұраған сөз шектен алынбайды.</p>
          {state && "error" in state && (
            <p role="alert" className="text-sm font-bold text-red-ink">{state.error}</p>
          )}
        </form>
      )}
    </div>
  );
}
