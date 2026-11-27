import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Info } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getWork } from "@/lib/queries";
import { ToolLinks } from "@/components/ToolLinks";
import { SplitText } from "@/components/SplitText";
import { Glossed } from "@/components/Glossed";
import { glossParts } from "@/lib/glossary";

export async function generateMetadata({ params }: PageProps<"/oqushy/shygarmalar/[slug]">) {
  const w = await getWork((await params).slug);
  return { title: w ? `«${w.title}»` : "Табылмады" };
}

export default async function WorkPage({ params }: PageProps<"/oqushy/shygarmalar/[slug]">) {
  await requireRole("student");
  const w = await getWork((await params).slug);
  if (!w) notFound();
  const glossed = [w.summary, w.text].some((t) => t && glossParts(t).some((p) => typeof p !== "string"));
  const tools = (["olen", "char_map", "egerde", "zheli"] as const).filter((t) => ({ olen: w.lab.poem, char_map: w.lab.characters, egerde: w.lab.egerde, zheli: w.lab.timeline })[t]);

  return (
    <div className="flex flex-col gap-6">
      <header className="card flex items-center gap-4 py-4">
        <Link href="/oqushy/shygarmalar" data-nav="back" className="grid size-12 shrink-0 place-items-center rounded-2xl bg-soft hover:bg-accent-soft" aria-label="Кітапханаға қайту">
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <div>
          <p className="text-xs font-bold text-muted">{w.genre}{w.grades.length > 0 && ` · ${w.grades.join(", ")}-сынып`}</p>
          <h1 className="text-2xl font-bold">
            <SplitText text={`«${w.title}»`} />
          </h1>
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
            {w.summary && (
              <p className="mt-4 leading-relaxed">
                <Glossed text={w.summary} />
              </p>
            )}
            {glossed && (
              <p className="mt-3 text-sm text-muted">
                Астын нүктемен сызған сөзді бас: түсіндірмесі шығады, оны <Link href="/oqushy/sozdik" className="font-bold text-primary underline">сөздігіңе</Link> қосуға болады.
              </p>
            )}
          </section>

          <section className="card" aria-labelledby="text">
            <h2 id="text" className="mb-3 text-xl font-bold">Мәтін</h2>
            {w.text ? (
              <>
                <p className="whitespace-pre-line text-lg leading-relaxed">
                  <Glossed text={w.text} />
                </p>
                {w.text_source && <p className="mt-4 text-sm text-muted">Дереккөзі: {w.text_source}</p>}
              </>
            ) : (
              <p className="flex gap-2 rounded-2xl bg-soft p-4 text-muted">
                <Info className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                {w.is_public_domain
                  ? "Мәтін бұл жерге көшірілмейді: оны сенімді кітапханадан оқисың, ал мұғалім сабаққа үзінді қоса алады."
                  : "Шығарма авторлық құқықпен қорғалған, сондықтан толық мәтін берілмейді. Мұғалім сабаққа үзінді жүктей алады."}
              </p>
            )}
            {w.read_url && (
              <a href={w.read_url} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-4">
                Толық мәтін: {new URL(w.read_url).hostname} <ExternalLink className="size-4" aria-hidden="true" />
                <span className="sr-only">(жаңа бетте ашылады)</span>
              </a>
            )}
          </section>
        </div>

        <aside className="card h-fit" aria-labelledby="lab">
          <h2 id="lab" className="mb-4 text-xl font-bold">Зертхана</h2>
          {tools.length ? (
            <ToolLinks slug={w.slug} tools={tools} />
          ) : (
            <p className="text-muted">Бұл шығармаға зертхана құралдары әлі дайындалмаған.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
