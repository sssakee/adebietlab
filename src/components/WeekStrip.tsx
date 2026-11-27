import { Check } from "lucide-react";

const WEEKDAY = ["Жс", "Дс", "Сс", "Ср", "Бс", "Жм", "Сн"]; // Sunday first, like Date.getUTCDay()
const FULL = ["жексенбі", "дүйсенбі", "сейсенбі", "сәрсенбі", "бейсенбі", "жұма", "сенбі"];

/** Seven days with a mark on each day the student did something. */
export function WeekStrip({ days, done, today }: { days: string[]; done: Set<string>; today: string }) {
  return (
    <ol className="grid grid-cols-7 gap-1.5">
      {days.map((d) => {
        const wd = new Date(d).getUTCDay();
        const ok = done.has(d);
        return (
          <li key={d} className="flex flex-col items-center gap-1" aria-label={`${FULL[wd]}: ${ok ? "белсенді" : "бос"}`} aria-current={d === today ? "date" : undefined}>
            <span className={`grid size-10 place-items-center rounded-full ${ok ? "bg-red text-on-color" : d === today ? "border-2 border-dashed border-muted-line" : "bg-soft"}`} aria-hidden="true">
              {ok && <Check className="size-5" />}
            </span>
            <span className={`text-xs font-bold ${d === today ? "text-ink" : "text-muted"}`} aria-hidden="true">{WEEKDAY[wd]}</span>
          </li>
        );
      })}
    </ol>
  );
}
