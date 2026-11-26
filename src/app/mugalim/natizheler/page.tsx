import Link from "next/link";
import { Bot, Download } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { pickClass } from "@/lib/teacher";
import { TOOL_LABEL } from "@/lib/queries";
import { ClassPicker } from "../ClassPicker";

export const metadata = { title: "Нәтижелер" };

type Row = { student_id: string; full_name: string; sub_id: string | null; status: string | null; used_ai_hint: boolean | null; scores: Record<string, number> | null };

export default async function Results({ searchParams }: PageProps<"/mugalim/natizheler">) {
  const u = await requireRole("teacher");
  const sp = await searchParams;
  const { list, cls } = await pickClass(u.id, sp.c);
  if (!cls) return <p className="card text-muted">Алдымен сынып ашыңыз.</p>;

  const assignments = await sql<{ id: string; kind: string; title: string; set_id: string | null; work_id: string | null; lab_tools: string[]; due: string | null }[]>`
    select a.id, a.kind, coalesce(ts.title, w.title) as title, a.set_id, a.work_id, a.lab_tools, to_char(a.due_at, 'DD.MM') as due
    from assignments a left join task_sets ts on ts.id = a.set_id left join works w on w.id = a.work_id
    where a.class_id = ${cls.id} order by a.created_at desc`;
  const a = assignments.find((x) => x.id === sp.a) ?? assignments[0];

  return (
    <div className="flex flex-col gap-6">
      <header className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-muted">{cls.name} сынып</p>
          <h1 className="text-3xl font-bold">Нәтижелер</h1>
        </div>
        <ClassPicker list={list} current={cls.id} path="/mugalim/natizheler" />
      </header>
      {!a ? (
        <p className="card text-muted">Бұл сыныпқа әлі тапсырма берілмеген.</p>
      ) : (
        <>
          <nav aria-label="Тапсырмалар" className="flex flex-wrap gap-2">
            {assignments.map((x) => (
              <Link key={x.id} href={`/mugalim/natizheler?c=${cls.id}&a=${x.id}`} aria-current={x.id === a.id ? "page" : undefined}
                className={`tag px-4 py-2.5 text-sm ${x.id === a.id ? "bg-primary text-white" : "bg-white text-ink hover:bg-[#e4efff]"}`}>
                {x.kind === "lab" ? `Зертхана: «${x.title}»` : x.title}{x.due && ` · ${x.due}`}
              </Link>
            ))}
          </nav>
          {a.kind === "tasks" ? <TaskTable a={a as never} classId={cls.id} /> : <LabTable a={a as never} classId={cls.id} />}
        </>
      )}
    </div>
  );
}

