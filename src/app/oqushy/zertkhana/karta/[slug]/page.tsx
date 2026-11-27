import { notFound } from "next/navigation";
import { ThumbsUp, X } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { compareMap, type Edge } from "@/lib/grading";
import { getWork, type Character } from "@/lib/queries";
import { addEdge, removeEdge, saveEgerde, toggleVote } from "@/app/oqushy/actions";
import { LabHeader } from "../../LabHeader";
import { Sfx } from "@/components/Sfx";
import { Submit } from "@/components/Submit";

export const metadata = { title: "Кейіпкер картасы" };

const W = 600;
const H = 340;
const NODE = { w: 150, h: 54 };
const KIND_STYLE: Record<Character["kind"], { fill: string; stroke: string }> = {
  main: { fill: "var(--color-accent-soft)", stroke: "var(--color-primary)" },
  secondary: { fill: "var(--color-surface)", stroke: "var(--color-node-line)" },
  antagonist: { fill: "var(--color-red-soft)", stroke: "var(--color-red)" },
};

function Line({ a, b, dashed, color, label, q }: { a: Character; b: Character; dashed?: boolean; color: string; label?: string; q?: boolean }) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  return (
    <g>
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={dashed ? 1.8 : 2.2} strokeDasharray={dashed ? "6 5" : undefined} />
      {label && (
        <text x={mx} y={my - 8} textAnchor="middle" className="fill-ink text-[11px] font-bold" paintOrder="stroke" stroke="var(--color-violet-faint)" strokeWidth={5}>
          {label}
        </text>
      )}
      {q && (
        <g>
          <rect x={mx - 11} y={my - 9} width={22} height={18} rx={6} fill="var(--color-red-ink)" />
          <text x={mx} y={my + 4} textAnchor="middle" className="fill-on-color text-[11px] font-bold">?</text>
        </g>
      )}
    </g>
  );
}

