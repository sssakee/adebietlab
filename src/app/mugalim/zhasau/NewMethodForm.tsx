"use client";
import { useActionState } from "react";
import { createMethod } from "../actions";

export function NewMethodForm() {
  const [state, action, pending] = useActionState(createMethod, undefined);
  const v = (state && "values" in state && state.values) || {};
  return (
    <details className="card">
      <summary className="cursor-pointer text-xl font-bold">+ Өз әдісімді қосу</summary>
      <form action={action} className="mt-5 grid gap-4 md:grid-cols-2" key={state?.ok ? "done" : JSON.stringify(v)}>
        <div>
          <label htmlFor="mn" className="label">Әдіс атауы</label>
          <input id="mn" name="name" defaultValue={v.name} required maxLength={80} className="field" placeholder="Мысалы: Үш сұрақ" />
        </div>
        <div>
          <label htmlFor="md" className="label">Сипаттамасы: оқушы не істейді</label>
          <input id="md" name="description" defaultValue={v.description} required maxLength={300} className="field" placeholder="Мәтін бойынша не, неге, қалай сұрақтарына жауап береді" />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="me" className="label">Бір мысал тапсырма</label>
          <textarea id="me" name="example" defaultValue={v.example} rows={3} maxLength={1000} className="field" placeholder="Кейіпкер не істеді? Неге олай істеді? Сен қалай істер едің?" />
        </div>
        <p role="status" aria-live="polite" className={`text-sm font-bold ${state?.error ? "text-red-ink" : "text-green-ink"}`}>
          {state?.error || (state?.ok && "✓ Әдіс қосылды. Ол жоғарыдағы тізімде тұр.")}
        </p>
        <button className="btn-primary md:justify-self-end" disabled={pending}>Әдісті сақтау</button>
      </form>
    </details>
  );
}
