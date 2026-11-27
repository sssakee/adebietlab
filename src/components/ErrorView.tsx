"use client";
import { useEffect } from "react";
import { RotateCw } from "lucide-react";
import { Mascot } from "./Mascot";

// A tab left open across a deploy still runs the old code, whose chunks and action ids the new
// server no longer has. Only a full reload brings the new code; retry() would fail the same way.
const stale = (e: unknown) => e instanceof Error && (e.name === "ChunkLoadError" || e.name === "UnrecognizedActionError");
const reload = () => location.reload();

/** A page that failed to load (lost connection, a query that timed out): say so and offer a retry. */
export default function ErrorView({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
    if (!stale(error)) return;
    try {
      // Reload by itself once; if that was a moment ago and it failed again, show the page instead of looping.
      if (Date.now() - Number(sessionStorage.getItem("al_reload")) < 10_000) return;
      sessionStorage.setItem("al_reload", String(Date.now()));
    } catch {
      return;
    }
    reload();
  }, [error]);
  return (
    <div className="card flex flex-col items-center gap-4 p-8 text-center" role="alert">
      <Mascot size={96} alt="" />
      <h1 className="text-2xl font-bold">Бет ашылмай қалды</h1>
      <p className="max-w-md text-muted">Байланыс үзіліп кеткен болуы мүмкін. Тағы бір рет көрейік.</p>
      <button type="button" onClick={stale(error) ? reload : retry} className="btn-primary h-14 px-8">
        <RotateCw className="size-5" aria-hidden="true" /> Қайта көру
      </button>
    </div>
  );
}
