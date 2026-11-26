import { Muiz } from "./Ornament";

// Verified against the published text of Abai's poem; do not edit from memory.
export function Quote({ className = "" }: { className?: string }) {
  return (
    <figure className={`relative overflow-hidden rounded-[var(--radius-card)] bg-gold-soft p-6 ${className}`}>
      <Muiz className="absolute -right-2 -top-1 w-24 text-gold/40" />
      <blockquote className="relative text-xl font-bold leading-snug sm:text-2xl">
        Ғылым таппай мақтанба,
        <br />
        Орын таппай баптанба.
      </blockquote>
      <figcaption className="relative mt-3 text-sm font-bold text-muted">Абай Құнанбайұлы, «Ғылым таппай мақтанба»</figcaption>
    </figure>
  );
}
