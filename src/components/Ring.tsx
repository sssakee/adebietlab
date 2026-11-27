export function Ring({ value, max, label }: { value: number; max: number; label: string }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-28 shrink-0" role="img" aria-label={`Орындалды: ${value} / ${max}`}>
      <svg viewBox="0 0 110 110" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="55" cy="55" r={r} fill="none" stroke="var(--color-accent-soft)" strokeWidth="10" />
        <circle cx="55" cy="55" r={r} fill="none" stroke="var(--color-primary)" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / max)} />
      </svg>
      <span className="absolute inset-0 grid place-content-center text-center">
        <span className="num text-3xl font-bold">
          {value}
          <span className="text-base text-muted">/{max}</span>
        </span>
        <span className="text-xs text-muted">{label}</span>
      </span>
    </div>
  );
}
