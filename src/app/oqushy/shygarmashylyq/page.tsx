import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { CHARACTERS } from "@/lib/characters";
import { KIND, type CreativeKind } from "@/lib/creative";
import { PageHead } from "@/components/PageHead";

export const metadata = { title: "Шығармашылық зертхана" };

export default async function CreativeLab() {
  const u = await requireRole("student");
  const [works, mine] = await Promise.all([
    sql<{ slug: string; title: string; author: string; grades: number[] }[]>`select slug, title, author, grades from works where slug in ${sql(Object.keys(CHARACTERS))} order by title`,
    sql<{ slug: string; title: string; kind: CreativeKind; graded: number | null; ai: boolean }[]>`
      select w.slug, w.title, l.kind, (select sum(x) from unnest(l.teacher_scores) x)::int as graded, l.result ? 'ai' as ai
      from lab_works l join works w on w.id = l.work_id
      where l.student_id = ${u.id} and l.kind in ('soni', 'hat') order by l.updated_at desc`,
  ]);
  const own = (g: number[]) => u.grade !== null && g.includes(u.grade);
  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Шығармашылық зертхана" sub="Шығарманың соңын өзгертіп жаз немесе кейіпкерге хат жаз. Жұмысыңды ЖИ оқып пікір береді, бағаны мұғалім қояды." />
      {mine.length > 0 && (
        <section aria-labelledby="mine">
          <h2 id="mine" className="mb-4 text-2xl font-bold">Менің жұмыстарым</h2>
          <ul className="card py-2 [&>li+li]:border-t-2 [&>li+li]:border-line">
            {mine.map((m) => (
              <li key={m.slug + m.kind}>
                <Link href={`/oqushy/shygarmashylyq/${m.slug}#${m.kind}`} className="flex flex-wrap items-center justify-between gap-3 py-4 hover:text-primary">
                  <span><b>«{m.title}»</b> · {KIND[m.kind].title}</span>
                  <span className={`tag ${m.graded !== null ? "bg-green-soft text-green-ink" : "bg-gold-soft"}`}>{m.graded !== null ? `Мұғалім: ${m.graded} / 6` : m.ai ? "ЖИ пікірі бар · бағалануда" : "Бағалануда"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section aria-labelledby="pick">
        <h2 id="pick" className="mb-4 text-2xl font-bold">Шығарма таңда</h2>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...works].sort((a, b) => Number(own(b.grades)) - Number(own(a.grades))).map((w) => (
            <li key={w.slug}>
              <Link href={`/oqushy/shygarmashylyq/${w.slug}`} data-nav="forward" className="card block h-full">
                <span className="text-sm font-bold text-muted">{w.author}{own(w.grades) && " · сенің сыныбың"}</span>
                <span className="mt-1 block text-lg font-bold">«{w.title}»</span>
                <span className="mt-2 block text-sm text-muted">{CHARACTERS[w.slug].map((c) => c.name).join(", ")}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
