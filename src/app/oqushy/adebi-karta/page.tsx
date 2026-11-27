import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { ABROAD, PINS } from "@/lib/literary-map";
import { PageHead } from "@/components/PageHead";
import { LitMap } from "@/components/LitMap";

export const metadata = { title: "Әдеби карта" };

export default async function LiteraryMap() {
  await requireRole("student");
  const works = await sql<{ slug: string; title: string }[]>`select slug, title from works`;
  const titles = Object.fromEntries(works.map((w) => [w.slug, w.title]));
  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Әдеби карта" sub="Кітапханадағы ақын-жазушылар қай жерде туған, жырлардың ескерткіштері қайда тұр." />
      <LitMap pins={PINS} titles={titles} />
      <section className="card" aria-labelledby="abroad">
        <h2 id="abroad" className="text-xl font-bold">Қазақстаннан тыс туғандар</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {ABROAD.map((a) => (
            <li key={a.name}>
              <b>{a.name}</b> ({a.years}) — {a.place}.{" "}
              {a.works.filter((s) => titles[s]).map((s) => (
                <Link key={s} href={`/oqushy/shygarmalar/${s}`} className="font-bold text-primary underline">«{titles[s]}»</Link>
              ))}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted">Шекара: Natural Earth (қоғамдық игілік). Туған жерлер e-history.kz, adebiportal.kz және энциклопедиялық дереккөздерден тексерілді; әр адамның дереккөзі жанында жазулы.</p>
      </section>
    </div>
  );
}
