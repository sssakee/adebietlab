"use client";
import { useState } from "react";
import Link from "next/link";
import { BookOpen, Landmark, MapPin } from "lucide-react";
import { KZ_PATH, KZ_VIEW, project, spread } from "@/lib/kz-outline";
import type { Pin } from "@/lib/literary-map";

/** Map of Kazakhstan with a pin per author's birthplace; the list beside it does the same as the pins. */
export function LitMap({ pins, titles }: { pins: Pin[]; titles: Record<string, string> }) {
  const [sel, setSel] = useState(pins[0].id);
  const p = pins.find((x) => x.id === sel)!;
  const spots = spread(pins.map((x) => project(x.lat, x.lon)));
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="card flex h-fit flex-col gap-4 p-3 sm:p-5">
        <div className="relative">
          <svg viewBox={`0 0 ${KZ_VIEW.w} ${KZ_VIEW.h}`} className="h-auto w-full" aria-hidden="true">
            <path d={KZ_PATH} className="fill-accent-soft stroke-primary" strokeWidth="2.5" strokeLinejoin="round" />
          </svg>
          {pins.map((x, i) => {
            const { x: px, y: py } = spots[i];
            const on = x.id === sel;
            return (
              <button
                key={x.id}
                type="button"
                onClick={() => setSel(x.id)}
                aria-pressed={on}
                aria-label={`${x.name}: ${x.place}`}
                className={`absolute grid size-6 -translate-x-1/2 -translate-y-1/2 sm:size-8 place-items-center rounded-full transition-transform hover:scale-110 ${on ? "z-10 scale-110 bg-red text-on-color" : x.kind === "place" ? "bg-violet text-on-color" : "bg-primary text-on-color"}`}
                style={{ left: `${(100 * px) / KZ_VIEW.w}%`, top: `${(100 * py) / KZ_VIEW.h}%` }}
              >
                {x.kind === "place" ? <Landmark className="size-3.5 sm:size-4" aria-hidden="true" /> : <MapPin className="size-3.5 sm:size-4" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        <p className="flex flex-wrap gap-4 text-xs text-muted">
          <span className="flex items-center gap-1"><span className="size-3 rounded-full bg-primary" aria-hidden="true" /> ақын-жазушының туған жері</span>
          <span className="flex items-center gap-1"><span className="size-3 rounded-full bg-violet" aria-hidden="true" /> жырға байланысты ескерткіш</span>
          <span>Орны шамамен: ауыл емес, өңір көрсетілген, ал бір өңірдегі белгілер бір-бірін жаппас үшін сәл ажыратылған.</span>
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <section className="card" aria-live="polite" aria-labelledby="pin-name">
          <p className="text-sm font-bold text-muted">{p.years}</p>
          <h2 id="pin-name" className="text-2xl font-bold">{p.name}</h2>
          <p className="mt-2 flex gap-2 font-medium"><MapPin className="mt-0.5 size-5 shrink-0 text-red" aria-hidden="true" />{p.place}</p>
          <p className="mt-3 text-muted">{p.note}</p>
          {p.works.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {p.works.filter((s) => titles[s]).map((s) => (
                <li key={s}>
                  <Link href={`/oqushy/shygarmalar/${s}`} className="flex items-center gap-2 rounded-2xl bg-soft px-4 py-3 font-bold hover:bg-accent-soft">
                    <BookOpen className="size-4 shrink-0 text-primary" aria-hidden="true" /> «{titles[s]}»
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 break-words text-xs text-muted">Дереккөз: {p.source}</p>
        </section>
        <nav className="card" aria-label="Карта бойынша тізім">
          <ul className="flex flex-col gap-1">
            {pins.map((x) => (
              <li key={x.id}>
                <button type="button" onClick={() => setSel(x.id)} aria-pressed={x.id === sel} className={`w-full rounded-xl px-3 py-2 text-left text-sm font-bold ${x.id === sel ? "bg-primary text-on-color" : "hover:bg-soft"}`}>
                  {x.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
