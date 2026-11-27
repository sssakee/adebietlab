import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getWork } from "@/lib/queries";
import { findSpeaker, STARTERS } from "@/lib/personas";
import { Interview } from "@/components/Interview";
import { SplitText } from "@/components/SplitText";

export async function generateMetadata({ params }: PageProps<"/oqushy/suhbat/[id]">) {
  const s = findSpeaker((await params).id);
  return { title: s ? `${s.name}: сұхбат` : "Табылмады" };
}

export default async function Talk({ params }: PageProps<"/oqushy/suhbat/[id]">) {
  await requireRole("student");
  const s = findSpeaker((await params).id);
  if (!s) notFound();
  const works = (await Promise.all(s.works.map((w) => getWork(w)))).filter((w) => w !== null);
  return (
    <div className="flex flex-col gap-6">
      <header className="card flex items-center gap-4 py-4">
        <Link href="/oqushy/suhbat" data-nav="back" className="grid size-12 shrink-0 place-items-center rounded-2xl bg-soft hover:bg-accent-soft" aria-label="Кейіпкерлер тізіміне қайту">
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <div className="min-w-0">
          <p className="text-xs font-bold text-muted">Сұхбат</p>
          <h1 className="text-2xl font-bold">
            <SplitText text={s.name} />
          </h1>
          <p className="text-sm text-muted">{s.who}</p>
        </div>
      </header>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Interview name={s.name} starters={s.formal ? STARTERS.formal : STARTERS.plain} />
        <aside className="card h-fit" aria-labelledby="based">
          <h2 id="based" className="mb-3 text-lg font-bold">Жауаптар неге сүйенеді</h2>
          <p className="text-sm text-muted">Шығарманың қысқаша мазмұны мен кейіпкер сипаттамасына. Толық мәтінді кітаптан оқы.</p>
          <ul className="mt-3 flex flex-col gap-2">
            {works.map((w) => (
              <li key={w.slug}>
                <Link href={`/oqushy/shygarmalar/${w.slug}`} className="flex items-center gap-2 rounded-2xl bg-soft px-4 py-3 font-bold hover:bg-accent-soft">
                  <BookOpen className="size-4 shrink-0 text-primary" aria-hidden="true" /> «{w.title}»
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
