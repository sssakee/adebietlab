"use client";
import { useState } from "react";

/** File field with Kazakh text: the browser's own button speaks the browser's language ("Choose File"). */
export function FilePick({ id, name, accept, label }: { id: string; name: string; accept: string; label: string }) {
  const [file, setFile] = useState("");
  return (
    <div>
      <span id={`${id}-l`} className="label">{label}</span>
      <label className="field flex cursor-pointer items-center gap-4 focus-within:ring-3 focus-within:ring-primary">
        <input id={id} name={name} type="file" accept={accept} aria-labelledby={`${id}-l`} className="sr-only" onChange={(e) => setFile(e.target.files?.[0]?.name ?? "")} />
        <span className="shrink-0 rounded-full bg-accent-soft px-4 py-2 font-bold text-primary">Файл таңдау</span>
        <span className="min-w-0 truncate text-muted">{file || "Файл таңдалмаған"}</span>
      </label>
    </div>
  );
}
