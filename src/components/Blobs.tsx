/**
 * Soft liquid shapes behind a hero's text. Pure CSS: each blob only rotates (and one breathes),
 * which the compositor handles without repainting. Colours stay dark enough for white text.
 */
export function Blobs({ big = false }: { big?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <span className="blob breathe -right-16 -top-20 size-72 bg-blob-a sm:size-96" style={{ "--t": "26s" } as React.CSSProperties} />
      <span className="blob -bottom-24 right-1/4 size-56 bg-blob-b/80" style={{ "--t": "19s" } as React.CSSProperties} />
      {big && <span className="blob breathe left-1/3 -top-28 size-48 bg-blob-c" style={{ "--t": "31s" } as React.CSSProperties} />}
      {big && (
        <svg className="absolute right-[8%] top-[18%] hidden w-16 text-gold sm:block" viewBox="0 0 40 40" fill="currentColor">
          <path className="blob-star" d="M20 2l4.6 11.6L37 15l-9.6 8 3 12.4L20 28.8 9.6 35.4l3-12.4L3 15l12.4-1.4z" />
        </svg>
      )}
    </div>
  );
}
