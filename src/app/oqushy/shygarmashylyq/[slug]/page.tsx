import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getWork } from "@/lib/queries";
import { CHARACTERS } from "@/lib/characters";
import { CRITERIA, KIND, type CreativeKind } from "@/lib/creative";
import type { CreativeFeedback } from "@/lib/ai/schemas";
import { CreativeForm } from "@/components/CreativeForm";
import { Glossed } from "@/components/Glossed";
import { SplitText } from "@/components/SplitText";

export async function generateMetadata({ params }: PageProps<"/oqushy/shygarmashylyq/[slug]">) {
  const w = await getWork((await params).slug);
  return { title: w ? `Шығармашылық зертхана: «${w.title}»` : "Табылмады" };
}

type Saved = { kind: CreativeKind; data: { text: string; to?: string }; result: { ai?: CreativeFeedback }; teacher_scores: number[] | null };

export default async function Creative({ params }: PageProps<"/oqushy/shygarmashylyq/[slug]">) {
  const u = await requireRole("student");
  const { slug } = await params;
  const w = await getWork(slug);
  const cast = CHARACTERS[slug];
  if (!w || !cast) notFound();
  const rows = await sql<Saved[]>`select kind, data, result, teacher_scores from lab_works where student_id = ${u.id} and work_id = ${w.id} and kind in ('soni', 'hat')`;
  const mine = (k: CreativeKind) => rows.find((r) => r.kind === k);

  return (
    <div className="flex flex-col gap-6">
      <header className="card flex items-center gap-4 py-4">
        <Link href="/oqushy/shygarmashylyq" data-nav="back" className="grid size-12 shrink-0 place-items-center rounded-2xl bg-soft hover:bg-accent-soft" aria-label="Шығармашылық зертханаға қайту">
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <div className="min-w-0">
          <p className="text-xs font-bold text-muted">Шығармашылық зертхана · {w.author}</p>
          <h1 className="text-2xl font-bold">
            <SplitText text={`«${w.title}»`} />
          </h1>
        </div>
      </header>

      {w.summary && (
        <section className="card" aria-labelledby="recall">
          <h2 id="recall" className="mb-2 text-lg font-bold">Оқиғаны еске түсір</h2>
          <p className="leading-relaxed">
            <Glossed text={w.summary} />
          </p>
          <p className="mt-2 text-sm text-muted">Кейіпкерлер: {cast.map((c) => c.name).join(", ")}</p>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {(["soni", "hat"] as const).map((k) => {
          const m = mine(k);
          return (
            <section key={k} id={k} className="card scroll-mt-6" aria-labelledby={`${k}-h`}>
              <h2 id={`${k}-h`} className="text-xl font-bold">{KIND[k].title}</h2>
              <p className="mb-4 mt-1 text-muted">{KIND[k].task}</p>
              <CreativeForm slug={slug} kind={k} cast={cast.map((c) => c.name)} saved={{ text: m?.data.text ?? "", to: m?.data.to }} canAsk={!!m && !m.result.ai} />
              {m?.result.ai && (
                <div className="mt-4 rounded-2xl bg-violet-faint p-4">
                  <p className="tag bg-violet-soft">ЖИ пікірі · ұсыныс</p>
                  <ul className="mt-3 flex flex-col gap-1 text-sm">
                    {CRITERIA[k].map((c, i) => (
                      <li key={c} className="flex justify-between gap-3">
                        <span>{c}</span> <b className="num">{m.result.ai!.scores[i]} / 2</b>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3">{m.result.ai.comment}</p>
                  {m.result.ai.tip && <p className="mt-2 text-sm"><b>Кеңес:</b> {m.result.ai.tip}</p>}
                </div>
              )}
              {m && (
                <div className="mt-4 rounded-2xl bg-soft p-4">
                  {m.teacher_scores ? (
                    <>
                      <p className="font-bold">Мұғалім бағасы: <span className="num">{m.teacher_scores.reduce((a, b) => a + b, 0)} / 6</span></p>
                      <ul className="mt-2 flex flex-col gap-1 text-sm">
                        {CRITERIA[k].map((c, i) => (
                          <li key={c} className="flex justify-between gap-3"><span>{c}</span> <b className="num">{m.teacher_scores![i]} / 2</b></li>
                        ))}
                      </ul>
                      <p className="mt-2 text-xs text-muted">Жұмысты өзгертсең, мұғалім қайта бағалайды.</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted">Мұғалім әлі бағалаған жоқ. Жұмысың оның бетінде тұр.</p>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
