import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, Sparkles } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { formatAnswer, type DbTask } from "@/components/TaskFields";
import { saveGrades, suggestScores } from "../../actions";
import { Submit } from "@/components/Submit";

export const metadata = { title: "Бағалау" };

type Sub = { id: string; full_name: string; title: string; class_id: string; assignment_id: string; set_id: string; answers: Record<string, unknown>; auto_scores: Record<string, number>; teacher_scores: Record<string, number>; ai_suggestions: Record<string, { suggested_score: number; feedback: string }>; feedback: string; used_ai_hint: boolean; status: string };

export default async function Grade({ params, searchParams }: PageProps<"/mugalim/natizheler/[id]">) {
  const u = await requireRole("teacher");
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [s] = await sql<Sub[]>`
    select s.*, p.full_name, ts.title, a.class_id, a.set_id from submissions s
    join profiles p on p.id = s.student_id join assignments a on a.id = s.assignment_id
    join task_sets ts on ts.id = a.set_id join classes c on c.id = a.class_id
    where s.id = ${id} and c.teacher_id = ${u.id}`;
  if (!s) notFound();
  const tasks = await sql<DbTask[]>`select id, type, prompt, options, answer_key, criteria, points, source_ref from tasks where set_id = ${s.set_id} order by position`;
  const open = tasks.filter((t) => t.type === "open");

  return (
    <div className="flex flex-col gap-6">
      <header className="card flex items-center gap-4 py-4">
        <Link href={`/mugalim/natizheler?c=${s.class_id}&a=${s.assignment_id}`} className="grid size-12 place-items-center rounded-2xl bg-soft" aria-label="Нәтижелерге қайту">
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <div>
          <p className="text-xs font-bold text-muted">{s.title}</p>
          <h1 className="text-2xl font-bold">{s.full_name}</h1>
        </div>
        {s.used_ai_hint && <span className="tag ml-auto gap-1 bg-violet-soft text-violet"><Bot className="size-4" aria-hidden="true" /> Кеңеспен орындалды</span>}
      </header>
      {sp.ok && <p role="status" className="rounded-2xl bg-green-soft p-3 font-bold text-green-ink">✓ Баға сақталды</p>}
      {sp.err && <p role="alert" className="rounded-2xl bg-red-soft p-3 font-bold text-red-ink">{String(sp.err)}</p>}

      {tasks.filter((t) => t.type !== "open").length > 0 && (
        <section className="card" aria-labelledby="closed">
          <h2 id="closed" className="mb-3 text-xl font-bold">Жабық сұрақтар (ережемен тексерілді)</h2>
          <ul className="flex flex-col gap-2">
            {tasks.filter((t) => t.type !== "open").map((t) => (
              <li key={t.id} className="flex flex-wrap justify-between gap-2 rounded-2xl bg-soft p-3 text-sm">
                <span><b>{t.prompt}</b><br />Жауабы: {formatAnswer(t, s.answers[t.id])}</span>
                <span className={`num font-bold ${s.auto_scores[t.id] === t.points ? "text-green-ink" : "text-red-ink"}`}>{s.auto_scores[t.id] ?? 0} / {t.points}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {open.length > 0 && (
        <form action={suggestScores.bind(null, id)} className="flex justify-end">
          <Submit className="btn-ghost gap-2"><Sparkles className="size-4 text-violet" aria-hidden="true" /> ЖИ-ден ұсыныс балы мен пікір алу</Submit>
        </form>
      )}

      <form action={saveGrades.bind(null, id)} className="flex flex-col gap-4">
        {open.map((t) => {
          const ai = s.ai_suggestions[t.id];
          return (
            <section key={t.id} className="card">
              <p className="text-xs font-bold text-muted">Ашық жауап · {t.points} балл</p>
              <h2 className="mt-1 text-lg font-bold">{t.prompt}</h2>
              <p className="mt-1 text-sm text-muted">Критерий: {t.criteria}</p>
              <blockquote className="mt-3 whitespace-pre-wrap rounded-2xl bg-soft p-4">{String(s.answers[t.id] ?? "—")}</blockquote>
              {ai && (
                <div className="mt-3 rounded-2xl border-2 border-violet-soft p-4 text-sm">
                  <p className="font-bold text-violet">ЖИ ұсынысы: {ai.suggested_score} / {t.points} балл</p>
                  <p className="mt-1">{ai.feedback}</p>
                  <p className="mt-1 text-xs text-muted">Бұл тек ұсыныс. Соңғы балды сіз қоясыз.</p>
                </div>
              )}
              <div className="mt-4 flex items-center gap-3">
                <label htmlFor={`s_${t.id}`} className="font-bold">Мұғалім балы</label>
                <input id={`s_${t.id}`} name={`s_${t.id}`} type="number" min={0} max={t.points} required
                  defaultValue={s.teacher_scores[t.id] ?? ai?.suggested_score ?? ""} className="field num w-24" />
                <span className="text-muted">/ {t.points}</span>
              </div>
            </section>
          );
        })}
        <section className="card">
          <label htmlFor="fb" className="label">Оқушыға пікір</label>
          <textarea id="fb" name="feedback" rows={3} maxLength={1000} defaultValue={s.feedback || (open.map((t) => s.ai_suggestions[t.id]?.feedback).filter(Boolean).join(" "))} className="field" />
          <div className="mt-4 flex justify-end">
            <Submit className="btn-primary h-12 px-8">Бағаны сақтау</Submit>
          </div>
        </section>
      </form>
    </div>
  );
}
