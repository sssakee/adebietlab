import { notFound } from "next/navigation";
import { Sparkles, Trash2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { teacherClasses } from "@/lib/teacher";
import { TASK_TYPE_LABEL } from "@/lib/ai/schemas";
import type { DbTask } from "@/components/TaskFields";
import { approveSet, assignSet, deleteTask } from "../../actions";
import { EditTask } from "./EditTask";
import { Submit } from "@/components/Submit";

export const metadata = { title: "Жинақты қарау" };

export default async function SetPage({ params }: PageProps<"/mugalim/bank/[id]">) {
  const u = await requireRole("teacher");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [set] = await sql<{ id: string; title: string; method: string; grade: number; level: string; status: string; objective: string; material_text: string; ai_generated: boolean; ai_note: string }[]>`
    select ts.*, m.name as method from task_sets ts join methods m on m.id = ts.method_id where ts.id = ${id} and ts.teacher_id = ${u.id}`;
  if (!set) notFound();
  const tasks = await sql<DbTask[]>`select id, type, prompt, options, answer_key, criteria, points, source_ref from tasks where set_id = ${id} order by position`;
  const classes = await teacherClasses(u.id);
  const draft = set.status === "draft";
  const total = tasks.reduce((s, t) => s + t.points, 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="card">
        <div className="flex flex-wrap gap-2">
          <span className={`tag ${draft ? "bg-gold-soft text-ink" : "bg-green-soft text-green-ink"}`}>{draft ? "Жоба: оқушыларға көрінбейді" : "Бекітілген"}</span>
          {set.ai_generated && <span className="tag gap-1 bg-violet-soft text-violet"><Sparkles className="size-3.5" aria-hidden="true" /> ЖИ көмегімен жасалды</span>}
        </div>
        <h1 className="mt-3 text-3xl font-bold">{set.title}</h1>
        <p className="mt-1 text-muted">{set.method} · {set.grade}-сынып · {set.level} деңгей · {tasks.length} тапсырма · {total} балл</p>
        {set.objective && <p className="mt-1 text-muted">Оқу мақсаты: {set.objective}</p>}
        {set.ai_note && <p className="mt-3 rounded-2xl bg-soft p-3 text-sm font-medium">{set.ai_note}</p>}
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-bold text-primary">Материалды көрсету</summary>
          <p className="mt-2 max-h-64 overflow-y-auto whitespace-pre-line rounded-2xl bg-soft p-4 text-sm">{set.material_text}</p>
        </details>
      </header>

      <ol className="flex flex-col gap-4">
        {tasks.map((t, i) => (
          <li key={t.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-xs font-bold text-muted">{i + 1}. {TASK_TYPE_LABEL[t.type]} · {t.points} балл{t.source_ref && ` · дереккөзі: ${t.source_ref}`}</p>
              {draft && (
                <form action={deleteTask.bind(null, id, t.id)}>
                  <Submit className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-red-ink hover:bg-red-soft">
                    <Trash2 className="size-4" aria-hidden="true" /> Жою
                  </Submit>
                </form>
              )}
            </div>
            <p className="mt-2 text-lg font-bold">{t.prompt}</p>
            {t.options.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-sm">
                {t.options.map((o, j) => <li key={j}>{o}</li>)}
              </ul>
            )}
            <p className="mt-2 text-sm"><b>Дұрыс жауап:</b> <code className="rounded bg-soft px-1.5">{JSON.stringify(t.answer_key)}</code></p>
            <p className="mt-1 text-sm"><b>Критерий:</b> {t.criteria}</p>
            {draft && <EditTask setId={id} task={t} />}
          </li>
        ))}
      </ol>

      {draft ? (
        <form action={approveSet.bind(null, id)} className="card flex flex-wrap items-center justify-between gap-4">
          <p className="text-muted">Барлық тапсырманы тексердіңіз бе? Бекіткеннен кейін жинақты сыныпқа беруге болады.</p>
          <Submit className="btn-primary h-14 px-8" disabled={!tasks.length}>Бекіту</Submit>
        </form>
      ) : (
        <form action={assignSet.bind(null, id)} className="card grid items-end gap-4 md:grid-cols-4">
          <h2 className="text-xl font-bold md:col-span-4">Сыныпқа беру</h2>
          <div>
            <label htmlFor="cl" className="label">Сынып</label>
            <select id="cl" name="class_id" required className="field">
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="due" className="label">Мерзімі</label>
            <input id="due" name="due_at" type="date" className="field" />
          </div>
          <div>
            <label htmlFor="ai" className="label">ЖИ көмекші режимі</label>
            <select id="ai" name="ai_mode" className="field" defaultValue="limited">
              <option value="off">ЖИ-сіз</option>
              <option value="limited">Шектеулі ЖИ</option>
              <option value="full">ЖИ рұқсат етілген</option>
            </select>
          </div>
          <Submit className="btn-primary h-14 px-8" disabled={!classes.length}>Сыныпқа жіберу</Submit>
        </form>
      )}
    </div>
  );
}
