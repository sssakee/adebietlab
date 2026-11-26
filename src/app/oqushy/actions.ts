"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { compareMap, compareTimeline, PLOT_ELEMENTS, POINTS, scoreTask, type Answer, type Edge } from "@/lib/grading";
import { addPoints, getWork } from "@/lib/queries";
import type { Task } from "@/lib/ai/schemas";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** Upserts a lab result; returns the previous result (null on first save). */
async function saveLab(studentId: string, workId: string, kind: string, data: object, result: object, shared = false) {
  const [prev] = await sql<{ result: Record<string, unknown> }[]>`
    select result from lab_works where student_id = ${studentId} and work_id = ${workId} and kind = ${kind}`;
  await sql`insert into lab_works (student_id, work_id, kind, data, result, shared)
    values (${studentId}, ${workId}, ${kind}, ${sql.json(data as never)}, ${sql.json(result as never)}, ${shared})
    on conflict (student_id, work_id, kind) do update
      set data = excluded.data, result = excluded.result, shared = excluded.shared, updated_at = now()`;
  return prev?.result ?? null;
}

export type OlenResult = { meter_ok: boolean; rhyme_ok: boolean } | null;

export async function checkOlen(slug: string, meter: string, rhyme: string): Promise<OlenResult> {
  const u = await requireRole("student");
  const w = await getWork(slug);
  if (!w?.lab.poem) return null;
  const result = { meter_ok: meter === w.lab.poem.meter, rhyme_ok: rhyme === w.lab.poem.rhyme };
  const prev = await saveLab(u.id, w.id, "olen", { meter, rhyme }, result);
  // Points once: the first time both answers are right.
  if (result.meter_ok && result.rhyme_ok && !(prev?.meter_ok && prev?.rhyme_ok)) await addPoints(u.id, POINTS.olen);
  revalidatePath("/oqushy");
  return result;
}

async function mapEdges(studentId: string, workId: string) {
  const [row] = await sql<{ data: { edges?: Edge[] } }[]>`
    select data from lab_works where student_id = ${studentId} and work_id = ${workId} and kind = 'char_map'`;
  return row?.data.edges ?? [];
}

async function saveMap(studentId: string, slug: string, edges: Edge[]) {
  const w = await getWork(slug);
  if (!w?.lab.reference) return;
  const cmp = compareMap(w.lab.reference, edges);
  const result = { found: cmp.found, total: cmp.total, missing: cmp.missing.map((e) => [e.from, e.to].sort().join("|")) };
  const prev = await saveLab(studentId, w.id, "char_map", { edges }, result);
  const gained = cmp.found - Number(prev?.found ?? 0);
  if (gained > 0) await addPoints(studentId, gained * 2);
  if (cmp.found === cmp.total && Number(prev?.found ?? 0) < cmp.total) await addPoints(studentId, POINTS.charMap);
  revalidatePath(`/oqushy/zertkhana/karta/${slug}`);
}

export async function addEdge(slug: string, f: FormData) {
  const u = await requireRole("student");
  const w = await getWork(slug);
  const ids = new Set(w?.lab.characters?.map((c) => c.id));
  const from = str(f, "from");
  const to = str(f, "to");
  const evidence = str(f, "evidence").slice(0, 300);
  if (!w || !ids.has(from) || !ids.has(to) || from === to) return;
  const edges = (await mapEdges(u.id, w.id)).filter((e) => [e.from, e.to].sort().join() !== [from, to].sort().join());
  await saveMap(u.id, slug, [...edges, { from, to, evidence }]);
}

export async function removeEdge(slug: string, from: string, to: string) {
  const u = await requireRole("student");
  const w = await getWork(slug);
  if (!w) return;
  const edges = (await mapEdges(u.id, w.id)).filter((e) => !(e.from === from && e.to === to));
  await saveMap(u.id, slug, edges);
}

export async function saveEgerde(slug: string, f: FormData) {
  const u = await requireRole("student");
  const w = await getWork(slug);
  if (!w?.lab.egerde) return;
  const prediction = str(f, "prediction").slice(0, 2000);
  const evidence = str(f, "evidence").slice(0, 500);
  if (prediction.length < 10) return;
  const checklist = w.lab.egerde.checklist.map((_, i) => f.get(`c${i}`) === "on");
  const prev = await saveLab(u.id, w.id, "egerde", { prediction, evidence, checklist }, {}, true);
  if (!prev) await addPoints(u.id, POINTS.egerde);
  revalidatePath(`/oqushy/zertkhana/karta/${slug}`);
}

