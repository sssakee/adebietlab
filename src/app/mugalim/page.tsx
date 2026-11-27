import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { pickClass } from "@/lib/teacher";
import type { Character } from "@/lib/queries";
import { createLabAssignment, gradeEgerde } from "./actions";
import { ClassPicker } from "./ClassPicker";
import { Submit } from "@/components/Submit";
import { PageHead } from "@/components/PageHead";

export const metadata = { title: "Шолу" };

const CRITERIA = ["Болжам кейіпкер мінезіне сай", "Жырдан дәлел келтірілген", "Оқиғаның соңы логикалы"];

export default async function TeacherHome({ searchParams }: PageProps<"/mugalim">) {
  const u = await requireRole("teacher");
  const sp = await searchParams;
  const { list, cls } = await pickClass(u.id, sp.c);
  if (!cls)
    return (
      <div className="card flex flex-col items-start gap-4">
        <h1 className="text-3xl font-bold">Қош келдіңіз, {u.full_name}!</h1>
        <p className="text-muted">Бастау үшін алғашқы сыныбыңызды ашыңыз. Жүйе оқушыларға арналған 6 таңбалы код береді.</p>
        <Link href="/mugalim/synyptar" className="btn-primary">Сынып ашу</Link>
      </div>
    );

  // independent of each other: one round-trip of latency instead of four
  const [works, [stats], struggles, egerde] = await Promise.all([
    sql<{ id: string; title: string; author: string; lab: Record<string, unknown> }[]>`
    select id, title, author, lab from works where lab <> '{}' order by title`,
    sql<{ active: number; map_avg: number | null; map_total: number | null; olen_ok: number | null; pending: number }[]>`
    with m as (select student_id from class_members where class_id = ${cls.id})
    select
      (select count(distinct x.s)::int from (
        select student_id s from lab_works where student_id in (select * from m)
        union select s.student_id from submissions s join assignments a on a.id = s.assignment_id where a.class_id = ${cls.id}
      ) x) as active,
      (select round(avg((result->>'found')::numeric), 1)::float from lab_works where kind = 'char_map' and student_id in (select * from m)) as map_avg,
      (select max((result->>'total')::int) from lab_works where kind = 'char_map' and student_id in (select * from m)) as map_total,
      (select round(100.0 * avg(((result->>'meter_ok')::boolean and (result->>'rhyme_ok')::boolean)::int))::int from lab_works where kind = 'olen' and student_id in (select * from m)) as olen_ok,
      (select count(*)::int from lab_works where kind = 'egerde' and shared and teacher_scores is null and student_id in (select * from m)) as pending`,
    sql<{ text: string; n: number; tool: string; tone: string }[]>`
    with m as (select student_id from class_members where class_id = ${cls.id})
    (select 'Ұйқасты ' || (data->>'rhyme') || ' деп шатастырады' as text, count(*)::int n, 'Өлең өлшегіш' tool, 'red' tone
      from lab_works where kind = 'olen' and not (result->>'rhyme_ok')::boolean and student_id in (select * from m) group by data->>'rhyme')
    union all
    (select miss as text, count(*)::int, 'Кейіпкер картасы', 'gold'
      from lab_works, jsonb_array_elements_text(result->'missing') miss
      where kind = 'char_map' and student_id in (select * from m) group by miss)
    union all
    (select (w->>'right') || ' элементін ' || (w->>'chose') || ' деп шатастырады', count(*)::int, 'Оқиға желісі', 'blue'
      from lab_works, jsonb_array_elements(result->'wrong') w
      where kind = 'zheli' and student_id in (select * from m) group by w->>'right', w->>'chose')
    union all
    (select left(t.prompt, 70), count(*)::int, 'Тапсырма', 'blue'
      from submissions s join assignments a on a.id = s.assignment_id join tasks t on t.set_id = a.set_id
      where a.class_id = ${cls.id} and t.type <> 'open' and coalesce((s.auto_scores->>t.id::text)::int, 0) < t.points
      group by t.id, t.prompt)
    order by n desc limit 4`,
    sql<{ id: string; full_name: string; prediction: string; evidence: string; votes: number; teacher_scores: number[] | null }[]>`
    select l.id, p.full_name, l.data->>'prediction' as prediction, l.data->>'evidence' as evidence, l.teacher_scores,
      (select count(*)::int from lab_votes v where v.lab_work_id = l.id) as votes
    from lab_works l join profiles p on p.id = l.student_id join class_members m on m.student_id = l.student_id
    where m.class_id = ${cls.id} and l.kind = 'egerde' and l.shared
    order by (l.teacher_scores is null) desc, l.updated_at desc`,
  ]);

  // "Where the class struggles": wrong rhyme answers, missing map links, most-missed tasks.

  const charName = new Map<string, string>();
  for (const w of works) for (const c of (w.lab.characters as Character[] | undefined) ?? []) charName.set(c.id, c.name);
  const edgeText = (key: string) => {
    const [a, b] = key.split("|");
    return charName.has(a) ? `${charName.get(a)} мен ${charName.get(b)} байланысын таппаған` : key;
  };


  const g = egerde.find((e) => e.id === sp.g) ?? egerde.find((e) => !e.teacher_scores) ?? egerde[0];
  const tone: Record<string, string> = { red: "bg-red-soft text-red-ink", gold: "bg-gold-soft text-ink", blue: "bg-soft text-ink" };

  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Сынып зертханасы" sub={`${cls.name} сынып · сынып коды: ${cls.join_code}`}>
        <div className="flex flex-wrap items-center gap-3">
          <ClassPicker list={list} current={cls.id} />
          <span className="tag bg-white/15 px-4 py-2 text-sm text-white">Зертхана құралдары ЖИ-сіз жұмыс істейді</span>
        </div>
      </PageHead>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Жұмысқа қатысты" value={`${stats.active}`} sub={`/ ${cls.students}`} />
        <Stat label="Кейіпкер картасы, орташа" value={stats.map_avg?.toString().replace(".", ",") ?? "—"} sub={stats.map_total ? `/ ${stats.map_total} байланыс` : ""} />
        <Stat label="Өлең өлшегіш, дұрыс" value={stats.olen_ok === null ? "—" : `${stats.olen_ok}%`} />
        <Stat label="Бағалауды күтуде" value={`${stats.pending}`} sub="«Егер...»" gold />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card" aria-labelledby="new-lab">
          <h2 id="new-lab" className="mb-4 text-xl font-bold">Жаңа зертханалық жұмыс</h2>
          {sp.ok && <p role="status" className="mb-3 rounded-2xl bg-green-soft p-3 text-sm font-bold text-green-ink">✓ Жұмыс сыныпқа жіберілді</p>}
          {sp.err && <p role="alert" className="mb-3 rounded-2xl bg-red-soft p-3 text-sm font-bold text-red-ink">Бұл шығармада таңдалған құралдарға дерек жоқ. Басқа құрал таңдаңыз.</p>}
          <form action={createLabAssignment} className="flex flex-col gap-4">
            <input type="hidden" name="class_id" value={cls.id} />
            <div>
              <label htmlFor="work" className="label">Шығарма</label>
              <select id="work" name="work_id" className="field">
                {works.map((w) => (
                  <option key={w.id} value={w.id}>«{w.title}» — {w.author}</option>
                ))}
              </select>
            </div>
            <fieldset>
              <legend className="label">Зертхана құралдары</legend>
              <div className="flex flex-wrap gap-2">
                {[["olen", "Өлең өлшегіш"], ["char_map", "Кейіпкер картасы"], ["egerde", "«Егер...» тәжірибесі"], ["zheli", "Оқиға желісі"]].map(([v, l]) => (
                  <label key={v} className="chip cursor-pointer">
                    <input type="checkbox" name="tools" value={v} className="sr-only" />
                    {l}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ai" className="label">ЖИ көмекші режимі</label>
                <select id="ai" name="ai_mode" className="field" defaultValue="limited">
                  <option value="off">ЖИ-сіз</option>
                  <option value="limited">Шектеулі ЖИ</option>
                  <option value="full">ЖИ рұқсат етілген</option>
                </select>
              </div>
              <div>
                <label htmlFor="due" className="label">Мерзімі</label>
                <input id="due" name="due_at" type="date" className="field" />
              </div>
            </div>
            <Submit className="btn-primary h-14 px-8">Сыныпқа жіберу</Submit>
          </form>
        </section>

        <section className="card" aria-labelledby="hard">
          <h2 id="hard" className="mb-4 text-xl font-bold">Сынып қайда қиналды</h2>
          {struggles.length ? (
            <ul className="flex flex-col gap-3">
              {struggles.map((s, i) => (
                <li key={i} className={`rounded-2xl p-4 ${tone[s.tone]}`}>
                  <p className="font-bold">{s.tool === "Кейіпкер картасы" ? edgeText(s.text) : s.text}</p>
                  <p className="mt-1 text-sm font-bold opacity-80">{s.n} оқушы · {s.tool}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">Әзірге қате жиналмады. Оқушылар жұмыс жасаған сайын осында шығады.</p>
          )}
          <p className="mt-4 text-xs text-muted">Есеп ережемен шығарылады: оқушы жауабы дұрыс жауаппен салыстырылады.</p>
        </section>
      </div>

      <section className="card" aria-labelledby="eg">
        <h2 id="eg" className="text-xl font-bold">«Егер...» жұмысын бағалау</h2>
        {g ? (
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-sm font-bold text-muted">{g.full_name} · сыныптастар қолдауы: {g.votes}</p>
              <blockquote className="mt-3 rounded-2xl bg-soft p-4 font-bold">«{g.prediction}»</blockquote>
              {g.evidence && <p className="mt-3 text-sm text-muted">Дәлел: {g.evidence}</p>}
              {egerde.length > 1 && (
                <nav aria-label="Басқа жұмыстар" className="mt-4 flex flex-wrap gap-2">
                  {egerde.map((e) => (
                    <Link key={e.id} href={`/mugalim?c=${cls.id}&g=${e.id}`} aria-current={e.id === g.id ? "true" : undefined} className={`tag px-3 py-2 ${e.id === g.id ? "bg-primary text-on-color" : e.teacher_scores ? "bg-green-soft text-green-ink" : "bg-gold-soft text-ink"}`}>
                      {e.full_name}{e.teacher_scores ? " ✓" : ""}
                    </Link>
                  ))}
                </nav>
              )}
            </div>
            <form action={gradeEgerde.bind(null, g.id, cls.id)} className="flex flex-col gap-4" key={g.id}>
              {CRITERIA.map((c, i) => (
                <fieldset key={c}>
                  <legend className="mb-2 text-sm font-bold">{c}</legend>
                  <div className="flex gap-2">
                    {[0, 1, 2].map((v) => (
                      <label key={v} className="chip w-14 cursor-pointer justify-center px-0">
                        <input type="radio" name={`k${i}`} value={v} required defaultChecked={g.teacher_scores?.[i] === v} className="sr-only" />
                        {v}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              {sp.graded && <p role="status" className="rounded-2xl bg-green-soft p-3 text-sm font-bold text-green-ink">✓ Баға сақталды, оқушы оны өз бетінде көреді.</p>}
              <div className="flex items-center justify-between gap-3">
                <p className="num text-lg font-bold">{g.teacher_scores ? `Жиыны: ${g.teacher_scores.reduce((a, b) => a + b, 0)} / 6` : "Жиыны: — / 6"}</p>
                <Submit className="btn-primary h-14 px-8">Бағаны сақтау</Submit>
              </div>
            </form>
          </div>
        ) : (
          <p className="mt-3 text-muted">Әзірге болжам жіберілмеді.</p>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub, gold }: { label: string; value: string; sub?: string; gold?: boolean }) {
  return (
    <div className={`rounded-3xl p-5 ${gold ? "bg-gold-soft" : "bg-surface"}`}>
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="mt-2">
        <span className="num text-3xl font-bold">{value}</span> <span className="text-sm font-bold text-muted">{sub}</span>
      </p>
    </div>
  );
}
