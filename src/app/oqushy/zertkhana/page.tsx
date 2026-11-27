import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import type { WorkLab } from "@/lib/queries";
import { MORE_TOOLS, ToolGrid } from "@/components/ToolGrid";
import { ToolLinks, type Tool } from "@/components/ToolLinks";
import { PageHead } from "@/components/PageHead";
import { QUOTES } from "@/lib/quotes";

export const metadata = { title: "Зертхана құралдары" };

const HAS: [Tool, keyof WorkLab][] = [["olen", "poem"], ["char_map", "characters"], ["egerde", "egerde"], ["zheli", "timeline"]];

export default async function Lab() {
  await requireRole("student");
  const works = await sql<{ slug: string; title: string; author: string; lab: WorkLab }[]>`
    select slug, title, author, lab from works where lab <> '{}' order by title`;
  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Зертхана құралдары" sub="Талдау, жаттау және бөлісу құралдары. Бәрі ЖИ-сіз, ережемен жұмыс істейді." quote={QUOTES.olen} />
      <ToolGrid />
      <section aria-labelledby="more">
        <h2 id="more" className="mb-4 text-2xl font-bold">Жаттау және бөлісу</h2>
        <ToolGrid tools={MORE_TOOLS} />
      </section>
      <section aria-labelledby="by-work">
        <h2 id="by-work" className="mb-4 text-2xl font-bold">Шығарма бойынша</h2>
        <ul className="grid gap-4 lg:grid-cols-2">
          {works.map((w) => (
            <li key={w.slug} className="card">
              <p className="text-sm font-bold text-muted">{w.author}</p>
              <h3 className="mb-4 text-lg font-bold">«{w.title}»</h3>
              <ToolLinks slug={w.slug} tools={HAS.filter(([, k]) => w.lab[k]).map(([t]) => t)} className="grid gap-3 sm:grid-cols-2" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
