"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import mammoth from "mammoth";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { joinCode } from "@/lib/password";
import { AiError, generateJson, isMock, type Usage } from "@/lib/ai";
import { mockFeedback, mockGenerate } from "@/lib/ai/mock";
import { FeedbackSchema, GenerationSchema, TaskSchema, type Task } from "@/lib/ai/schemas";
import { GENERATE_TASKS_SYSTEM, generateTasksUser } from "@/lib/ai/prompts/generate-tasks";
import { FEEDBACK_SYSTEM, feedbackUser } from "@/lib/ai/prompts/feedback";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

async function logUsage(userId: string, u: Usage) {
  await sql`insert into ai_usage (user_id, requests, input_tokens, output_tokens) values (${userId}, 1, ${u.input_tokens}, ${u.output_tokens})
    on conflict (user_id, day) do update set requests = ai_usage.requests + 1,
      input_tokens = ai_usage.input_tokens + excluded.input_tokens, output_tokens = ai_usage.output_tokens + excluded.output_tokens`;
}

/** Throws unless the class belongs to this teacher. */
async function ownClass(teacherId: string, classId: string) {
  const [c] = await sql`select id from classes where id = ${classId} and teacher_id = ${teacherId}`;
  if (!c) throw new Error("not your class");
}

async function ownSet(teacherId: string, setId: string) {
  const [s] = await sql`select id from task_sets where id = ${setId} and teacher_id = ${teacherId}`;
  if (!s) throw new Error("not your task set");
}

// ---------- classes ----------

export async function createClass(_: unknown, f: FormData) {
  const u = await requireRole("teacher");
  const name = str(f, "name").slice(0, 40);
  const grade = Number(f.get("grade"));
  if (!name || !(grade >= 5 && grade <= 11)) return { error: "Сынып атауы мен параллелін көрсетіңіз." };
  for (let i = 0; i < 5; i++) {
    const [c] = await sql`insert into classes (teacher_id, name, grade, join_code) values (${u.id}, ${name}, ${grade}, ${joinCode()})
      on conflict (join_code) do nothing returning id`;
    if (c) {
      revalidatePath("/mugalim", "layout");
      return { error: "" };
    }
  }
  return { error: "Код жасалмады, қайта көріңіз." };
}

// ---------- lab assignment (dashboard) ----------

export async function createLabAssignment(f: FormData) {
  const u = await requireRole("teacher");
  const classId = str(f, "class_id");
  await ownClass(u.id, classId);
  const tools = f.getAll("tools").map(String).filter((t) => ["olen", "char_map", "egerde", "zheli"].includes(t));
  const [w] = await sql<{ id: string; lab: Record<string, unknown> }[]>`select id, lab from works where id = ${str(f, "work_id")}`;
  // Only tools the work actually has data for.
  const usable = tools.filter((t) => ({ olen: w?.lab.poem, char_map: w?.lab.characters, egerde: w?.lab.egerde, zheli: w?.lab.timeline })[t]);
  if (!w || !usable.length) redirect(`/mugalim?c=${classId}&err=tools`);
  await sql`insert into assignments (class_id, kind, work_id, lab_tools, due_at, ai_mode)
    values (${classId}, 'lab', ${w.id}, ${usable}, ${str(f, "due_at") || null}, ${str(f, "ai_mode") || "limited"})`;
  revalidatePath("/mugalim");
  redirect(`/mugalim?c=${classId}&ok=1`);
}

export async function gradeEgerde(labWorkId: string, classId: string, f: FormData) {
  const u = await requireRole("teacher");
  await ownClass(u.id, classId);
  const scores = [0, 1, 2].map((i) => Math.max(0, Math.min(2, Number(f.get(`k${i}`)) || 0)));
  await sql`update lab_works l set teacher_scores = ${scores}
    where l.id = ${labWorkId} and l.kind = 'egerde'
      and exists (select 1 from class_members m where m.student_id = l.student_id and m.class_id = ${classId})`;
  revalidatePath("/mugalim");
}

// ---------- task generation ----------

export type GenState = { error?: string } | undefined;

