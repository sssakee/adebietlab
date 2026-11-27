import type { Task } from "@/lib/ai/schemas";
import { MicButton } from "./MicButton";
import { TASK_TYPE_LABEL } from "@/lib/ai/schemas";

export type DbTask = Task & { id: string };

/** Answer inputs for one task. Field names: t_<id>[_<i>]; parsed by submitAssignment. */
export function TaskFields({ t, n }: { t: DbTask; n: number }) {
  const key = `t_${t.id}`;
  const head = (
    <legend className="mb-3">
      <span className="text-xs font-bold text-muted">
        {n}. {TASK_TYPE_LABEL[t.type]} · {t.points} балл
      </span>
      <span className="mt-1 block text-lg font-bold">{t.prompt}</span>
    </legend>
  );
  if (t.type === "single_choice" || t.type === "multiple_choice")
    return (
      <fieldset>
        {head}
        <div className="flex flex-col gap-2">
          {t.options.map((o, i) => (
            <label key={i} className="chip cursor-pointer justify-start">
              <input type={t.type === "single_choice" ? "radio" : "checkbox"} name={key} value={i} required={t.type === "single_choice"} className="mr-3 size-5 accent-primary" />
              {o}
            </label>
          ))}
        </div>
      </fieldset>
    );
  if (t.type === "ordering")
    return (
      <fieldset>
        {head}
        <p className="mb-2 text-sm text-muted">Әр жолға реттік нөмір қой (1 — бірінші).</p>
        <ul className="flex flex-col gap-2">
          {t.options.map((o, i) => (
            <li key={i} className="flex items-center gap-3 rounded-2xl bg-soft p-3">
              <label className="sr-only" htmlFor={`${key}_${i}`}>
                «{o}» реті
              </label>
              <select id={`${key}_${i}`} name={`${key}_${i}`} required className="field w-20 shrink-0 py-2" defaultValue="">
                <option value="" disabled>
                  —
                </option>
                {t.options.map((_, p) => (
                  <option key={p} value={p + 1}>
                    {p + 1}
                  </option>
                ))}
              </select>
              <span className="font-medium">{o}</span>
            </li>
          ))}
        </ul>
      </fieldset>
    );
  if (t.type === "matching") {
    const left = Object.keys((t.answer_key ?? {}) as Record<string, string>);
    return (
      <fieldset>
        {head}
        <ul className="flex flex-col gap-2">
          {left.map((l, i) => (
            <li key={l} className="grid items-center gap-2 rounded-2xl bg-soft p-3 sm:grid-cols-2">
              <label htmlFor={`${key}_${i}`} className="font-bold">
                {l}
              </label>
              <select id={`${key}_${i}`} name={`${key}_${i}`} required className="field py-2" defaultValue="">
                <option value="" disabled>
                  Таңда…
                </option>
                {t.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </fieldset>
    );
  }
  return (
    <fieldset>
      {head}
      <label htmlFor={key} className="sr-only">
        Жауабың
      </label>
      {t.type === "fill_blank" ? (
        <input id={key} name={key} required className="field" autoComplete="off" />
      ) : (
        <>
          <textarea id={key} name={key} required rows={5} maxLength={4000} className="field" />
          <div className="mt-2"><MicButton target={key} /></div>
        </>
      )}
    </fieldset>
  );
}

/** Human-readable answer for result screens. */
export function formatAnswer(t: DbTask, a: unknown): string {
  if (a === null || a === undefined || a === "") return "—";
  if (t.type === "single_choice") return t.options[a as number] ?? "—";
  if (t.type === "multiple_choice" || t.type === "ordering") return (a as number[]).map((i) => t.options[i] ?? "?").join(t.type === "ordering" ? " → " : "; ");
  if (t.type === "matching") return Object.entries(a as Record<string, string>).map(([l, r]) => `${l} — ${r || "?"}`).join("; ");
  return String(a);
}
