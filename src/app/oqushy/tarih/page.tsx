import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { ERAS, HISTORY_SOURCES } from "@/lib/history";
import { PageHead } from "@/components/PageHead";
import { Glossed } from "@/components/Glossed";

export const metadata = { title: "Әдебиет тарихы" };

export default async function History() {
  await requireRole("student");
  const works = await sql<{ slug: string; title: string }[]>`select slug, title from works`;
  const titles = Object.fromEntries(works.map((w) => [w.slug, w.title]));
  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Әдебиет тарихы" sub="Көне жазбалардан бүгінге дейін: дәуір сайын кім жазды, кітапханадағы қай шығарма сол кезеңнен." />
      <nav aria-label="Дәуірлер" className="card flex gap-2 overflow-x-auto p-3">
        {ERAS.map((e, i) => (
          <a key={e.id} href={`#${e.id}`} className="tag shrink-0 bg-soft px-4 py-2 hover:bg-accent-soft">
            <span className="num text-primary">{i + 1}</span> {e.title}
          </a>
        ))}
      </nav>
      <ol className="relative flex flex-col gap-5 border-l-4 border-accent-soft pl-6 sm:pl-8">
        {ERAS.map((e, i) => (
          <li key={e.id} id={e.id} className="relative scroll-mt-6">
            <span className="num absolute -left-[42px] top-5 grid size-9 place-items-center rounded-full bg-primary font-bold text-on-color sm:-left-[50px]" aria-hidden="true">
              {i + 1}
            </span>
            <article className="card">
              <p className="tag bg-gold-soft">{e.when}</p>
              <h2 className="mt-2 text-xl font-bold">{e.title}</h2>
              <p className="mt-2 leading-relaxed">
                <Glossed text={e.text} />
              </p>
              {e.names.length > 0 && <p className="mt-3 text-sm text-muted">Есімдер: {e.names.join(", ")}</p>}
              {e.works.some((s) => titles[s]) && (
                <details className="mt-3">
                  <summary className="cursor-pointer font-bold text-primary">Кітапханадағы шығармалар ({e.works.filter((s) => titles[s]).length})</summary>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {e.works.filter((s) => titles[s]).map((s) => (
                      <li key={s}>
                        <Link href={`/oqushy/shygarmalar/${s}`} className="tag bg-soft px-3 py-2 hover:bg-accent-soft">«{titles[s]}»</Link>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </article>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted">Даталар мына дереккөздермен тексерілді: {HISTORY_SOURCES.join(" · ")}. Тарихшылар келіспейтін жерде кезең ғана көрсетілді.</p>
    </div>
  );
}