async function materialFrom(f: FormData): Promise<{ text: string; title: string; workId: string | null }> {
  const file = f.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > 10 * 1024 * 1024) throw new AiError("Файл 10 МБ-тан аспауы керек.");
    const name = file.name.toLowerCase();
    const buf = Buffer.from(await file.arrayBuffer());
    if (name.endsWith(".txt")) return { text: buf.toString("utf8"), title: file.name.replace(/\.txt$/i, ""), workId: null };
    if (name.endsWith(".docx")) {
      const { value } = await mammoth.extractRawText({ buffer: buf });
      return { text: value, title: file.name.replace(/\.docx$/i, ""), workId: null };
    }
    throw new AiError("Әзірге тек TXT және DOCX файлдары қабылданады. PDF-тің мәтінін көшіріп қойыңыз.");
  }
  const pasted = str(f, "text");
  if (pasted) return { text: pasted, title: str(f, "title") || pasted.slice(0, 40), workId: null };
  const [w] = await sql<{ id: string; title: string; author: string; summary: string; text: string | null }[]>`select id, title, author, summary, text from works where id = ${str(f, "work_id")}`;
  if (w) return { text: [`${w.author}, «${w.title}».`, w.summary, w.text ?? ""].filter(Boolean).join("\n\n"), title: `«${w.title}»`, workId: w.id };
  throw new AiError("Материал беріңіз: файл жүктеңіз, мәтін қойыңыз немесе шығарма таңдаңыз.");
}

export async function generateTasks(_: GenState, f: FormData): Promise<GenState> {
  const u = await requireRole("teacher");
  const [method] = await sql<{ id: string; slug: string; name: string; description: string; instructions: string; example: string }[]>`
    select * from methods where id = ${str(f, "method_id")} and (owner_id is null or owner_id = ${u.id})`;
  if (!method) return { error: "Әдісті таңдаңыз." };
  const grade = Math.min(11, Math.max(5, Number(f.get("grade")) || 7));
  const level = ["A", "B", "C"].includes(str(f, "level")) ? str(f, "level") : "B";
  const count = Math.min(10, Math.max(1, Number(f.get("count")) || 5));
  const objective = str(f, "objective").slice(0, 300);

  let setId: string;
  try {
    const m = await materialFrom(f);
    const material = m.text.replace(/\r/g, "").trim().slice(0, 30_000);
    if (material.length < 30) return { error: "Материал тым қысқа. Кемінде бірнеше сөйлем керек." };

    let gen;
    if (isMock()) gen = mockGenerate({ methodSlug: method.slug, material, count, level });
    else {
      const r = await generateJson(GENERATE_TASKS_SYSTEM, generateTasksUser({ method: { ...method, instructions: method.example ? `${method.instructions}\nМұғалімнің мысал тапсырмасы (осы үлгіде жаса): ${method.example}` : method.instructions }, grade, level, objective, count, material }), GenerationSchema);
      await logUsage(u.id, r.usage);
      gen = r.data;
    }
    if (gen.insufficient_material && !gen.tasks.length) return { error: `ЖИ: материал жеткіліксіз. ${gen.note}` };

    setId = await sql.begin(async (tx) => {
      const [s] = await tx`insert into task_sets (teacher_id, method_id, work_id, title, material_text, grade, objective, level, ai_note)
        values (${u.id}, ${method.id}, ${m.workId}, ${(str(f, "title") || m.title).slice(0, 120)}, ${material}, ${grade}, ${objective}, ${level}, ${gen.note}) returning id`;
      for (const [i, t] of gen.tasks.entries())
        await tx`insert into tasks (set_id, position, type, prompt, options, answer_key, criteria, points, source_ref)
          values (${s.id}, ${i}, ${t.type}, ${t.prompt}, ${tx.json(t.options)}, ${tx.json(t.answer_key)}, ${t.criteria}, ${t.points}, ${t.source_ref})`;
      return s.id as string;
    });
  } catch (e) {
    if (e instanceof AiError) return { error: e.userMessage };
    console.error(e);
    return { error: "Күтпеген қате шықты. Қайта көріңіз." };
  }
  redirect(`/mugalim/bank/${setId}`);
}

// ---------- teacher's own method ----------

export async function createMethod(_: unknown, f: FormData) {
  const u = await requireRole("teacher");
  const name = str(f, "name").slice(0, 80);
  const description = str(f, "description").slice(0, 300);
  const example = str(f, "example").slice(0, 1000);
  if (name.length < 3 || description.length < 10) return { error: "Атауын және сипаттамасын толық жазыңыз." };
  await sql`insert into methods (slug, name, description, instructions, example, owner_id)
    values (${"own-" + crypto.randomUUID().slice(0, 8)}, ${name}, ${description}, ${description}, ${example}, ${u.id})`;
  revalidatePath("/mugalim/zhasau");
  return { error: "", ok: true };
}

// ---------- review & approve ----------

