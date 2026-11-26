"use client";
import { useState, useTransition } from "react";
import { countSyllables, rhymeScheme, syllabifyLine, words } from "@/lib/poem";
import { checkOlen, type OlenResult } from "@/app/oqushy/actions";

const METERS = [
  { v: "7-8", label: "7–8 буынды (жыр өлшемі)" },
  { v: "11", label: "11 буынды (қара өлең өлшемі)" },
];
const RHYMES = ["а-б-а-б", "а-а-а-а", "а-а-б-а", "а-а-б-б"];
const RHYME_COLORS = ["bg-gold-soft text-ink", "bg-violet-soft text-violet", "bg-green-soft text-green-ink", "bg-red-soft text-red-ink"];

function Ending({ line, label, color }: { line: string; label: string; color: string }) {
  const last = words(line).at(-1) ?? "";
  const i = line.toLowerCase().lastIndexOf(last);
  const tag = <span className="ml-2 text-sm font-bold text-muted">({label})</span>;
  if (i < 0 || !last) return <>{line}{tag}</>;
  return (
    <>
      {line.slice(0, i)}
      <mark className={`rounded-lg px-1 ${color}`}>{line.slice(i, i + last.length)}</mark>
      {line.slice(i + last.length)}
      {tag}
    </>
  );
}

export function PoemLab({ slug, lines }: { slug: string; lines: string[] }) {
  const [showSyl, setShowSyl] = useState(false);
  const [showRhyme, setShowRhyme] = useState(false);
  const [meter, setMeter] = useState("");
  const [rhyme, setRhyme] = useState("");
  const [result, setResult] = useState<OlenResult>(null);
  const [pending, start] = useTransition();
  const scheme = rhymeScheme(lines).split("-");
  const labels = [...new Set(scheme)];

  return (
    <div className="flex flex-col gap-6">
      <section className="card" aria-labelledby="poem">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 id="poem" className="text-2xl font-bold">Өлеңді зертте</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="chip" aria-pressed={showSyl} onClick={() => setShowSyl(!showSyl)}>
              Буындарды көрсету
            </button>
            <button type="button" className="chip" aria-pressed={showRhyme} onClick={() => setShowRhyme(!showRhyme)}>
              Ұйқасты белгілеу
            </button>
          </div>
        </div>
        <ol className="flex flex-col gap-3">
          {lines.map((l, i) => (
            <li key={i} className="flex items-center gap-4 rounded-2xl bg-soft px-5 py-4">
              <span className="num w-4 text-sm font-bold text-muted">{i + 1}</span>
              <span className="flex-1 text-lg font-medium sm:text-xl">
                {showRhyme ? <Ending line={showSyl ? syllabifyLine(l) : l} label={scheme[i]} color={RHYME_COLORS[labels.indexOf(scheme[i])]} /> : showSyl ? syllabifyLine(l) : l}
              </span>
              {showSyl && <span className="num tag shrink-0 bg-[#e4efff] text-primary">{countSyllables(l)} буын</span>}
            </li>
          ))}
        </ol>
      </section>

      <section className="card" aria-labelledby="concl">
        <h2 id="concl" className="mb-5 text-2xl font-bold">Қорытынды жаса</h2>
        <fieldset className="mb-5">
          <legend className="mb-3 font-bold">1. Өлеңнің өлшемі қандай?</legend>
          <div className="flex flex-wrap gap-3">
            {METERS.map((m) => (
              <label key={m.v} className="chip cursor-pointer">
                <input type="radio" name="meter" className="sr-only" checked={meter === m.v} onChange={() => setMeter(m.v)} />
                {m.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-3 font-bold">2. Ұйқас түрі қандай?</legend>
          <div className="flex flex-wrap gap-3">
            {RHYMES.map((r) => (
              <label key={r} className="chip cursor-pointer">
                <input type="radio" name="rhyme" className="sr-only" checked={rhyme === r} onChange={() => setRhyme(r)} />
                {r}
              </label>
            ))}
          </div>
        </fieldset>
        <div aria-live="polite" className="mt-5">
          {result && (
            <ul className="flex flex-col gap-2 text-sm font-bold">
              <li className={result.meter_ok ? "text-green-ink" : "text-red-ink"}>
                {result.meter_ok ? "✓ Өлшемі дұрыс анықталды." : "✗ Өлшемі басқа. «Буындарды көрсету» батырмасымен санап көр."}
              </li>
              <li className={result.rhyme_ok ? "text-green-ink" : "text-red-ink"}>
                {result.rhyme_ok ? "✓ Ұйқас түрі дұрыс." : "✗ Ұйқас түрі басқа. Жол соңындағы сөздерді салыстыр."}
              </li>
            </ul>
          )}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">Жауап дайын ережелермен тексеріледі.</p>
          <button
            type="button"
            className="btn-primary h-14 px-10"
            disabled={!meter || !rhyme || pending}
            onClick={() => start(async () => setResult(await checkOlen(slug, meter, rhyme)))}
          >
            Тексеру
          </button>
        </div>
      </section>
    </div>
  );
}

export function OwnText() {
  const [text, setText] = useState("Ақ киімді, денелі, ақ сақалды,\nСоқыр, мылқау, танымас тірі жанды.");
  const lines = text.split("\n").filter((l) => l.trim());
  return (
    <section className="rounded-[var(--radius-card)] bg-navy p-6 text-white" aria-labelledby="own">
      <h2 id="own" className="text-lg font-bold">Өз мәтініңді өлше</h2>
      <p className="mt-1 text-sm text-white/85">Әр жолды жаңа жолдан жаз — буын саны бірден шығады.</p>
      <label htmlFor="own-text" className="sr-only">Өз мәтінің</label>
      <textarea id="own-text" rows={4} value={text} onChange={(e) => setText(e.target.value)} className="mt-4 w-full rounded-2xl bg-white p-4 font-medium text-ink focus:outline-none" />
      <ul className="mt-3 flex flex-col gap-1.5 text-sm" aria-live="polite">
        {lines.map((l, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span className="truncate">{l}</span>
            <span className="num shrink-0 font-bold text-gold">{countSyllables(l)} буын</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
