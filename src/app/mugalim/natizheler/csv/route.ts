import { getUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { toCsv } from "@/lib/csv";

// GET /mugalim/natizheler/csv?a=<assignment id> — results of a task assignment as CSV.
export async function GET(req: Request) {
  const u = await getUser();
  if (u?.role !== "teacher") return new Response("Кіру керек.", { status: 401 });
  const id = new URL(req.url).searchParams.get("a") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Тапсырма көрсетілмеген.", { status: 400 });
  const [a] = await sql<{ class_id: string; set_id: string | null; title: string; class_name: string }[]>`
    select a.class_id, a.set_id, ts.title, c.name as class_name from assignments a
    join classes c on c.id = a.class_id join task_sets ts on ts.id = a.set_id
    where a.id = ${id} and c.teacher_id = ${u.id}`;
  if (!a) return new Response("Табылмады.", { status: 404 });

  const tasks = await sql<{ id: string; points: number }[]>`select id, points from tasks where set_id = ${a.set_id} order by position`;
  const rows = await sql<{ full_name: string; scores: Record<string, number> | null; used_ai_hint: boolean | null; status: string | null }[]>`
    select p.full_name, (s.auto_scores || s.teacher_scores) as scores, s.used_ai_hint, s.status
    from class_members m join profiles p on p.id = m.student_id
    left join submissions s on s.assignment_id = ${id} and s.student_id = p.id
    where m.class_id = ${a.class_id} order by p.full_name`;
  const max = tasks.reduce((s, t) => s + t.points, 0);
  const status = (r: (typeof rows)[number]) => (!r.status ? "тапсырмаған" : r.status === "graded" ? "бағаланды" : "бағалауды күтуде");
  const csv = toCsv([
    ["Оқушы", ...tasks.map((t, i) => `${i + 1} (${t.points})`), `Жиыны (${max})`, "Күйі", "ЖИ кеңесі"],
    ...rows.map((r) => [
      r.full_name,
      ...tasks.map((t) => r.scores?.[t.id] ?? null),
      r.scores ? Object.values(r.scores).reduce((s, v) => s + v, 0) : null,
      status(r),
      r.used_ai_hint ? "иә" : "",
    ]),
  ]);
  const name = `${a.class_name} ${a.title}`.replace(/[^\p{L}\p{N} _-]/gu, "").trim().slice(0, 60) || "natizheler";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="natizheler.csv"; filename*=UTF-8''${encodeURIComponent(name)}.csv`,
      "Cache-Control": "no-store",
    },
  });
}
