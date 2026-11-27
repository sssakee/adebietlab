import "server-only";
import { cache } from "react";
import { sql } from "./db";
import type { Edge, TimelineEvent } from "./grading";
import type { QuizWork } from "./quiz";

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
  read_url: string | null;
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

// Everything a student did, by day: lab work, submissions, quizzes, saved words and points earned.
const activity = (studentId: string) => sql`
  select updated_at::date d from lab_works where student_id = ${studentId}
  union select submitted_at::date from submissions where student_id = ${studentId}
  union select updated_at::date from quiz_results where student_id = ${studentId}
  union select added_at::date from words where student_id = ${studentId}
  union select at::date from points_log where student_id = ${studentId}`;

/** The last 60 active days (newest first) and today, both from the DB clock (Almaty time). */
export const activeDays = cache(async (studentId: string) => {
  const rows = await sql<{ d: string; today: string }[]>`
    select distinct d::text, current_date::text as today from (${activity(studentId)}) x order by d desc limit 60`;
  const [{ today }] = rows.length ? rows : await sql<{ today: string }[]>`select current_date::text as today`;
  return { days: new Set(rows.map((r) => r.d)), today };
});

export const dayBefore = (day: string, n: number) => new Date(Date.parse(day) - n * 864e5).toISOString().slice(0, 10);

/** Days in a row ending today, or yesterday when today has nothing yet. */
export const streak = cache(async (studentId: string) => {
  const { days, today } = await activeDays(studentId);
  const start = days.has(today) ? 0 : 1;
  let n = 0;
  while (days.has(dayBefore(today, start + n))) n++;
  return n;
});

export const DAILY_GOAL = 3;

export const todayCount = cache(async (studentId: string) => {
  const [r] = await sql<{ n: number }[]>`
    select ((select count(*) from lab_works where student_id = ${studentId} and updated_at::date = current_date)
          + (select count(*) from submissions where student_id = ${studentId} and submitted_at::date = current_date)
          + (select count(*) from quiz_results where student_id = ${studentId} and updated_at::date = current_date)
          + (select count(*) from words where student_id = ${studentId} and added_at::date = current_date))::int as n`;
  return r.n;
});

/** Adds points; the log keeps when they were earned, for the weekly rating. Callers make sure an activity pays once. */
export async function addPoints(studentId: string, points: number, reason: string) {
  if (points <= 0) return;
  await sql`update profiles set points = points + ${points} where id = ${studentId}`;
  await sql`insert into points_log (student_id, points, reason) values (${studentId}, ${points}, ${reason})`;
}

export const STATUS = {
  new: { label: "Орындалмаған", cls: "bg-gold-soft text-ink" },
  submitted: { label: "Тапсырылды", cls: "bg-[#e4efff] text-primary" },
  graded: { label: "Бағаланды", cls: "bg-green-soft text-green-ink" },
} as const;

/** Everything the quick quiz needs about the library. */
export const quizWorks = cache(() => sql<QuizWork[]>`select slug, title, author, author_years, genre, grades, lab from works order by slug`);

/** Today on the DB clock (Almaty time), as YYYY-MM-DD. */
export const today = cache(async () => (await sql<{ d: string }[]>`select current_date::text as d`)[0].d);

export type RatingRow = { id: string; full_name: string; pts: number; place: number };

/** This week's points (from Monday) of everyone in the class; equal points share a place. */
export const weeklyRating = cache(async (classId: string | null) => {
  if (!classId) return [];
  const rows = await sql<Omit<RatingRow, "place">[]>`
    select p.id, p.full_name, coalesce(sum(l.points), 0)::int as pts
    from class_members m join profiles p on p.id = m.student_id
    left join points_log l on l.student_id = p.id and l.at >= date_trunc('week', now())
    where m.class_id = ${classId}
    group by p.id, p.full_name
    order by pts desc, p.full_name`;
  let place = 0;
  return rows.map((r, i): RatingRow => ({ ...r, place: i > 0 && rows[i - 1].pts === r.pts ? place : (place = i + 1) }));
});
