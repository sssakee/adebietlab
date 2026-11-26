import Link from "next/link";
import { notFound } from "next/navigation";
import { Bot, Sparkles } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { STATUS, studentAssignments, TOOL_LABEL, toolHref } from "@/lib/queries";
import { AI_MODE_LABEL } from "@/lib/ai/prompts/chat";
import { formatAnswer, TaskFields, type DbTask } from "@/components/TaskFields";
import { submitAssignment } from "@/app/oqushy/actions";
import { LabHeader } from "../../zertkhana/LabHeader";

export const metadata = { title: "Тапсырма" };

export default async function AssignmentPage({ params }: PageProps<"/oqushy/tapsyrmalar/[id]">) {
  const u = await requireRole("student");
  const { id } = await params;
  const a = (await studentAssignments(u.id, u.class_id)).find((x) => x.id === id);
  if (!a) notFound();

  const header = (
    <LabHeader kicker={`Мұғалім тапсырмасы · ${AI_MODE_LABEL[a.ai_mode]}${a.due_at ? ` · мерзімі ${a.due_at}` : ""}`} title={a.title} back="/oqushy/tapsyrmalar">
      <span className={`tag ${STATUS[a.status].cls}`}>{STATUS[a.status].label}</span>
    </LabHeader>
  );

  if (a.kind === "lab")
    return (
      <div className="flex flex-col gap-6">
        {header}
        <section className="card">
          <h2 className="mb-4 text-xl font-bold">Зертхана құралдары</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {a.lab_tools.map((t) => (
              <li key={t}>
                <Link href={toolHref(a.work_slug!, t)} className="flex min-h-16 items-center justify-between gap-3 rounded-2xl bg-soft px-5 font-bold hover:bg-[#e4efff]">
                  {TOOL_LABEL[t]} <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    );

  const [set] = await sql<{ id: string; ai_generated: boolean }[]>`select ts.id, ts.ai_generated from assignments a join task_sets ts on ts.id = a.set_id where a.id = ${id}`;
  const tasks = await sql<DbTask[]>`select id, type, prompt, options, answer_key, criteria, points, source_ref from tasks where set_id = ${set.id} order by position`;
  const [sub] = await sql<{ answers: Record<string, unknown>; auto_scores: Record<string, number>; teacher_scores: Record<string, number>; feedback: string; used_ai_hint: boolean }[]>`
    select answers, auto_scores, teacher_scores, feedback, used_ai_hint from submissions where assignment_id = ${id} and student_id = ${u.id}`;

  return (
    <div className="flex flex-col gap-6">
      {header}
      {set.ai_generated && (
        <p className="flex items-center gap-2 text-sm font-bold text-violet">
          <Sparkles className="size-4" aria-hidden="true" /> ЖИ көмегімен жасалды, мұғалім тексеріп бекітті
        </p>
      )}
      {sub ? (
        <section className="pop card" aria-labelledby="res">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="res" className="text-2xl font-bold">Нәтижем</h2>
            <span className="num text-2xl font-bold">
              {a.score} / {a.max}
            </span>
          </div>
          {sub.used_ai_hint && (
            <p className="mt-2 flex items-center gap-2 text-sm font-bold text-muted">
              <Bot className="size-4" aria-hidden="true" /> Кеңеспен орындалды
            </p>
          )}
          {sub.feedback && <p className="mt-4 rounded-2xl bg-green-soft p-4 font-medium text-green-ink">Мұғалім пікірі: {sub.feedback}</p>}
          <ol className="mt-5 flex flex-col gap-3">
            {tasks.map((t, i) => {
              const got = sub.auto_scores[t.id] ?? sub.teacher_scores[t.id];
              return (
                <li key={t.id} className="rounded-2xl bg-soft p-4">
                  <p className="font-bold">
                    {i + 1}. {t.prompt}
                  </p>
                  <p className="mt-1 text-sm">Жауабым: {formatAnswer(t, sub.answers[t.id])}</p>
                  <p className={`num mt-1 text-sm font-bold ${got === undefined ? "text-muted" : got === t.points ? "text-green-ink" : "text-red-ink"}`}>
                    {got === undefined ? "Мұғалім тексеріп жатыр" : `${got} / ${t.points} балл`}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>
      ) : (
        <form action={submitAssignment.bind(null, id)} className="card flex flex-col gap-8">
          {tasks.map((t, i) => (
            <TaskFields key={t.id} t={t} n={i + 1} />
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <p className="text-sm text-muted">Жабық сұрақтар бірден тексеріледі, ашық жауапты мұғалім бағалайды.</p>
            <button className="btn-primary h-14 px-10">Тапсыру</button>
          </div>
        </form>
      )}
    </div>
  );
}
