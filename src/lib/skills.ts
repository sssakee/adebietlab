import "server-only";
import { sql } from "./db";

// Task types and tools grouped into what they test, in the teacher's words.
export const SKILL: Record<string, string> = {
  single_choice: "Мазмұнды білу", multiple_choice: "Мазмұнды білу", fill_blank: "Мазмұнды білу", quiz: "Мазмұнды білу",
  ordering: "Оқиға реті мен құрылым", zheli: "Оқиға реті мен құрылым",
  matching: "Байланыс табу", char_map: "Байланыс табу",
  olen: "Өлең құрылысы",
  open: "Өз ойын жазу", egerde: "Шығармашылық ой", soni: "Шығармашылық ой", hat: "Шығармашылық ой",
};

/**
 * Every score as (work_id, task, skill, student_id, got, max): tasks per task, quizzes, lab tools and
 * teacher-scored creative work. students is a query returning student ids; classId keeps tasks to that class.
 */
export function scored(students: ReturnType<typeof sql>, classId?: string) {
  return sql`
    with st as (${students})
    select ts.work_id, t.id::text as task, t.type as skill, s.student_id,
      coalesce((s.auto_scores || s.teacher_scores)->>t.id::text, '0')::int as got, t.points as max
    from submissions s join assignments a on a.id = s.assignment_id join task_sets ts on ts.id = a.set_id join tasks t on t.set_id = ts.id
    where ${classId ? sql`a.class_id = ${classId} and` : sql``} s.student_id in (select * from st) and (t.type <> 'open' or s.teacher_scores ? t.id::text)
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
}

/** Per-skill percentages from (skill, pct, n) rows, weakest first. */
export function groupSkills(rows: { skill: string; pct: number; n: number }[]) {
  const skills = new Map<string, { got: number; max: number; n: number }>();
  for (const s of rows) {
    const k = SKILL[s.skill] ?? s.skill;
    const v = skills.get(k) ?? { got: 0, max: 0, n: 0 };
    skills.set(k, { got: v.got + s.pct * s.n, max: v.max + 100 * s.n, n: v.n + s.n });
  }
  return [...skills].map(([label, v]) => ({ label, pct: Math.round((100 * v.got) / v.max), n: v.n })).sort((a, b) => a.pct - b.pct);
}
