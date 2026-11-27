import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { pickClass } from "@/lib/teacher";
import { ClassPicker } from "../ClassPicker";
import { PageHead } from "@/components/PageHead";
import { Bars, type Bar } from "@/components/Bars";

export const metadata = { title: "Сынып аналитикасы" };

type Student = { id: string; full_name: string; assigned: number; done: number; overdue: number; task_pct: number | null; quiz_pct: number | null; idle_days: number | null };

export default async function Analytics({ searchParams }: PageProps<"/mugalim/analitika">) {
  const u = await requireRole("teacher");
  const { list, cls } = await pickClass(u.id, (await searchParams).c);
  if (!cls)
    return (
      <div className="card flex flex-col items-start gap-4">
        <h1 className="text-3xl font-bold">Сынып аналитикасы</h1>
        <p className="text-muted">Аналитика сынып ашылып, оқушылар жұмыс жасағаннан кейін шығады.</p>
        <Link href="/mugalim/synyptar" className="btn-primary">Сынып ашу</Link>
      </div>
    );

  // Every score as (what, got, max): tasks per task, quizzes, lab tools and teacher-scored creative work.
  const scored = sql`
    with st as (select student_id from class_members where class_id = ${cls.id})
    select ts.work_id, t.id::text as task, t.type as skill, s.student_id,
      coalesce((s.auto_scores || s.teacher_scores)->>t.id::text, '0')::int as got, t.points as max
    from submissions s join assignments a on a.id = s.assignment_id join task_sets ts on ts.id = a.set_id join tasks t on t.set_id = ts.id
    where a.class_id = ${cls.id} and s.student_id in (select * from st) and (t.type <> 'open' or s.teacher_scores ? t.id::text)
    union all
    select w.id, null, 'quiz', q.student_id, q.best, q.total
    from quiz_results q left join works w on w.slug = q.quiz where q.student_id in (select * from st)
    union all
    select l.work_id, null, l.kind, l.student_id,
      case l.kind when 'olen' then (l.result->>'meter_ok')::boolean::int + (l.result->>'rhyme_ok')::boolean::int
                  when 'char_map' then (l.result->>'found')::int when 'zheli' then (l.result->>'orderOk')::int
                  else (select sum(x) from unnest(l.teacher_scores) x)::int end,
      case l.kind when 'olen' then 2 when 'char_map' then (l.result->>'total')::int when 'zheli' then (l.result->>'total')::int else 6 end
    from lab_works l
    where l.student_id in (select * from st) and (l.kind in ('olen', 'char_map', 'zheli') or l.teacher_scores is not null)`;

  const [students, byWork, bySkill, hardest] = await Promise.all([
    sql<Student[]>`
      with st as (select p.id, p.full_name from class_members m join profiles p on p.id = m.student_id where m.class_id = ${cls.id}),
      a as (select * from assignments where class_id = ${cls.id}),
      d as (
        select st.id, a.due_at,
          case when a.kind = 'tasks' then exists (select 1 from submissions s where s.assignment_id = a.id and s.student_id = st.id)
               else exists (select 1 from lab_works l where l.student_id = st.id and l.work_id = a.work_id and l.kind = any(a.lab_tools)) end as ok
        from st cross join a
      )
      select st.id, st.full_name,
        (select count(*) from d where d.id = st.id)::int as assigned,
        (select count(*) from d where d.id = st.id and d.ok)::int as done,
        (select count(*) from d where d.id = st.id and not d.ok and d.due_at < current_date)::int as overdue,
        (select round(100.0 * sum(got) / nullif(sum(max), 0))::int from (${scored}) x where x.student_id = st.id and x.task is not null) as task_pct,
        (select round(100.0 * avg(best::numeric / nullif(total, 0)))::int from quiz_results q where q.student_id = st.id) as quiz_pct,
        (select current_date - max(x)::date from (
          select max(updated_at) x from lab_works where student_id = st.id
          union all select max(submitted_at) from submissions where student_id = st.id
          union all select max(updated_at) from quiz_results where student_id = st.id
          union all select max(at) from points_log where student_id = st.id) y) as idle_days
      from st order by st.full_name`,
    sql<Bar[]>`
      select w.title as label, round(100.0 * sum(got) / nullif(sum(max), 0))::int as pct, count(distinct x.student_id)::int as n
      from (${scored}) x join works w on w.id = x.work_id
      group by w.id, w.title having sum(max) > 0 order by pct, w.title limit 8`,
    sql<{ skill: string; pct: number; n: number }[]>`
      select skill, round(100.0 * sum(got) / nullif(sum(max), 0))::int as pct, count(distinct student_id)::int as n
      from (${scored}) x group by skill having sum(max) > 0`,
    sql<{ prompt: string; pct: number; n: number }[]>`
      select left(t.prompt, 140) as prompt, round(100.0 * sum(got) / nullif(sum(max), 0))::int as pct, count(*)::int as n
      from (${scored}) x join tasks t on t.id::text = x.task
      group by t.id, t.prompt having sum(got) < sum(max) order by pct, n desc limit 5`,
  ]);

  // Task types and tools grouped into what they test, in the teacher's words.
  const SKILL: Record<string, string> = {
    single_choice: "Мазмұнды білу", multiple_choice: "Мазмұнды білу", fill_blank: "Мазмұнды білу", quiz: "Мазмұнды білу",
    ordering: "Оқиға реті мен құрылым", zheli: "Оқиға реті мен құрылым",
    matching: "Байланыс табу", char_map: "Байланыс табу",
    olen: "Өлең құрылысы",
    open: "Өз ойын жазу", egerde: "Шығармашылық ой", soni: "Шығармашылық ой", hat: "Шығармашылық ой",
  };
  const skills = new Map<string, { got: number; max: number; n: number }>();
  for (const s of bySkill) {
    const k = SKILL[s.skill] ?? s.skill;
    const v = skills.get(k) ?? { got: 0, max: 0, n: 0 };
    skills.set(k, { got: v.got + s.pct * s.n, max: v.max + 100 * s.n, n: v.n + s.n });
  }
  const skillBars: Bar[] = [...skills].map(([label, v]) => ({ label, pct: Math.round((100 * v.got) / v.max), n: v.n })).sort((a, b) => a.pct - b.pct);

  const why = (s: Student) =>
    [
      s.overdue && `${s.overdue} жұмыстың мерзімі өтті`,
      s.task_pct !== null && s.task_pct < 50 && `тапсырма нәтижесі ${s.task_pct}%`,
      s.quiz_pct !== null && s.quiz_pct < 50 && `викторина ${s.quiz_pct}%`,
      s.idle_days === null ? "әлі ештеңе жасамады" : s.idle_days >= 7 && `${s.idle_days} күннен бері белсенді емес`,
    ].filter(Boolean) as string[];
  const rows = students.map((s) => ({ ...s, why: why(s) })).sort((a, b) => b.why.length - a.why.length || a.full_name.localeCompare(b.full_name));
  const behind = rows.filter((r) => r.why.length);
  const avg = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x !== null);
    return v.length ? `${Math.round(v.reduce((a, b) => a + b, 0) / v.length)}%` : "—";
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Сынып аналитикасы" sub={`${cls.name} сынып · қай тақырып қиын, кім артта қалып жатыр`}>
        <ClassPicker list={list} current={cls.id} path="/mugalim/analitika" />
      </PageHead>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Tile label="Оқушылар" value={`${students.length}`} />
        <Tile label="Тапсырма, орташа" value={avg(students.map((s) => s.task_pct))} />
        <Tile label="Викторина, орташа" value={avg(students.map((s) => s.quiz_pct))} />
        <Tile label="Назар керек" value={`${behind.length}`} warn={behind.length > 0} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card" aria-labelledby="w">
          <h2 id="w" className="text-xl font-bold">Қай шығарма қиын</h2>
          <p className="mb-4 text-sm text-muted">Тапсырма, викторина және зертхана нәтижесі бірге. Ең қиыны жоғарыда.</p>
          <Bars bars={byWork} empty="Әзірге нәтиже жоқ." />
        </section>
        <section className="card" aria-labelledby="s">
          <h2 id="s" className="text-xl font-bold">Қай дағды қиын</h2>
          <p className="mb-4 text-sm text-muted">Тапсырма түрлері мен құралдар нені тексеретініне қарай топталған.</p>
          <Bars bars={skillBars} empty="Әзірге нәтиже жоқ." />
        </section>
      </div>

      <section className="card" aria-labelledby="h">
        <h2 id="h" className="mb-4 text-xl font-bold">Ең көп қателескен тапсырмалар</h2>
        {hardest.length ? (
          <ol className="flex flex-col gap-2">
            {hardest.map((t, i) => (
              <li key={i} className="flex items-center gap-4 rounded-2xl bg-soft p-4">
                <span className={`num w-14 shrink-0 text-xl font-bold ${t.pct < 50 ? "text-red-ink" : ""}`}>{t.pct}%</span>
                <span className="min-w-0 flex-1">{t.prompt}</span>
                <span className="shrink-0 text-sm text-muted">{t.n} жауап</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-muted">Қателескен тапсырма жоқ. Оқушылар тапсырма орындаған сайын осында шығады.</p>
        )}
      </section>

      <section className="card" aria-labelledby="st">
        <h2 id="st" className="text-xl font-bold">Оқушылар</h2>
        <p className="mb-4 text-sm text-muted">Назар керек оқушылар жоғарыда, себебімен.</p>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead className="text-sm text-muted">
                <tr>
                  <th className="py-2 pr-3">Оқушы</th>
                  <th className="py-2 pr-3">Орындады</th>
                  <th className="py-2 pr-3">Тапсырма</th>
                  <th className="py-2 pr-3">Викторина</th>
                  <th className="py-2">Не байқалды</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="border-t-2 border-line">
                    <td className="py-3 pr-3 font-bold">{s.full_name}</td>
                    <td className="num py-3 pr-3">{s.done} / {s.assigned}</td>
                    <td className="num py-3 pr-3">{s.task_pct === null ? "—" : `${s.task_pct}%`}</td>
                    <td className="num py-3 pr-3">{s.quiz_pct === null ? "—" : `${s.quiz_pct}%`}</td>
                    <td className="py-3">
                      {s.why.length ? (
                        <span className="tag bg-red-soft text-red-ink">{s.why.join(", ")}</span>
                      ) : (
                        <span className="tag bg-green-soft text-green-ink">Қалыпты</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted">Сыныпта әлі оқушы жоқ. Оларға сынып кодын беріңіз: {cls.join_code}.</p>
        )}
        <p className="mt-4 text-xs text-muted">
          Есеп ережемен шығарылады, ЖИ қатыспайды. «Назар керек»: мерзімі өткен жұмыс, тапсырма не викторина нәтижесі 50%-дан төмен, немесе 7 күн белсенділік жоқ.
        </p>
      </section>
    </div>
  );
}

function Tile({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-3xl p-5 ${warn ? "bg-red-soft" : "bg-surface"}`}>
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="num mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
