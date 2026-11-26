import { Ornament } from "./Ornament";

/** Slogan-style page header: three short sentences, the middle one in gold, one plain line below. */
export function PageHead({ lines, sub, children }: { lines: [string, string, string]; sub: string; children?: React.ReactNode }) {
  return (
    <header className="relative overflow-hidden rounded-[32px] bg-navy px-6 pb-12 pt-7 text-white sm:px-10">
      <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold leading-[1.1] sm:text-4xl">
            {lines[0]} <span className="text-gold">{lines[1]}</span> {lines[2]}
          </h1>
          <p className="mt-3 text-white/85">{sub}</p>
        </div>
        {children}
      </div>
      <Ornament className="absolute inset-x-0 bottom-0" />
    </header>
  );
}
