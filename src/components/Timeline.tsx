"use client";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { PLOT_ELEMENTS } from "@/lib/grading";
import { Sfx } from "./Sfx";
import { checkZheli, type ZheliResult } from "@/app/oqushy/actions";

type Ev = { id: string; text: string };

export function Timeline({ slug, events, startOrder, startElements }: { slug: string; events: Ev[]; startOrder: string[]; startElements: Record<string, string> }) {
  const byId = Object.fromEntries(events.map((e) => [e.id, e]));
  const [order, setOrder] = useState(startOrder);
  const [els, setEls] = useState(startElements);
  const [drag, setDrag] = useState<string | null>(null);
  const [result, setResult] = useState<ZheliResult>(null);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    setOrder(next);
    setResult(null);
    setMsg(`«${byId[x].text}» ${to + 1}-орынға жылжыды`);
  };

  const done = Object.keys(els).length === events.length;
  const wrongEl = new Set(result?.wrong.map((w) => w.id));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="card" aria-labelledby="tl">
        <h2 id="tl" className="text-2xl font-bold">Оқиғаларды ретке қой</h2>
        <p className="mt-1 text-sm font-medium text-muted">Карточканы сүйреп не көрсеткі батырмаларымен жылжыт. Әр оқиғаға сюжет элементін таңда.</p>
        <p className="sr-only" aria-live="polite">{msg}</p>
        <ol className="mt-5 flex flex-col gap-3">
          {order.map((id, i) => {
            const mark = result?.orderMarks[i];
            return (
              <li
                key={id}
                draggable
                onDragStart={() => setDrag(id)}
                onDragEnd={() => setDrag(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => drag && move(order.indexOf(drag), i)}
                className={`grid items-center gap-3 rounded-2xl border-2 bg-soft p-3 sm:grid-cols-[auto_1fr_200px_auto] ${drag === id ? "opacity-50" : ""} ${
                  mark === undefined ? "border-transparent" : mark ? "border-green" : "border-red"
                }`}
              >
                <span className="flex items-center gap-2">
                  <GripVertical className="size-5 cursor-grab text-muted" aria-hidden="true" />
                  <span className="num grid size-8 place-items-center rounded-full bg-surface text-sm font-bold">{i + 1}</span>
                </span>
                <span className="font-bold">{byId[id].text}</span>
                <span>
                  <label htmlFor={`el-${id}`} className="sr-only">«{byId[id].text}» — сюжет элементі</label>
                  <select
                    id={`el-${id}`}
                    value={els[id] ?? ""}
                    onChange={(e) => { setEls({ ...els, [id]: e.target.value }); setResult(null); }}
                    className={`field py-2 ${wrongEl.has(id) ? "border-red" : ""}`}
                  >
                    <option value="" disabled>Элементті таңда…</option>
                    {PLOT_ELEMENTS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </span>
                <span className="flex gap-1">
                  <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className="grid size-11 place-items-center rounded-xl bg-surface disabled:opacity-40" aria-label={`«${byId[id].text}» жоғары`}>
                    <ArrowUp className="size-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => move(i, i + 1)} disabled={i === order.length - 1} className="grid size-11 place-items-center rounded-xl bg-surface disabled:opacity-40" aria-label={`«${byId[id].text}» төмен`}>
                    <ArrowDown className="size-4" aria-hidden="true" />
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">{done ? "Жауап эталонмен ережемен салыстырылады." : "Барлық оқиғаға элемент таңда."}</p>
          <button type="button" className="btn-primary h-14 px-8" disabled={!done || pending} onClick={() => start(async () => setResult(await checkZheli(slug, order, els)))}>
            Тексеру
          </button>
        </div>
      </section>

      <aside className="flex flex-col gap-6">
        <section className="card" aria-labelledby="pe">
          <h2 id="pe" className="mb-3 text-lg font-bold">Сюжет элементтері</h2>
          <ol className="flex flex-col gap-2 text-sm">
            {[
              ["экспозиция", "кейіпкерлер мен жағдай таныстырылады"],
              ["байланыс", "оқиғаны қозғайтын түйін пайда болады"],
              ["шиеленіс", "қақтығыс күшейеді"],
              ["шарықтау шегі", "ең шиеленісті сәт"],
              ["шешім", "оқиға аяқталады"],
            ].map(([k, v]) => (
              <li key={k}><b className="text-primary">{k}</b> — {v}</li>
            ))}
          </ol>
        </section>
        <section aria-live="polite" className={result ? "pop rounded-[var(--radius-card)] bg-navy p-6 text-white" : "hidden"}>
          {result && (
            <>
              <Sfx ok={result.orderOk === result.total && result.elementsOk === result.total} />
              <h2 className="text-lg font-bold">Нәтиже</h2>
              <p className="num mt-3 text-3xl font-bold text-gold">{result.orderOk} / {result.total}</p>
              <p className="text-sm text-white/85">оқиға дұрыс орында</p>
              <p className="num mt-3 text-3xl font-bold text-gold">{result.elementsOk} / {result.total}</p>
              <p className="text-sm text-white/85">сюжет элементі дұрыс</p>
              {result.orderOk === result.total && result.elementsOk === result.total ? (
                <p className="mt-4 font-bold">Керемет! Оқиға желісін толық таптың.</p>
              ) : (
                <p className="mt-4 text-sm">Жасыл жиек — дұрыс орын, қызыл — басқа орын. Жырдағы себеп пен салдарды ойлап, қайта көр.</p>
              )}
            </>
          )}
        </section>
      </aside>
    </div>
  );
}
