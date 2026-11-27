"use client";
import { useActionState } from "react";
import { generateTasks } from "../actions";
import { FilePick } from "@/components/FilePick";

export function GenForm({ methods, works }: { methods: { id: string; name: string; description: string; own: boolean }[]; works: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState(generateTasks, undefined);
  const v = state?.values ?? {};
  return (
    <form action={action} key={JSON.stringify(v)} className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <section className="card flex flex-col gap-5" aria-labelledby="mat">
        <h2 id="mat" className="text-xl font-bold">1. Материал</h2>
        <FilePick id="file" name="file" accept=".txt,.docx" label="Файл жүктеу (TXT, DOCX, 10 МБ-қа дейін)" />
        <div>
          <label htmlFor="text" className="label">немесе мәтінді қойыңыз</label>
          <textarea id="text" name="text" rows={9} maxLength={30000} defaultValue={v.text} className="field" placeholder="Сабаққа арналған үзінді, мақала немесе түсіндірме…" />
        </div>
        <div>
          <label htmlFor="work" className="label">немесе кітапханадан шығарма таңдаңыз</label>
          <select id="work" name="work_id" className="field" defaultValue={v.work_id ?? ""}>
            <option value="">— таңдалмаған —</option>
            {works.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
          </select>
        </div>
        <p className="text-sm text-muted">Бірнешеуі толтырылса, файл, сосын мәтін алынады.</p>
      </section>

      <section className="card flex flex-col gap-5" aria-labelledby="par">
        <h2 id="par" className="text-xl font-bold">2. Параметрлер</h2>
        <fieldset>
          <legend className="label">Әдіс</legend>
          <div className="flex flex-col gap-2">
            {methods.map((m, i) => (
              <label key={m.id} className="chip cursor-pointer flex-col items-start gap-0.5 py-3">
                <input type="radio" name="method_id" value={m.id} defaultChecked={v.method_id ? v.method_id === m.id : i === 0} className="sr-only" />
                <span>{m.name}{m.own && <span className="tag ml-2 bg-violet-soft text-violet">өз әдісім</span>}</span>
                <span className="text-xs font-medium text-muted">{m.description}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="title" className="label">Жинақ атауы</label>
          <input id="title" name="title" maxLength={120} defaultValue={v.title} className="field" placeholder="Мысалы: Абай, «Қыс»: кейіптеу" />
        </div>
        <div>
          <label htmlFor="obj" className="label">Оқу мақсаты</label>
          <input id="obj" name="objective" maxLength={300} defaultValue={v.objective} className="field" placeholder="Өлеңдегі кейіптеуді табу" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="grade" className="label">Сынып</label>
            <select id="grade" name="grade" className="field px-3" defaultValue={v.grade || "7"}>
              {[5, 6, 7, 8, 9, 10, 11].map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="level" className="label">Деңгей</label>
            <select id="level" name="level" className="field px-3" defaultValue={v.level || "B"}>
              <option>A</option><option>B</option><option>C</option>
            </select>
          </div>
          <div>
            <label htmlFor="count" className="label">Саны</label>
            <input id="count" name="count" type="number" min={1} max={10} defaultValue={v.count || 5} className="field px-3" />
          </div>
        </div>
        <p role="alert" aria-live="polite" className="text-sm font-bold text-red-ink">{state?.error}</p>
        <button className="btn-primary h-14 px-8" disabled={pending}>
          {pending ? "ЖИ тапсырма жасап жатыр…" : "Тапсырма жасау"}
        </button>
      </section>
    </form>
  );
}
