import Link from "next/link";
import { ArrowRight, Check, Crown, Flame, Zap } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { DAILY } from "@/lib/quiz";
import { activeDays, dayBefore, quizWorks, streak, today, weeklyRating } from "@/lib/queries";
import { PageHead } from "@/components/PageHead";
import { WeekStrip } from "@/components/WeekStrip";

export const metadata = { title: "Бәйге" };

export default async function Baige() {
  const u = await requireRole("student");
  const [works, d, days, n, rating, results] = await Promise.all([
    quizWorks(),
    today(),
    activeDays(u.id),
    streak(u.id),
    weeklyRating(u.class_id),
    sql<{ quiz: string; best: number; total: number }[]>`select quiz, best, total from quiz_results where student_id = ${u.id}`,
  ]);
  const best = new Map(results.map((r) => [r.quiz, r]));
  const daily = best.get(`${DAILY}:${d}`);
  const me = rating.find((r) => r.id === u.id);
  const top = rating.slice(0, 10);
  const mine = works.filter((w) => u.grade === null || w.grades.includes(u.grade));
  const rest = works.filter((w) => !mine.includes(w));

  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Бәйге" sub="Күн сайынғы викторина, жұмыс тізбегі және сыныптағы апталық рейтинг." />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card flex flex-col gap-4 bg-gold-soft" aria-labelledby="daily">
          <div className="flex items-center gap-3">
            <span className="grid size-14 place-items-center rounded-2xl bg-gold text-on-gold tile" aria-hidden="true"><Zap className="size-7" /></span>
            <div>
              <h2 id="daily" className="text-xl font-bold">Бүгінгі викторина</h2>
              <p className="text-sm text-muted">5 сұрақ · әр дұрыс жауапқа 1 жұлдыз</p>
            </div>
          </div>
          <p className="font-medium">
            {daily ? `Бүгін өттің: ${daily.best} / ${daily.total}. Нәтижеңді жақсартуға болады.` : "Сыныбыңдағы шығармалар бойынша жылдам сұрақтар. Ертең жаңасы шығады."}
          </p>
          <Link href={`/oqushy/baige/${DAILY}`} data-nav="forward" className="btn-primary h-14 self-start px-8">
            {daily ? "Қайта өту" : "Бастау"} <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
        </section>

        <section className="card flex flex-col gap-4" aria-labelledby="streak">
          <div className="flex items-center gap-3">
            <span className="grid size-14 place-items-center rounded-2xl bg-red text-on-color tile" aria-hidden="true"><Flame className="size-7" /></span>
            <div>
              <h2 id="streak" className="text-xl font-bold">Тізбек: <span className="num">{n}</span> күн</h2>
              <p className="text-sm text-muted">Күн сайын бір ғана әрекет жасасаң, тізбек үзілмейді.</p>
            </div>
          </div>
          <WeekStrip days={[6, 5, 4, 3, 2, 1, 0].map((k) => dayBefore(d, k))} done={days.days} today={d} />
          <p className="text-sm font-medium text-muted">
            {days.days.has(d) ? "Бүгінгі күн есептелді. Ертең де кел!" : n ? "Бүгін әлі ештеңе жасамадың: тізбекті сақтау үшін викторинадан өт." : "Бүгін бастасаң, тізбек басталады."}
          </p>
        </section>
      </div>

      <section className="card" aria-labelledby="rating">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="rating" className="text-xl font-bold">Апталық рейтинг</h2>
          <p className="text-sm text-muted">{u.class_name ? `${u.class_name} сынып · ` : ""}дүйсенбіден бергі жұлдыздар</p>
        </div>
        {rating.length ? (
          <ol className="flex flex-col gap-2">
            {[...top, ...(me && !top.includes(me) ? [me] : [])].map((r) => (
              <li key={r.id} className={`flex items-center gap-4 rounded-2xl px-4 py-3 ${r.id === u.id ? "bg-accent-soft" : "bg-soft"}`} aria-current={r.id === u.id ? "true" : undefined}>
                <span className={`num grid size-10 shrink-0 place-items-center rounded-full font-bold ${r.place === 1 && r.pts ? "bg-gold text-on-gold" : "bg-surface"}`}>
                  {r.place === 1 && r.pts ? <Crown className="size-5" aria-label="1" /> : r.place}
                </span>
                <span className="min-w-0 flex-1 truncate font-bold">{r.full_name}{r.id === u.id && " (сен)"}</span>
                <span className="num font-bold">{r.pts}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-muted">Сыныпқа қосылғаннан кейін рейтинг осында шығады.</p>
        )}
        <p className="mt-3 text-xs text-muted">Жұлдыз зертхана құралдарынан, тапсырмадан, викторинадан және жаттаудан жиналады. Рейтинг әр дүйсенбі нөлден басталады.</p>
      </section>

      <section aria-labelledby="by-work">
        <h2 id="by-work" className="mb-4 text-2xl font-bold">Шығарма бойынша викторина</h2>
        <QuizList works={mine} best={best} />
        {rest.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer font-bold text-primary">Басқа сыныптардың шығармалары ({rest.length})</summary>
            <div className="mt-4"><QuizList works={rest} best={best} /></div>
          </details>
        )}
      </section>
    </div>
  );
}

function QuizList({ works, best }: { works: { slug: string; title: string; author: string }[]; best: Map<string, { best: number; total: number }> }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {works.map((w) => {
        const b = best.get(w.slug);
        return (
          <li key={w.slug}>
            <Link href={`/oqushy/baige/${w.slug}`} data-nav="forward" className="card flex h-full items-center gap-3 p-4">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">«{w.title}»</span>
                <span className="block truncate text-sm text-muted">{w.author}</span>
              </span>
              {b ? (
                <span className={`tag shrink-0 ${b.best === b.total ? "bg-green-soft text-green-ink" : "bg-soft"}`}>
                  {b.best === b.total && <Check className="size-4" aria-hidden="true" />}
                  <span className="num">{b.best}/{b.total}</span>
                </span>
              ) : (
                <ArrowRight className="size-5 shrink-0 text-muted" aria-hidden="true" />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