export async function toggleVote(slug: string, labWorkId: string) {
  const u = await requireRole("student");
  // Only classmates' shared predictions, never your own.
  const [ok] = await sql`select 1 from lab_works l
    join class_members m on m.student_id = l.student_id
    where l.id = ${labWorkId} and l.shared and l.student_id <> ${u.id} and m.class_id = ${u.class_id}`;
  if (!ok) return;
  const del = await sql`delete from lab_votes where lab_work_id = ${labWorkId} and student_id = ${u.id}`;
  if (!del.count) await sql`insert into lab_votes values (${labWorkId}, ${u.id})`;
  revalidatePath(`/oqushy/zertkhana/karta/${slug}`);
}

type DbTask = Task & { id: string };

export async function submitAssignment(assignmentId: string, f: FormData) {
  const u = await requireRole("student");
  const [a] = await sql`select a.id, a.set_id from assignments a
    where a.id = ${assignmentId} and a.kind = 'tasks' and a.class_id = ${u.class_id}`;
  if (!a) return;
  const [done] = await sql`select 1 from submissions where assignment_id = ${a.id} and student_id = ${u.id}`;
  if (done) redirect(`/oqushy/tapsyrmalar/${assignmentId}`);

  const tasks = await sql<DbTask[]>`select * from tasks where set_id = ${a.set_id} order by position`;
  const answers: Record<string, Answer> = {};
  const auto: Record<string, number> = {};
  for (const t of tasks) {
    const key = `t_${t.id}`;
    let ans: Answer;
    if (t.type === "single_choice") ans = f.get(key) === null ? null : Number(f.get(key));
    else if (t.type === "multiple_choice") ans = f.getAll(key).map(Number);
    else if (t.type === "ordering") ans = t.options.map((_, i) => Number(f.get(`${key}_${i}`)) - 1);
    else if (t.type === "matching")
      ans = Object.fromEntries(Object.keys(t.answer_key as Record<string, string>).map((l, i) => [l, String(f.get(`${key}_${i}`) ?? "")]));
    else ans = String(f.get(key) ?? "").slice(0, 4000);
    // ordering: input holds "position of option i"; turn it into "option index at each position"
    if (t.type === "ordering" && Array.isArray(ans)) {
      const pos = ans as number[];
      ans = pos.map((_, p) => pos.indexOf(p));
    }
    answers[t.id] = ans;
    const s = scoreTask(t, ans);
    if (s !== null) auto[t.id] = s;
  }
  const [hint] = await sql`select 1 from ai_hints where assignment_id = ${a.id} and student_id = ${u.id}`;
  const hasOpen = tasks.some((t) => t.type === "open");
  await sql`insert into submissions (assignment_id, student_id, answers, auto_scores, status, used_ai_hint)
    values (${a.id}, ${u.id}, ${sql.json(answers as never)}, ${sql.json(auto)}, ${hasOpen ? "submitted" : "graded"}, ${!!hint})
    on conflict do nothing`;
  await addPoints(u.id, POINTS.assignment);
  revalidatePath("/oqushy", "layout");
  redirect(`/oqushy/tapsyrmalar/${assignmentId}`);
}

export type ZheliResult = ReturnType<typeof compareTimeline> | null;

export async function checkZheli(slug: string, order: string[], elements: Record<string, string>): Promise<ZheliResult> {
  const u = await requireRole("student");
  const w = await getWork(slug);
  const ref = w?.lab.timeline;
  if (!w || !ref) return null;
  const ids = new Set(ref.map((e) => e.id));
  if (order.length !== ref.length || !order.every((id) => ids.has(id))) return null;
  const cleanEls = Object.fromEntries(Object.entries(elements).filter(([k, v]) => ids.has(k) && (PLOT_ELEMENTS as readonly string[]).includes(v)));
  const result = compareTimeline(ref, order, cleanEls);
  const prev = await saveLab(u.id, w.id, "zheli", { order, elements: cleanEls }, result);
  const perfect = (r: { orderOk?: unknown; elementsOk?: unknown; total?: unknown } | null) => !!r && r.orderOk === r.total && r.elementsOk === r.total;
  if (perfect(result) && !perfect(prev)) await addPoints(u.id, POINTS.zheli);
  revalidatePath("/oqushy");
  return result;
}
