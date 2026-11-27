import Link from "next/link";
import { ArrowRight, Flame, Search, Sparkles, Star, Waypoints } from "lucide-react";
import { ToolGrid } from "@/components/ToolGrid";
import { requireRole } from "@/lib/auth";
import { LEVELS, levelFor } from "@/lib/grading";
import { sql } from "@/lib/db";
import { DAILY_GOAL, discoveries, streak, studentAssignments, todayCount } from "@/lib/queries";
import { Mascot } from "@/components/Mascot";
import { Ornament } from "@/components/Ornament";
import { Ring } from "@/components/Ring";
import { Quote } from "@/components/Quote";

export const metadata = { title: "Басты бет" };

export default async function StudentHome() {
  const u = await requireRole("student");
  const [found, days, today, list] = await Promise.all([discoveries(u.id), streak(u.id), todayCount(u.id), studentAssignments(u.id, u.class_id)]);
  const lvl = levelFor(u.points);
  const [map] = await sql<{ title: string; slug: string; found: number; total: number }[]>`
    select w.title, w.slug, (l.result->>'found')::int as found, (l.result->>'total')::int as total
    from lab_works l join works w on w.id = l.work_id
    where l.student_id = ${u.id} and l.kind = 'char_map' order by l.updated_at desc limit 1`;
  const next = list.find((a) => a.status === "new");

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_330px]">
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <form action="/oqushy/shygarmalar" role="search" className="relative w-full sm:w-auto sm:min-w-60 sm:flex-1">
            <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
            <label htmlFor="q" className="sr-only">Іздеу</label>
            <input id="q" name="q" placeholder="Шығарма не ақын іздеу…" className="h-14 w-full rounded-full bg-surface pl-13 pr-5 font-medium shadow-sm placeholder:text-muted focus:outline-none focus-visible:ring-3 focus-visible:ring-primary" />
          </form>
          <span className="flex h-14 items-center gap-2 rounded-full bg-surface px-5 font-bold shadow-sm" title="Қатарынан жұмыс істеген күн">
            <Flame className="size-5 text-red" aria-hidden="true" />
            <span className="num">{days}</span>
            <span className="sr-only">күн қатарынан</span>
          </span>
          <span className="flex h-14 items-center gap-2 rounded-full bg-surface px-5 font-bold shadow-sm">
            <Star className="size-5 fill-gold text-gold" aria-hidden="true" />
            <span className="num">{u.points}</span>
            <span className="text-sm text-muted">ашылым</span>
          </span>
        </div>

        <section className="relative min-h-80 overflow-hidden rounded-[32px] hero-bg px-6 pb-14 pt-8 text-white sm:px-11 sm:pt-10" aria-labelledby="hello">
          <div className="absolute -bottom-24 right-[-10%] h-56 w-[70%] rounded-[50%] bg-navy-deep" aria-hidden="true" />
          <div className="absolute right-[34%] top-14 hidden size-20 rounded-full bg-gold shadow-[0_0_40px_8px_rgb(255_184_0/0.45)] sm:block" aria-hidden="true" />
          <div className="relative z-10 max-w-md">
            <span className="tag bg-white/15 text-white">{u.grade ? `${u.grade}-сынып · ` : ""}Әдебиет</span>
            <h1 id="hello" className="mt-4 text-4xl font-bold sm:text-5xl">
              <span className="word">Сәлем,</span>{" "}
              <span className="word text-gold" style={{ "--i": 1 } as React.CSSProperties}>
                {u.full_name}!
              </span>
            </h1>
            <p className="mt-4 text-lg font-medium text-white/90">Өлеңнің буынын санап, кейіпкерлердің байланысын тауып, жырдың оқиға желісін ретке қой.</p>
            <Link href="/oqushy/zertkhana" className="btn-gold mt-7 h-14 px-8 text-lg">
              Зертханаға кіру <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
          </div>
          <Mascot size={190} priority className="float absolute bottom-3 right-6 hidden drop-shadow-xl sm:block lg:right-16" />
          <Ornament className="absolute inset-x-0 bottom-0 bg-navy-deep" />
        </section>

        <section aria-labelledby="cont">
          <h2 id="cont" className="mb-4 text-2xl font-bold">Зертханалық жұмысты жалғастыру</h2>
          <div className="card flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="grid size-28 shrink-0 place-items-center rounded-3xl bg-violet-soft text-violet" aria-hidden="true">
              <Waypoints className="size-14" strokeWidth={1.6} />
            </span>
            <div className="min-w-0 flex-1">
              <span className="tag bg-violet-soft text-violet">Кейіпкер картасы</span>
              <p className="mt-2 text-xl font-bold">{map ? `«${map.title}»` : "«Қозы Көрпеш – Баян сұлу» жыры"}</p>
              <p className="mt-1 text-sm font-medium text-muted">
                {map ? `Табылған байланыс: ${map.found} / ${map.total}` : "Әлі басталмады — кейіпкерлерді байланыстырып көр"}
              </p>
              <div className="mt-3 h-2.5 rounded-full bg-accent-soft" role="progressbar" aria-label="Табылған байланыстар" aria-valuemin={0} aria-valuemax={map?.total ?? 6} aria-valuenow={map?.found ?? 0}>
                <div className="h-full rounded-full bg-primary" style={{ width: `${map ? (100 * map.found) / map.total : 0}%` }} />
              </div>
            </div>
            <Link href={`/oqushy/zertkhana/karta/${map?.slug ?? "kozy-korpesh"}`} className="btn-primary h-14 px-8">
              {map ? "Жалғастыру" : "Бастау"}
            </Link>
          </div>
        </section>

        <section aria-labelledby="tools">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="tools" className="text-2xl font-bold">Зертхана құралдары</h2>
            <span className="text-sm font-bold text-green-ink">Барлығы ЖИ-сіз жұмыс істейді</span>
          </div>
          <ToolGrid />
        </section>

        <Quote />
      </div>

      <div className="flex flex-col gap-6">
        <section className="card" aria-labelledby="today">
          <h2 id="today" className="mb-4 text-xl font-bold">Бүгінгі зерттеу</h2>
          <div className="flex items-center gap-5">
            <Ring value={Math.min(today, DAILY_GOAL)} max={DAILY_GOAL} label="әрекет" />
            <p className="text-sm font-medium text-muted">
              {today >= DAILY_GOAL ? "Бүгінгі мақсат орындалды! Жарайсың." : next ? `Келесі қадам: ${next.title}.` : "Кез келген зертхана құралын ашып, бір ашылым жаса."}
            </p>
          </div>
        </section>

        <section className="card" aria-labelledby="disc">
          <h2 id="disc" className="mb-4 text-xl font-bold">Менің ашылымдарым</h2>
          {found.length ? (
            <ul className="flex flex-col gap-3">
              {found.map((d, i) => (
                <li key={i} className="rounded-2xl bg-soft p-4">
                  <p className="font-bold">{d.title}</p>
                  <p className="mt-1 text-sm text-muted">
                    {d.tool} · {d.at}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 text-muted">
              <Sparkles className="size-5 text-gold" aria-hidden="true" /> Алғашқы ашылымың алда!
            </p>
          )}
        </section>

        <section className="rounded-[var(--radius-card)] bg-navy p-6 text-white" aria-labelledby="lvl">
          <h2 id="lvl" className="mb-4 text-xl font-bold">Зерттеуші деңгейі</h2>
          <ol className="grid grid-cols-[1fr_1.3fr_1fr] gap-1.5">
            {LEVELS.map((l, i) => (
              <li
                key={l.name}
                aria-current={i === lvl.index ? "step" : undefined}
                className={`rounded-2xl px-1 py-3 text-center text-xs font-bold ${i === lvl.index ? "bg-gold text-on-gold" : i === lvl.index + 1 ? "border-2 border-gold text-gold" : "bg-white/10"}`}
              >
                {l.name}
              </li>
            ))}
          </ol>
          <div className="mt-5 h-2.5 rounded-full bg-white/15">
            <div className="h-full rounded-full bg-gold" style={{ width: `${lvl.progress * 100}%` }} />
          </div>
          <p className="mt-4 text-sm font-medium text-white/90">
            {lvl.next ? `«${lvl.next}» деңгейіне дейін тағы ${lvl.toNext} ашылым жаса.` : "Сен ең жоғары деңгейдесің!"}
          </p>
        </section>
      </div>
    </div>
  );
}
