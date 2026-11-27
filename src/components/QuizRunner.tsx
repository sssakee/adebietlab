"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, LoaderCircle, RotateCw, X } from "lucide-react";
import { submitQuiz, type QuizResult } from "@/app/oqushy/baige/actions";
import { playSfx, sfx } from "./Sfx";

type Q = { q: string; options: string[] };

/** One question at a time; answers go to the server only at the end, so the key never reaches the page. */
export function QuizRunner({ quiz, seed, questions }: { quiz: string; seed: string; questions: Q[] }) {
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [pending, start] = useTransition();
  const q = questions[i];
  const last = i === questions.length - 1;

  const finish = () =>
    start(async () => {
      const r = await submitQuiz(quiz, seed, picks);
      setResult(r);
      if (!("error" in r)) playSfx(r.score * 2 >= r.total);
    });

  if (result && !("error" in result))
    return (
      <div className="flex flex-col gap-4">
        <div className="card flex flex-wrap items-center gap-5" role="status">
          <p className="num text-5xl font-bold">
            {result.score}<span className="text-2xl text-muted">/{result.total}</span>
          </p>
          <div>
            <p className="text-xl font-bold">{result.score === result.total ? "Бәрі дұрыс! Жарайсың!" : result.score * 2 >= result.total ? "Жақсы нәтиже!" : "Қайталап көрейік"}</p>
            <p className="text-muted">{result.gained ? `+${result.gained} ашылым жұлдызы` : "Жаңа жұлдыз жоқ: бұл нәтиже бұрынғыдан асқан жоқ."}</p>
          </div>
        </div>
        <ol className="flex flex-col gap-3">
          {questions.map((x, k) => {
            const ok = picks[k] === result.answers[k];
            return (
              <li key={k} className={`rounded-2xl p-4 ${ok ? "bg-green-soft" : "bg-red-soft"}`}>
                <p className="flex items-start gap-2 font-bold">
                  {ok ? <Check className="mt-0.5 size-5 shrink-0 text-green-ink" aria-label="Дұрыс" /> : <X className="mt-0.5 size-5 shrink-0 text-red-ink" aria-label="Қате" />}
                  {x.q}
                </p>
                <p className="mt-1 pl-7 text-sm">
                  {ok ? `Жауабың: ${x.options[picks[k]]}` : `Сенің жауабың: ${x.options[picks[k]]}. Дұрысы: ${x.options[result.answers[k]]}`}
                </p>
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap gap-3">
          <Link href="/oqushy/baige" className="btn-primary h-14 px-8">Бәйгеге оралу</Link>
          <button type="button" className="btn-ghost h-14 px-6" onClick={() => (setResult(null), setPicks([]), setI(0))}>
            <RotateCw className="size-5" aria-hidden="true" /> Қайта өту
          </button>
        </div>
      </div>
    );

  return (
    <div className="card flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-muted">Сұрақ {i + 1} / {questions.length}</p>
        <div className="flex gap-1.5" aria-hidden="true">
          {questions.map((_, k) => (
            <span key={k} className={`h-2 w-8 rounded-full ${k < i || picks[k] !== undefined ? "bg-primary" : "bg-accent-soft"}`} />
          ))}
        </div>
      </div>
      <fieldset key={i} className="rise">
        <legend className="mb-4 text-xl font-bold">{q.q}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {q.options.map((o, k) => (
            <label key={k} className="chip min-h-14 cursor-pointer justify-start px-5 text-left">
              <input
                type="radio"
                name={`q${i}`}
                className="sr-only"
                checked={picks[i] === k}
                onChange={() => setPicks((p) => Object.assign([...p], { [i]: k }))}
              />
              {o}
            </label>
          ))}
        </div>
      </fieldset>
      {"error" in (result ?? {}) && <p role="alert" className="rounded-2xl bg-red-soft p-3 font-bold text-red-ink">{(result as { error: string }).error}</p>}
      <div className="flex justify-end gap-3">
        {i > 0 && (
          <button type="button" className="btn-ghost h-14 px-6" onClick={() => setI(i - 1)}>Артқа</button>
        )}
        <button
          type="button"
          className="btn-primary h-14 px-8"
          disabled={picks[i] === undefined || pending}
          onClick={() => (last ? finish() : (setI(i + 1), sfx.step()))}
        >
          {pending && <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />}
          {last ? "Нәтижені көру" : "Келесі"}
        </button>
      </div>
    </div>
  );
}
