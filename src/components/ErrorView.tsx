"use client";
import { useEffect } from "react";
import { RotateCw } from "lucide-react";
import { Mascot } from "./Mascot";

/** A page that failed to load (lost connection, a query that timed out): say so and offer a retry. */
export default function ErrorView({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="card flex flex-col items-center gap-4 p-8 text-center" role="alert">
      <Mascot size={96} alt="" />
      <h1 className="text-2xl font-bold">Бет ашылмай қалды</h1>
      <p className="max-w-md text-muted">Байланыс үзіліп кеткен болуы мүмкін. Тағы бір рет көрейік.</p>
      <button type="button" onClick={retry} className="btn-primary h-14 px-8">
        <RotateCw className="size-5" aria-hidden="true" /> Қайта көру
      </button>
    </div>
  );
}
