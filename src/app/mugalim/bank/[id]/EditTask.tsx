"use client";
import { useActionState } from "react";
import { TASK_TYPES, TASK_TYPE_LABEL } from "@/lib/ai/schemas";
import type { DbTask } from "@/components/TaskFields";
import { updateTask } from "../../actions";

export function EditTask({ setId, task: t }: { setId: string; task: DbTask }) {
  const [state, action, pending] = useActionState(updateTask.bind(null, setId, t.id), undefined);
  // after a failed save, show what the teacher typed, not the stored task
  const v: Record<string, string> = state && "values" in state && state.values ? state.values : {};
  const f = (k: string) => `${k}-${t.id}`;
  return (
    <details className="mt-4 rounded-2xl bg-soft p-4">
      <summary className="cursor-pointer font-bold text-primary">Өңдеу</summary>
      <form action={action} key={JSON.stringify(v)} className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor={f("type")} className="label">Түрі</label>
          <select id={f("type")} name="type" defaultValue={v.type ?? t.type} className="field">
            {TASK_TYPES.map((x) => <option key={x} value={x}>{TASK_TYPE_LABEL[x]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={f("points")} className="label">Балы</label>
          <input id={f("points")} name="points" type="number" min={1} max={10} defaultValue={v.points ?? t.points} className="field" />
        </div>
        <div className="md:col-span-2">
          <label htmlFor={f("prompt")} className="label">Шарты</label>
          <textarea id={f("prompt")} name="prompt" rows={2} defaultValue={v.prompt ?? t.prompt} className="field" />
        </div>
        <div>
          <label htmlFor={f("options")} className="label">Нұсқалар (әр жолға біреу)</label>
          <textarea id={f("options")} name="options" rows={4} defaultValue={v.options ?? t.options.join("\n")} className="field" />
        </div>
        <div>
          <label htmlFor={f("key")} className="label">Дұрыс жауап (JSON)</label>
          <textarea id={f("key")} name="answer_key" rows={4} defaultValue={v.answer_key ?? JSON.stringify(t.answer_key)} className="field font-mono text-sm" />
        </div>
        <div>
          <label htmlFor={f("criteria")} className="label">Критерий</label>
          <textarea id={f("criteria")} name="criteria" rows={2} defaultValue={v.criteria ?? t.criteria} className="field" />
        </div>
        <div>
          <label htmlFor={f("src")} className="label">Дереккөзі</label>
          <input id={f("src")} name="source_ref" defaultValue={v.source_ref ?? t.source_ref} className="field" />
        </div>
        <div className="flex items-center justify-between gap-3 md:col-span-2">
          <p role="status" aria-live="polite" className={`text-sm font-bold ${state?.error ? "text-red-ink" : "text-green-ink"}`}>
            {state?.error || (state && "✓ Сақталды")}
          </p>
          <button className="btn-primary" disabled={pending}>Сақтау</button>
        </div>
      </form>
    </details>
  );
}
