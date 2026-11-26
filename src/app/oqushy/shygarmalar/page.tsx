import Link from "next/link";
import { BookOpen, Search } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import type { Work } from "@/lib/queries";
import { PageHead } from "@/components/PageHead";

export const metadata = { title: "Шығармалар" };

export default async function Library({ searchParams }: PageProps<"/oqushy/shygarmalar">) {
  await requireRole("student");
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const q = one(sp.q).trim();
  const grade = Number(one(sp.grade)) || null;
  const genre = one(sp.genre);

  const [works, genres] = await Promise.all([
    sql<Work[]>`select * from works
      where (${q} = '' or title ilike ${"%" + q + "%"} or author ilike ${"%" + q + "%"} or genre ilike ${"%" + q + "%"})
        and (${grade}::int is null or ${grade}::int = any(grades))
        and (${genre} = '' or genre = ${genre})
      order by author, title`,
    sql<{ genre: string }[]>`select distinct genre from works order by genre`,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHead lines={["Оқы.", "Таны.", "Талда."]} sub="5–11 сыныпта оқылатын шығармалар." />
      <section className="card" aria-label="Іздеу және сүзгі">
        <form className="grid gap-3 md:grid-cols-[1fr_160px_220px_auto]" role="search">
          <div className="relative">
            <label htmlFor="lq" className="sr-only">Іздеу</label>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input id="lq" name="q" defaultValue={q} placeholder="Атауы, авторы, жанры…" className="field pl-11" />
          </div>
          <div>
            <label htmlFor="lg" className="sr-only">Сынып</label>
            <select id="lg" name="grade" defaultValue={grade ?? ""} className="field">
              <option value="">Барлық сынып</option>
              {[5, 6, 7, 8, 9, 10, 11].map((g) => (
                <option key={g} value={g}>{g}-сынып</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="lgn" className="sr-only">Жанр</label>
            <select id="lgn" name="genre" defaultValue={genre} className="field">
              <option value="">Барлық жанр</option>
              {genres.map((g) => (
                <option key={g.genre}>{g.genre}</option>
              ))}
            </select>
          </div>
          <button className="btn-primary">Сүзу</button>
        </form>
      </section>

      {works.length ? (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {works.map((w) => (
            <li key={w.id}>
              <Link href={`/oqushy/shygarmalar/${w.slug}`} className="card flex h-full gap-4 p-5 transition-transform hover:-translate-y-0.5">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#e4efff] text-primary" aria-hidden="true">
                  <BookOpen className="size-7" />
                </span>
                <span className="min-w-0">
                  <span className="block text-lg font-bold">«{w.title}»</span>
                  <span className="block text-sm font-medium text-muted">
                    {w.author}
                    {w.author_years && ` (${w.author_years})`}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    <span className="tag bg-violet-soft text-violet">{w.genre}</span>
                    {w.grades.length > 0 && <span className="tag bg-soft text-muted">{w.grades.join(", ")}-сынып</span>}
                    {Object.keys(w.lab).length > 0 && <span className="tag bg-green-soft text-green-ink">Зертхана бар</span>}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="card text-center text-muted">Ештеңе табылмады. Басқа сөзбен іздеп көр.</p>
      )}
    </div>
  );
}
