export type Bar = { label: string; pct: number; n: number };

/** Horizontal percentage bars; the number is always written, the bar only repeats it. */
export function Bars({ bars, empty }: { bars: Bar[]; empty: string }) {
  if (!bars.length) return <p className="text-muted">{empty}</p>;
  return (
    <ul className="flex flex-col gap-4">
      {bars.map((b) => (
        <li key={b.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate font-bold">{b.label}</span>
            <span className="shrink-0 text-sm text-muted">
              <b className={`num text-base ${b.pct < 50 ? "text-red-ink" : "text-ink"}`}>{b.pct}%</b> · {b.n} оқушы
            </span>
          </div>
          <div className="h-3 rounded-full bg-accent-soft" aria-hidden="true">
            <div className={`h-full rounded-full ${b.pct < 50 ? "bg-red" : b.pct < 75 ? "bg-gold" : "bg-green"}`} style={{ width: `${Math.max(b.pct, 2)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