/** Edit form posts the whole task; options one per line; answer key as JSON. */
export async function updateTask(setId: string, taskId: string, _: unknown, f: FormData) {
  const u = await requireRole("teacher");
  await ownSet(u.id, setId);
  let answerKey: unknown;
  try {
    answerKey = JSON.parse(str(f, "answer_key") || "null");
  } catch {
    return { error: "Дұрыс жауап JSON пішімінде болуы керек, мысалы 1 немесе [\"сөз\"]." };
  }
  const parsed = TaskSchema.safeParse({
    type: str(f, "type"),
    prompt: str(f, "prompt"),
    options: str(f, "options").split("\n").map((s) => s.trim()).filter(Boolean),
    answer_key: answerKey,
    criteria: str(f, "criteria"),
    points: Number(f.get("points")),
    source_ref: str(f, "source_ref"),
  });
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  const t: Task = parsed.data;
  await sql`update tasks set type = ${t.type}, prompt = ${t.prompt}, options = ${sql.json(t.options)}, answer_key = ${sql.json(t.answer_key)},
    criteria = ${t.criteria}, points = ${t.points}, source_ref = ${t.source_ref}
    where id = ${taskId} and set_id = ${setId}`;
  revalidatePath(`/mugalim/bank/${setId}`);
  return { error: "", saved: Date.now() };
}

export async function deleteTask(setId: string, taskId: string) {
  const u = await requireRole("teacher");
  await ownSet(u.id, setId);
  await sql`delete from tasks where id = ${taskId} and set_id = ${setId} and (select status from task_sets where id = ${setId}) = 'draft'`;
  revalidatePath(`/mugalim/bank/${setId}`);
}

export async function approveSet(setId: string) {
  const u = await requireRole("teacher");
  await ownSet(u.id, setId);
  await sql`update task_sets set status = 'approved' where id = ${setId} and exists (select 1 from tasks where set_id = ${setId})`;
  revalidatePath(`/mugalim/bank/${setId}`);
}

export async function assignSet(setId: string, f: FormData) {
  const u = await requireRole("teacher");
  await ownSet(u.id, setId);
  const classId = str(f, "class_id");
  await ownClass(u.id, classId);
  const [s] = await sql`select status from task_sets where id = ${setId}`;
  if (s.status !== "approved") return; // students never see unapproved tasks
  const mode = ["off", "limited", "full"].includes(str(f, "ai_mode")) ? str(f, "ai_mode") : "limited";
  await sql`insert into assignments (class_id, kind, set_id, due_at, ai_mode) values (${classId}, 'tasks', ${setId}, ${str(f, "due_at") || null}, ${mode})`;
  redirect(`/mugalim/natizheler?c=${classId}`);
}

// ---------- grading open answers ----------

async function ownSubmission(teacherId: string, subId: string) {
  const [s] = await sql<{ id: string; set_id: string; answers: Record<string, unknown>; ai_suggestions: Record<string, unknown> }[]>`
    select s.id, a.set_id, s.answers, s.ai_suggestions from submissions s
    join assignments a on a.id = s.assignment_id join classes c on c.id = a.class_id
    where s.id = ${subId} and c.teacher_id = ${teacherId}`;
  if (!s) throw new Error("not your submission");
  return s;
}

export async function suggestScores(subId: string) {
  const u = await requireRole("teacher");
  const s = await ownSubmission(u.id, subId);
  const open = await sql<{ id: string; prompt: string; criteria: string; points: number }[]>`
    select id, prompt, criteria, points from tasks where set_id = ${s.set_id} and type = 'open' order by position`;
  const out: Record<string, unknown> = { ...s.ai_suggestions };
  try {
    for (const t of open) {
      const answer = String(s.answers[t.id] ?? "");
      let fb;
      if (isMock()) fb = mockFeedback({ answer, points: t.points });
      else {
        const r = await generateJson(FEEDBACK_SYSTEM, feedbackUser({ ...t, answer }), FeedbackSchema);
        await logUsage(u.id, r.usage);
        fb = r.data;
      }
      out[t.id] = { ...fb, suggested_score: Math.min(t.points, fb.suggested_score) };
    }
  } catch (e) {
    console.error(e);
    redirect(`/mugalim/natizheler/${subId}?err=${encodeURIComponent(e instanceof AiError ? e.userMessage : "ЖИ қатесі")}`);
  }
  await sql`update submissions set ai_suggestions = ${sql.json(out as never)} where id = ${subId}`;
  revalidatePath(`/mugalim/natizheler/${subId}`);
}

export async function saveGrades(subId: string, f: FormData) {
  const u = await requireRole("teacher");
  const s = await ownSubmission(u.id, subId);
  const open = await sql<{ id: string; points: number }[]>`select id, points from tasks where set_id = ${s.set_id} and type = 'open'`;
  const scores = Object.fromEntries(open.map((t) => [t.id, Math.max(0, Math.min(t.points, Number(f.get(`s_${t.id}`)) || 0))]));
  await sql`update submissions set teacher_scores = ${sql.json(scores)}, feedback = ${str(f, "feedback").slice(0, 1000)}, status = 'graded' where id = ${subId}`;
  revalidatePath("/mugalim/natizheler");
  redirect(`/mugalim/natizheler/${subId}?ok=1`);
}