export default async function KartaPage({ params, searchParams }: PageProps<"/oqushy/zertkhana/karta/[slug]">) {
  const u = await requireRole("student");
  const slug = (await params).slug;
  const eg = (await searchParams).eg;
  const w = await getWork(slug);
  if (!w?.lab.characters || !w.lab.reference) notFound();
  const chars = w.lab.characters;
  const byId = Object.fromEntries(chars.map((c) => [c.id, c]));

  const [[mine], [egerde], peers] = await Promise.all([
    sql<{ data: { edges?: Edge[] } }[]>`select data from lab_works where student_id = ${u.id} and work_id = ${w.id} and kind = 'char_map'`,
    sql<{ data: { prediction: string; evidence: string; checklist: boolean[] }; teacher_scores: number[] | null }[]>`
    select data, teacher_scores from lab_works where student_id = ${u.id} and work_id = ${w.id} and kind = 'egerde'`,
    sql<{ id: string; full_name: string; prediction: string; votes: number; mine: boolean }[]>`
    select l.id, p.full_name, l.data->>'prediction' as prediction,
      (select count(*)::int from lab_votes v where v.lab_work_id = l.id) as votes,
      exists (select 1 from lab_votes v where v.lab_work_id = l.id and v.student_id = ${u.id}) as mine
    from lab_works l join profiles p on p.id = l.student_id
    join class_members m on m.student_id = l.student_id and m.class_id = ${u.class_id}
    where l.work_id = ${w.id} and l.kind = 'egerde' and l.shared and l.student_id <> ${u.id}
    order by votes desc, l.updated_at desc limit 10`,
  ]);
  const edges = mine?.data.edges ?? [];
  const cmp = compareMap(w.lab.reference, edges);

  const refLabel = (e: Edge) => w.lab.reference!.find((r) => [r.from, r.to].sort().join() === [e.from, e.to].sort().join())?.label;

  return (
    <div className="flex flex-col gap-6">
      <LabHeader kicker={`${w.grades.join(", ")}-сынып · ${w.genre}`} title={`«${w.title}»`} back={`/oqushy/shygarmalar/${w.slug}`}>
        <nav aria-label="Құралдар" className="flex flex-wrap gap-2">
          <a href="#map" className="tag bg-violet-soft px-4 py-3 text-sm text-violet">Кейіпкер картасы</a>
          <a href="#egerde" className="tag bg-soft px-4 py-3 text-sm text-ink hover:bg-accent-soft">«Егер...» тәжірибесі</a>
          {w.lab.timeline && <a href={`/oqushy/zertkhana/zheli/${w.slug}`} className="tag bg-soft px-4 py-3 text-sm text-ink hover:bg-accent-soft">Оқиға желісі</a>}
        </nav>
      </LabHeader>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section id="map" className="card h-fit min-w-0 scroll-mt-6" aria-labelledby="map-h">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="map-h" className="text-2xl font-bold">Кейіпкер картасы</h2>
            <p className="num font-bold text-violet" aria-live="polite">
              Табылған байланыс: {cmp.found} / {cmp.total}
              <Sfx ok={cmp.extra.length === 0} watch={`${cmp.found}/${cmp.extra.length}`} />
            </p>
          </div>
          <p className="mt-2 text-sm font-medium text-muted">Кейіпкерлерді байланыстыр, әр байланысқа жырдан дәлел жаз. Үзік сызықтар — әлі анықталмаған байланыстар.</p>

          <div className="relative mt-5 overflow-x-auto rounded-3xl bg-violet-faint p-3">
            <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[520px]" role="img" aria-label={`Кейіпкер картасы, табылған байланыс: ${cmp.found} / ${cmp.total}`}>
              {cmp.missing.map((e) => (
                <Line key={`m${e.from}${e.to}`} a={byId[e.from]} b={byId[e.to]} dashed color="var(--color-red)" q />
              ))}
              {cmp.extra.map((e) => (
                <Line key={`x${e.from}${e.to}`} a={byId[e.from]} b={byId[e.to]} dashed color="var(--color-muted-line)" />
              ))}
              {cmp.matched.map((e) => (
                <Line key={`f${e.from}${e.to}`} a={byId[e.from]} b={byId[e.to]} color="var(--color-violet)" label={e.label} />
              ))}
              {chars.map((c) => (
                <g key={c.id}>
                  <rect x={c.x - NODE.w / 2} y={c.y - NODE.h / 2} width={NODE.w} height={NODE.h} rx={14} fill={KIND_STYLE[c.kind].fill} stroke={KIND_STYLE[c.kind].stroke} strokeWidth={1.6} />
                  <text x={c.x} y={c.y - 3} textAnchor="middle" className="fill-ink text-[15px] font-bold">{c.name}</text>
                  <text x={c.x} y={c.y + 15} textAnchor="middle" className="fill-muted text-[11px] font-medium">{c.note}</text>
                </g>
              ))}
            </svg>
          </div>
          <ul className="mt-4 flex flex-wrap gap-4 text-xs font-bold" aria-label="Белгілер">
            <li className="flex items-center gap-2"><span className="size-3.5 rounded border-2 border-primary bg-accent-soft" /> басты кейіпкер</li>
            <li className="flex items-center gap-2"><span className="size-3.5 rounded border-2 border-node-line bg-surface" /> қосалқы кейіпкер</li>
            <li className="flex items-center gap-2"><span className="size-3.5 rounded border-2 border-red bg-red-soft" /> қарсы кейіпкер</li>
          </ul>

          <form action={addEdge.bind(null, slug)} className="mt-6 grid gap-3 rounded-3xl bg-soft p-4 sm:grid-cols-2">
            <h3 className="font-bold sm:col-span-2">+ Байланыс қосу</h3>
            <div>
              <label htmlFor="from" className="label">Кім</label>
              <select id="from" name="from" required className="field">
                {chars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="to" className="label">Кіммен</label>
              <select id="to" name="to" required className="field" defaultValue={chars[1]?.id}>
                {chars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="evidence" className="label">Жырдан дәлел</label>
              <input id="evidence" name="evidence" required minLength={5} maxLength={300} className="field" placeholder="Мысалы: екі бай балаларын атастырады" />
            </div>
            <Submit className="btn-ghost sm:col-span-2 sm:justify-self-end">Байланысты сақтау</Submit>
          </form>

          {edges.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 font-bold">Менің байланыстарым</h3>
              <ul className="flex flex-col gap-2">
                {edges.map((e) => {
                  const label = refLabel(e);
                  return (
                    <li key={e.from + e.to} className="flex items-start gap-3 rounded-2xl border-2 border-line p-3">
                      <span className={`mt-1 size-3 shrink-0 rounded-full ${label ? "bg-green" : "bg-muted-line"}`} aria-hidden="true" />
                      <span className="min-w-0 flex-1 text-sm">
                        <b>{byId[e.from]?.name} — {byId[e.to]?.name}</b>
                        <span className={`ml-2 font-bold ${label ? "text-green-ink" : "text-muted"}`}>{label ? `✓ ${label}` : "эталонда жоқ байланыс"}</span>
                        {e.evidence && <span className="mt-1 block text-muted">Дәлел: {e.evidence}</span>}
                      </span>
                      <form action={removeEdge.bind(null, slug, e.from, e.to)}>
                        <Submit className="grid size-11 place-items-center rounded-full text-muted hover:bg-soft hover:text-ink" aria-label={`${byId[e.from]?.name} — ${byId[e.to]?.name} байланысын өшіру`}>
                          <X className="size-4" aria-hidden="true" />
                        </Submit>
                      </form>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        {w.lab.egerde && (
          <div className="flex flex-col gap-6">
            <section id="egerde" className="card scroll-mt-6" aria-labelledby="eg-h">
              <span className="tag bg-red-soft text-red-ink">«Егер...» тәжірибесі</span>
              <h2 id="eg-h" className="mt-3 text-2xl font-bold leading-snug">{w.lab.egerde.question}</h2>
              {egerde?.teacher_scores && (
                <p className="mt-3 rounded-2xl bg-green-soft p-3 text-sm font-bold text-green-ink">
                  Мұғалім бағасы: {egerde.teacher_scores.reduce((a, b) => a + b, 0)} / 6
                </p>
              )}
              {eg === "ok" && <p role="status" className="mt-3 rounded-2xl bg-green-soft p-3 text-sm font-bold text-green-ink">✓ Болжамың сақталды, сыныптастарың мен мұғалім көре алады.</p>}
              {eg === "short" && <p role="alert" className="mt-3 rounded-2xl bg-red-soft p-3 text-sm font-bold text-red-ink">Болжамды толығырақ жаз: кемінде бір сөйлем.</p>}
              <form action={saveEgerde.bind(null, slug)} className="mt-5 flex flex-col gap-4">
                <div>
                  <label htmlFor="prediction" className="label">Менің болжамым</label>
                  <textarea id="prediction" name="prediction" required minLength={10} rows={5} defaultValue={egerde?.data.prediction} className="field" placeholder="Мен ойлаймын, егер…" />
                </div>
                <div>
                  <label htmlFor="ev" className="label">Жырдан дәлел (жол не эпизод)</label>
                  <input id="ev" name="evidence" defaultValue={egerde?.data.evidence} className="field" placeholder="Мысалы: Қарабай көшіп кеткен эпизод" />
                </div>
                <fieldset>
                  <legend className="label">Өзіңді тексер</legend>
                  <div className="flex flex-col gap-2">
                    {w.lab.egerde.checklist.map((c, i) => (
                      <label key={c} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl bg-soft px-4 text-sm font-bold">
                        <input type="checkbox" name={`c${i}`} defaultChecked={egerde?.data.checklist?.[i]} className="size-5 accent-primary" />
                        {c}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Submit className="btn-primary h-14">{egerde ? "Болжамды жаңарту" : "Мұғалім мен сыныпқа жіберу"}</Submit>
                {egerde && <p className="text-center text-sm font-bold text-green-ink">✓ Болжамың сыныпқа жіберілді</p>}
              </form>
            </section>

            <section className="card" aria-labelledby="peers">
              <h2 id="peers" className="mb-4 text-xl font-bold">Сыныптастар болжамы</h2>
              {peers.length ? (
                <ul className="flex flex-col gap-3">
                  {peers.map((p) => (
                    <li key={p.id} className="flex items-start gap-3 rounded-2xl bg-soft p-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-muted">{p.full_name}</p>
                        <p className="mt-1 text-sm font-bold">{p.prediction}</p>
                      </div>
                      <form action={toggleVote.bind(null, slug, p.id)}>
                        <Submit
                          aria-pressed={p.mine}
                          aria-label={`${p.full_name} болжамын қолдау, қазір ${p.votes}`}
                          className={`num flex min-h-11 items-center gap-1.5 rounded-xl border-2 px-3 text-sm font-bold ${p.mine ? "border-primary bg-accent-soft text-primary" : "border-line bg-surface"}`}
                        >
                          <ThumbsUp className="size-4" aria-hidden="true" /> {p.votes}
                        </Submit>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Әзірге ешкім болжам жібермеді. Бірінші бол!</p>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
