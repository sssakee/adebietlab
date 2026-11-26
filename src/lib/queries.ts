import "server-only";
import { cache } from "react";
import { sql } from "./db";
import type { Edge, TimelineEvent } from "./grading";

export type Character = { id: string; name: string; note: string; kind: "main" | "secondary" | "antagonist"; x: number; y: number };
export type WorkLab = {
  poem?: { lines: string[]; meter: string; rhyme: string };
  characters?: Character[];
  reference?: Edge[];
  egerde?: { question: string; checklist: string[] };
  timeline?: TimelineEvent[];
};
export type Work = {
  id: string;
  slug: string;
  title: string;
  author: string;
  author_years: string | null;
  genre: string;
  grades: number[];
  summary: string;
  text: string | null;
  text_source: string | null;
  is_public_domain: boolean;
  lab: WorkLab;
};

export const TOOL_LABEL: Record<string, string> = {
  olen: "Өлең өлшегіш",
  char_map: "Кейіпкер картасы",
  egerde: "«Егер...» тәжірибесі",
  zheli: "Оқиға желісі",
};

export const getWork = cache(async (slug: string) => {
  const [w] = await sql<Work[]>`select * from works where slug = ${slug}`;
  return w ?? null;
});

/** Link to the lab page of a work for a tool. */
export function toolHref(slug: string, tool: string) {
  if (tool === "olen") return `/oqushy/zertkhana/olen/${slug}`;
  if (tool === "zheli") return `/oqushy/zertkhana/zheli/${slug}`;
  return `/oqushy/zertkhana/karta/${slug}${tool === "egerde" ? "#egerde" : ""}`;
}

export type StudentAssignment = {
  id: string;
  kind: "tasks" | "lab";
  title: string;
  work_slug: string | null;
  lab_tools: string[];
  due_at: string | null;
  ai_mode: "off" | "limited" | "full";
  status: "new" | "submitted" | "graded";
  score: number | null;
  max: number | null;
  feedback: string;
};

export const studentAssignments = cache(async (studentId: string, classId: string | null) => {
  if (!classId) return [];
  return sql<StudentAssignment[]>`
    select a.id, a.kind, a.lab_tools, to_char(a.due_at, 'DD.MM.YYYY') as due_at, a.ai_mode,
      coalesce(ts.title, '«' || w.title || '»') as title, w.slug as work_slug,
      case
        when a.kind = 'lab' then case when exists (
          select 1 from lab_works l where l.student_id = ${studentId} and l.work_id = a.work_id and l.kind = any(a.lab_tools)
        ) then 'submitted' else 'new' end
        else coalesce(s.status, 'new') end as status,
      s.feedback,
      (select coalesce(sum(v::int), 0) from jsonb_each_text(s.auto_scores || s.teacher_scores) as e(k, v)) as score,
      (select sum(points)::int from tasks where set_id = a.set_id) as max
    from assignments a
    left join task_sets ts on ts.id = a.set_id
    left join works w on w.id = coalesce(a.work_id, ts.work_id)
    left join submissions s on s.assignment_id = a.id and s.student_id = ${studentId}
    where a.class_id = ${classId}
    order by a.created_at desc`;
});

export type Discovery = { title: string; tool: string; at: string };

/** "Менің ашылымдарым": the student's latest lab results in words. */
export const discoveries = cache(async (studentId: string) => {
  const rows = await sql<{ kind: string; title: string; author: string; result: Record<string, unknown>; data: Record<string, unknown>; day: string }[]>`
    select l.kind, w.title, w.author, l.result, l.data,
      case when l.updated_at::date = current_date then 'бүгін'
           when l.updated_at::date = current_date - 1 then 'кеше'
           else to_char(l.updated_at, 'DD.MM') end as day
    from lab_works l join works w on w.id = l.work_id
    where l.student_id = ${studentId}
    order by l.updated_at desc limit 5`;
  return rows.map((r): Discovery => {
    const author = r.author.split(" ")[0];
    if (r.kind === "olen")
      return {
        title: r.result.meter_ok && r.result.rhyme_ok ? `${author} «${r.title}»: ${r.data.meter} буынды, ұйқасы ${r.data.rhyme}` : `${author} «${r.title}»: өлшемін зерттедім`,
        tool: TOOL_LABEL.olen,
        at: r.day,
      };
    if (r.kind === "char_map") return { title: `«${r.title}»: ${r.result.found} / ${r.result.total} байланыс табылды`, tool: TOOL_LABEL.char_map, at: r.day };
    if (r.kind === "zheli") return { title: `«${r.title}»: оқиға реті ${r.result.orderOk} / ${r.result.total}`, tool: TOOL_LABEL.zheli, at: r.day };
    return { title: `«${r.title}»: болжам жасадым`, tool: TOOL_LABEL.egerde, at: r.day };
  });
});

/** Days in a row (ending today or yesterday) with any lab work or submission. Dates come from the DB clock. */
export const streak = cache(async (studentId: string) => {
  const rows = await sql<{ d: string; today: string }[]>`
    select distinct d::text, current_date::text as today from (
      select updated_at::date d from lab_works where student_id = ${studentId}
      union select submitted_at::date from submissions where student_id = ${studentId}
    ) x order by d desc limit 60`;
  if (!rows.length) return 0;
  const days = new Set(rows.map((r) => r.d));
  const back = (n: number) => new Date(Date.parse(rows[0].today) - n * 864e5).toISOString().slice(0, 10);
  const start = days.has(back(0)) ? 0 : 1;
  let n = 0;
  while (days.has(back(start + n))) n++;
  return n;
});

export const DAILY_GOAL = 3;

export const todayCount = cache(async (studentId: string) => {
  const [r] = await sql<{ n: number }[]>`
    select ((select count(*) from lab_works where student_id = ${studentId} and updated_at::date = current_date)
          + (select count(*) from submissions where student_id = ${studentId} and submitted_at::date = current_date))::int as n`;
  return r.n;
});

/** Adds points once per (student, activity key). Activity keys live in lab_works/submissions themselves. */
export async function addPoints(studentId: string, points: number) {
  await sql`update profiles set points = points + ${points} where id = ${studentId}`;
}

export const STATUS = {
  new: { label: "Орындалмаған", cls: "bg-gold-soft text-ink" },
  submitted: { label: "Тапсырылды", cls: "bg-[#e4efff] text-primary" },
  graded: { label: "Бағаланды", cls: "bg-green-soft text-green-ink" },
} as const;
