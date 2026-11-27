import { Ornament } from "./Ornament";
import { SplitText } from "./SplitText";
import { Blobs } from "./Blobs";

export type HeadQuote = { lines: string[]; by: string };

/**
 * Page header: the page name, one line on what it is for, and either a short verified quote
 * or a few live counts. Quotes come from src/lib/quotes.ts only — never type one from memory.
 */
export function PageHead({ title, sub, quote, stats, children }: { title: string; sub: string; quote?: HeadQuote; stats?: [string, number][]; children?: React.ReactNode }) {
  return (
    <header className="relative overflow-hidden rounded-[32px] hero-bg px-6 pb-12 pt-7 text-white sm:px-10">
      <Blobs />
      <div className="relative z-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold leading-[1.1] sm:text-4xl">
            <SplitText text={title} />
          </h1>
          <p className="mt-3 text-white/90">{sub}</p>
          {stats && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {stats.map(([label, n]) => (
                <li key={label} className="tag bg-white/15 px-4 py-2 text-sm text-white">
                  {label}: <b className="num ml-1 text-base">{n}</b>
                </li>
              ))}
            </ul>
          )}
        </div>
        {quote && (
          <figure className="max-w-md border-l-4 border-gold pl-4">
            <blockquote className="text-base font-bold leading-snug sm:text-lg">
              {quote.lines.map((l, i) => (
                <span key={i} className="word block" style={{ "--i": 3 + i * 2 } as React.CSSProperties}>{l}</span>
              ))}
            </blockquote>
            <figcaption className="mt-2 text-sm text-white/90">{quote.by}</figcaption>
          </figure>
        )}
        {children}
      </div>
      <Ornament className="absolute inset-x-0 bottom-0" />
    </header>
  );
}
