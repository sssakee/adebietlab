"use client";
import { useActionState } from "react";
import { createClass } from "../actions";

export function NewClassForm() {
  const [state, action, pending] = useActionState(createClass, undefined);
  return (
    <form action={action} className="card grid items-end gap-4 sm:grid-cols-[1fr_160px_auto]">
      <div>
        <label htmlFor="cn" className="label">Жаңа сынып атауы</label>
        <input id="cn" name="name" required maxLength={40} placeholder="7 «Ә»" className="field" />
      </div>
      <div>
        <label htmlFor="cg" className="label">Сынып</label>
        <select id="cg" name="grade" className="field" defaultValue="7">
          {[5, 6, 7, 8, 9, 10, 11].map((g) => <option key={g} value={g}>{g}-сынып</option>)}
        </select>
      </div>
      <button className="btn-primary h-14 px-8" disabled={pending}>Сынып ашу</button>
      <p role="status" aria-live="polite" className={`text-sm font-bold sm:col-span-3 ${state?.error ? "text-red-ink" : "text-green-ink"}`}>
        {state?.error || (state && "ok" in state && `✓ ${state.ok}`)}
      </p>
    </form>
  );
}
