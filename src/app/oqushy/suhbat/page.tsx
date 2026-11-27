import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { ABAI, SPEAKERS } from "@/lib/personas";
import { PageHead } from "@/components/PageHead";

export const metadata = { title: "Кейіпкермен сұхбат" };

export default async function Interviews() {
  await requireRole("student");
  const works = await sql<{ slug: string; title: string; grades: number[] }[]>`select slug, title, grades from works`;
  const bySlug = new Map(works.map((w) => [w.slug, w]));
  const groups = Map.groupBy(SPEAKERS.filter((s) => s !== ABAI && bySlug.has(s.works[0])), (s) => s.works[0]);
  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Кейіпкермен сұхбат" sub="Кейіпкерге сұрақ қой: ЖИ оның рөлінде шығарманың мазмұнына сүйеніп жауап береді." />
      <Link href="/oqushy/suhbat/abai" data-nav="forward" className="card flex items-center gap-4 p-5">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-violet text-on-color" aria-hidden="true">
          <MessagesSquare className="size-7" />
        </span>
        <span>
          <span className="block text-lg font-bold">{ABAI.name}</span>
          <span className="block text-sm font-medium text-muted">{ABAI.who}. Өмірі, өлеңдері мен қара сөздері туралы сұра.</span>
        </span>
      </Link>
      <ul className="grid gap-4 lg:grid-cols-2">
        {[...groups].map(([slug, cast]) => (
          <li key={slug} id={slug} className="card scroll-mt-6">
            <h2 className="mb-3 text-lg font-bold">
              «{bySlug.get(slug)!.title}»
              {bySlug.get(slug)!.grades.length > 0 && <span className="ml-2 text-sm font-medium text-muted">{bySlug.get(slug)!.grades.join(", ")}-сынып</span>}
            </h2>
            <ul className="flex flex-col gap-2">
              {cast.map((s) => (
                <li key={s.id}>
                  <Link href={`/oqushy/suhbat/${s.id}`} data-nav="forward" className="block rounded-2xl bg-soft px-4 py-3 hover:bg-accent-soft">
                    <b>{s.name}</b>
                    <span className="block text-sm text-muted">{s.who}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