async function TaskTable({ a, classId }: { a: { id: string; set_id: string }; classId: string }) {
  const [tasks, rows] = await Promise.all([
    sql<{ id: string; type: string; points: number; prompt: string }[]>`select id, type, points, prompt from tasks where set_id = ${a.set_id} order by position`,
    sql<Row[]>`
    select p.id as student_id, p.full_name, s.id as sub_id, s.status, s.used_ai_hint, (s.auto_scores || s.teacher_scores) as scores
    from class_members m join profiles p on p.id = m.student_id
    left join submissions s on s.assignment_id = ${a.id} and s.student_id = p.id
    where m.class_id = ${classId} order by p.full_name`,
  ]);
  const max = tasks.reduce((s, t) => s + t.points, 0);
  const wrong = tasks
    .map((t) => ({ t, n: rows.filter((r) => r.scores && t.id in r.scores && r.scores[t.id] < t.points).length }))
    .filter((x) => x.n > 0 && x.t.type !== "open")
    .sort((x, y) => y.n - x.n)
    .slice(0, 3);
  return (
    <div className="flex flex-col gap-6">
      <section className="card relative overflow-x-auto" aria-labelledby="tbl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="tbl" className="text-xl font-bold">Оқушы × тапсырма</h2>
          <a href={`/mugalim/natizheler/csv?a=${a.id}`} className="btn-ghost" download>
            <Download className="size-4" aria-hidden="true" /> Excel-ге (CSV)
          </a>
        </div>
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="py-2 font-bold">Оқушы</th>
              {tasks.map((t, i) => <th key={t.id} className="num text-center font-bold" title={t.prompt}>{i + 1}</th>)}
              <th className="text-right font-bold">Жиыны</th>
              <th className="text-right font-bold"><span className="sr-only">Әрекет</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const sum = r.scores ? Object.values(r.scores).reduce((s, v) => s + v, 0) : null;
              return (
                <tr key={r.student_id} className="border-t border-line">
                  <td className="py-3 font-bold">
                    {r.full_name}
                    {r.used_ai_hint && <Bot className="ml-1.5 inline size-4 text-violet" aria-label="кеңеспен орындалды" />}
                  </td>
                  {tasks.map((t) => {
                    const v = r.scores?.[t.id];
                    return (
                      <td key={t.id} className={`num text-center font-bold ${v === undefined ? "text-muted" : v === t.points ? "text-green-ink" : "text-red-ink"}`}>
                        {v === undefined ? (r.sub_id && t.type === "open" ? "?" : "—") : v}
                      </td>
                    );
                  })}
                  <td className="num text-right font-bold">{sum === null ? "—" : `${sum} / ${max}`}</td>
                  <td className="text-right">
                    {r.sub_id && (
                      <Link href={`/mugalim/natizheler/${r.sub_id}`} className={`tag px-3 py-2 ${r.status === "graded" ? "bg-soft text-ink" : "bg-gold-soft text-ink"}`}>
                        {r.status === "graded" ? "Қарау" : "Бағалау"}
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted">«?» — ашық жауап мұғалім бағасын күтуде. Робот белгісі — оқушы ЖИ кеңесін пайдаланды.</p>
      </section>
      <section className="card" aria-labelledby="miss">
        <h2 id="miss" className="mb-3 text-xl font-bold">Жиі жіберілген қателер</h2>
        {wrong.length ? (
          <ul className="flex flex-col gap-2">
            {wrong.map(({ t, n }) => (
              <li key={t.id} className="rounded-2xl bg-red-soft p-3 text-sm"><b className="text-red-ink">{n} оқушы:</b> {t.prompt}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">Жабық сұрақтарда қате жоқ.</p>
        )}
      </section>
    </div>
  );
}

async function LabTable({ a, classId }: { a: { work_id: string; lab_tools: string[] }; classId: string }) {
  const rows = await sql<{ full_name: string; olen: Record<string, boolean> | null; map: Record<string, number> | null; eg: number[] | null; eg_sent: boolean; zheli: Record<string, number> | null }[]>`
    select p.full_name,
      (select result from lab_works where student_id = p.id and work_id = ${a.work_id} and kind = 'olen') as olen,
      (select result from lab_works where student_id = p.id and work_id = ${a.work_id} and kind = 'char_map') as map,
      (select teacher_scores from lab_works where student_id = p.id and work_id = ${a.work_id} and kind = 'egerde') as eg,
      exists (select 1 from lab_works where student_id = p.id and work_id = ${a.work_id} and kind = 'egerde') as eg_sent,
      (select result from lab_works where student_id = p.id and work_id = ${a.work_id} and kind = 'zheli') as zheli
    from class_members m join profiles p on p.id = m.student_id where m.class_id = ${classId} order by p.full_name`;
  return (
    <section className="card relative overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead className="text-muted">
          <tr>
            <th className="py-2 font-bold">Оқушы</th>
            {a.lab_tools.map((t) => <th key={t} className="font-bold">{TOOL_LABEL[t]}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.full_name} className="border-t border-line">
              <td className="py-3 font-bold">{r.full_name}</td>
              {a.lab_tools.map((t) => (
                <td key={t} className="num">
                  {t === "olen" && (r.olen ? (r.olen.meter_ok && r.olen.rhyme_ok ? "✓ дұрыс" : "қатесі бар") : "—")}
                  {t === "char_map" && (r.map ? `${r.map.found} / ${r.map.total}` : "—")}
                  {t === "zheli" && (r.zheli ? `рет ${r.zheli.orderOk} / ${r.zheli.total} · элемент ${r.zheli.elementsOk} / ${r.zheli.total}` : "—")}
                  {t === "egerde" && (r.eg ? `${r.eg.reduce((s, v) => s + v, 0)} / 6` : r.eg_sent ? "бағалау керек" : "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-muted">«Егер...» жұмыстарын «Шолу» бетінде бағалайсыз.</p>
    </section>
  );
}
