import Link from "next/link";
import { ViewTransition } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, AudioLines, GitBranch, Info, TrendingUp, Waypoints } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getWork, toolHref } from "@/lib/queries";

export async function generateMetadata({ params }: PageProps<"/oqushy/shygarmalar/[slug]">) {
  const w = await getWork((await params).slug);
  return { title: w ? `«${w.title}»` : "Табылмады" };
}

export default async function WorkPage({ params }: PageProps<"/oqushy/shygarmalar/[slug]">) {
  await requireRole("student");
  const w = await getWork((await params).slug);
  if (!w) notFound();
  const tools = [
    w.lab.poem && { tool: "olen", label: "Өлең өлшегіш", icon: AudioLines, color: "bg-primary" },
    w.lab.characters && { tool: "char_map", label: "Кейіпкер картасы", icon: Waypoints, color: "bg-violet" },
    w.lab.egerde && { tool: "egerde", label: "«Егер...» тәжірибесі", icon: GitBranch, color: "bg-red" },
    w.lab.timeline && { tool: "zheli", label: "Оқиға желісі", icon: TrendingUp, color: "bg-green-ink" },
  ].filter(Boolean) as { tool: string; label: string; icon: typeof Info; color: string }[];

  return (
    <div className="flex flex-col gap-6">
      <header className="card flex items-center gap-4 py-4">
        <Link href="/oqushy/shygarmalar" transitionTypes={["nav-back"]} className="grid size-12 shrink-0 place-items-center rounded-2xl bg-soft hover:bg-accent-soft" aria-label="Кітапханаға қайту">
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <div>
          <p className="text-xs font-bold text-muted">{w.genre}{w.grades.length > 0 && ` · ${w.grades.join(", ")}-сынып`}</p>
          <ViewTransition name={`work-${w.slug}`} share="morph" default="none">
            <h1 className="w-fit text-2xl font-bold">«{w.title}»</h1>
          </ViewTransition>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <section className="card" aria-labelledby="about">
            <h2 id="about" className="mb-3 text-xl font-bold">Шығарма туралы</h2>
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[140px_1fr]">
              <dt className="font-bold text-muted">Авторы</dt>
              <dd>{w.author}{w.author_years && ` (${w.author_years})`}</dd>
              <dt className="font-bold text-muted">Жанры</dt>
              <dd>{w.genre}</dd>
            </dl>
            {w.summary && <p className="mt-4">{w.summary}</p>}
          </section>

          <section className="card" aria-labelledby="text">
            <h2 id="text" className="mb-3 text-xl font-bold">Мәтін</h2>
            {w.text ? (
              <>
                <p className="whitespace-pre-line text-lg leading-relaxed">{w.text}</p>
                {w.text_source && <p className="mt-4 text-sm text-muted">Дереккөзі: {w.text_source}</p>}
              </>
            ) : (
              <p className="flex gap-2 rounded-2xl bg-soft p-4 text-muted">
                <Info className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                {w.is_public_domain
                  ? "Мәтін әлі қосылмаған. Оны мұғалім сенімді басылымнан қосады."
                  : "Шығарма авторлық құқықпен қорғалған, сондықтан толық мәтін берілмейді. Мұғалім сабаққа үзінді жүктей алады."}
              </p>
            )}
          </section>
        </div>

        <aside className="card h-fit" aria-labelledby="lab">
          <h2 id="lab" className="mb-4 text-xl font-bold">Зертхана</h2>
          {tools.length ? (
            <ul className="flex flex-col gap-3">
              {tools.map((t) => (
                <li key={t.tool}>
                  <Link href={toolHref(w.slug, t.tool)} transitionTypes={["nav-forward"]} className="group flex min-h-14 items-center gap-3 rounded-2xl bg-soft p-3 font-bold transition-[background-color,translate] hover:translate-x-1 hover:bg-accent-soft">
                    <span className={`grid size-10 place-items-center tile rounded-xl text-on-color ${t.color}`} aria-hidden="true">
                      <t.icon className="size-5" />
                    </span>
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">Бұл шығармаға зертхана құралдары әлі дайындалмаған.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
