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
      <button className="btn-primary h-12" disabled={pending}>Сынып ашу</button>
      {state?.error && <p role="alert" className="text-sm font-bold text-red-ink sm:col-span-3">{state.error}</p>}
    </form>
  );
}
