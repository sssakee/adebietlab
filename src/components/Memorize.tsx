"use client";
import { useState, useTransition } from "react";
import { Check, Eye, RotateCw } from "lucide-react";
import { hidden, LEVELS, sameWord, splitWord } from "@/lib/memorize";
import { memorized } from "@/app/oqushy/zhattau/actions";
import { playSfx } from "./Sfx";

type Verse = { key: string; lines: string[]; by: string };
const OWN = "own";

/** Words of the poem disappear level by level; the student types them back from memory. */
export function Memorize({ verses }: { verses: Verse[] }) {
  const [key, setKey] = useState(verses[0]?.key ?? OWN);
  const [own, setOwn] = useState("");
  const [level, setLevel] = useState(1);
  const [typed, setTyped] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const [shown, setShown] = useState(false);
  const [reward, setReward] = useState<number | null>(null);
  const [, start] = useTransition();

  const verse = key === OWN ? { key: OWN, lines: own.split("\n").filter((l) => l.trim()), by: "Өз мәтінім" } : verses.find((v) => v.key === key)!;
  let n = 0;
  const lines = verse.lines.map((l) => l.split(/\s+/).filter(Boolean).map((w) => ({ ...splitWord(w), i: splitWord(w).core ? n++ : -1 })));
  const words = lines.flat().filter((w) => w.i >= 0);
  const blanks = words.filter((w) => hidden(level, w.i));
  const right = blanks.filter((w) => sameWord(typed[w.i] ?? "", w.core)).length;
  const done = checked && blanks.length > 0 && right === blanks.length;

  const reset = (lvl = level) => (setLevel(lvl), setTyped({}), setChecked(false), setShown(false), setReward(null));
  const check = () => {
    setChecked(true);
    const ok = right === blanks.length;
    playSfx(ok);
    if (ok && level === LEVELS.length - 1 && key !== OWN)
      start(async () => setReward((await memorized(key, words.map((w) => typed[w.i] ?? ""))).points));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <fieldset className="card flex flex-col gap-2 self-start">
        <legend className="sr-only">Мәтін</legend>
        <p className="mb-1 font-bold">Не жаттаймыз?</p>
        {verses.map((v) => (
          <label key={v.key} className="chip cursor-pointer justify-start text-left">
            <input type="radio" name="verse" className="sr-only" checked={key === v.key} onChange={() => (setKey(v.key), reset(1))} />
            <span>
              <span className="block">{v.lines[0]}</span>
              <span className="block text-xs text-muted">{v.by}</span>
            </span>
          </label>
        ))}
        <label className="chip cursor-pointer justify-start">
          <input type="radio" name="verse" className="sr-only" checked={key === OWN} onChange={() => (setKey(OWN), reset(0))} />
          Өз мәтінімді қоямын
        </label>
        {key === OWN && (
          <>
            <label htmlFor="own" className="label mt-2">Сабақта берілген өлеңді осында қой</label>
            <textarea id="own" rows={6} value={own} onChange={(e) => (setOwn(e.target.value), reset())} className="field" placeholder="Әр жол — жаңа жолда" />
            <p className="text-xs text-muted">Мәтін тек осы бетте тұрады, ешқайда сақталмайды. Жұлдыз тексерілген мәтіндерге ғана беріледі.</p>
          </>
        )}
      </fieldset>

      <section className="card flex flex-col gap-5" aria-labelledby="verse-by">
        <div role="group" aria-label="Деңгей" className="flex flex-wrap gap-2">
          {LEVELS.map((l, i) => (
            <button key={l} type="button" aria-pressed={level === i} onClick={() => reset(i)} className={`tag px-4 py-2 ${level === i ? "bg-primary text-on-color" : "bg-soft"}`}>
              {i}. {l}
            </button>
          ))}
        </div>
        <p id="verse-by" className="text-sm font-bold text-muted">{verse.by}</p>
        {verse.lines.length ? (
          <div className="flex flex-col gap-3 text-xl font-bold leading-relaxed">
            {lines.map((ws, li) => (
              <p key={li} className="flex flex-wrap items-baseline gap-x-2 gap-y-2">
                {ws.map((w, k) =>
                  w.i >= 0 && hidden(level, w.i) ? (
                    <span key={k} className="inline-flex items-baseline">
                      {w.pre}
                      <input
                        aria-label={`${w.i + 1}-сөз`}
                        autoComplete="off"
                        spellCheck={false}
                        value={shown ? w.core : (typed[w.i] ?? "")}
                        readOnly={shown}
                        placeholder={level === 3 ? `${w.core[0]}…` : ""}
                        onChange={(e) => (setTyped({ ...typed, [w.i]: e.target.value }), setChecked(false))}
                        aria-invalid={checked && !sameWord(typed[w.i] ?? "", w.core) ? true : undefined}
                        style={{ width: `${w.core.length + 1.5}ch` }}
                        className={`rounded-lg border-b-4 bg-soft px-1 text-center outline-none focus:bg-accent-soft ${checked ? (sameWord(typed[w.i] ?? "", w.core) ? "border-green text-green-ink" : "border-red text-red-ink") : "border-primary"}`}
                      />
                      {w.post}
                    </span>
                  ) : (
                    <span key={k}>{w.pre}{w.core}{w.post}</span>
                  ),
                )}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-muted">Сол жақта мәтінді таңда не өз мәтініңді қой.</p>
        )}

        {checked && (
          <p role="status" className={`rounded-2xl p-3 font-bold ${done ? "bg-green-soft text-green-ink" : "bg-gold-soft"}`}>
            {done
              ? level === LEVELS.length - 1
                ? `Толық жатқа білесің!${reward ? ` +${reward} жұлдыз` : ""}`
                : "Бәрі дұрыс! Келесі деңгейге өт."
              : `Дұрыс: ${right} / ${blanks.length}. Қызыл сөздерді тағы ойла.`}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {level > 0 && !done && (
            <button type="button" className="btn-primary h-14 px-8" onClick={check} disabled={!verse.lines.length}>
              <Check className="size-5" aria-hidden="true" /> Тексеру
            </button>
          )}
          {(level === 0 || done) && level < LEVELS.length - 1 && (
            <button type="button" className="btn-primary h-14 px-8" onClick={() => reset(level + 1)} disabled={!verse.lines.length}>
              {level === 0 ? "Жасыруды бастау" : "Келесі деңгей"}
            </button>
          )}
          {level > 0 && checked && !done && (
            <button type="button" className="btn-ghost h-14 px-6" onClick={() => setShown(true)}>
              <Eye className="size-5" aria-hidden="true" /> Жауабын көру
            </button>
          )}
          {level > 0 && (
            <button type="button" className="btn-ghost h-14 px-6" onClick={() => reset()}>
              <RotateCw className="size-5" aria-hidden="true" /> Қайта бастау
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
