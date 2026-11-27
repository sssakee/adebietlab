import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { sql } from "@/lib/db";
import type { Plan } from "@/lib/reading-plan";
import { makePlan } from "@/app/oqushy/plan-actions";
import { Submit } from "./Submit";

/** Home card: the student's next works, chosen from their weak spots. */
export async function ReadingPlan({ studentId }: { studentId: string }) {
  const [row] = await sql<{ plan: Plan; today: boolean; day: string }[]>`
    select plan, created_at::date = current_date as today, to_char(created_at, 'DD.MM.YYYY') as day
    from reading_plans where student_id = ${studentId}`;
  const plan = row?.plan;
  return (
    <section className="card" aria-labelledby="plan">
      <h2 id="plan" className="mb-1 flex items-center gap-2 text-xl font-bold">
        <Compass className="size-5 text-primary" aria-hidden="true" /> Жеке оқу жоспары
      </h2>
      {plan ? (
        <>
          <p className="mb-4 text-xs text-muted">
            {row.day} · {plan.ai ? "ЖИ нәтижеңе қарап таңдады" : "нәтижеңе қарап ережемен таңдалды"}
          </p>
          {plan.weak.length > 0 && <p className="mb-3 text-sm"><b>Жаттығатын тұсың:</b> {plan.weak.join(", ").toLocaleLowerCase("kk")}</p>}
          {plan.picks.length ? (
            <ol className="flex flex-col gap-3">
              {plan.picks.map((p) => (
                <li key={p.slug} className="rounded-2xl bg-soft p-4">
                  <Link href={`/oqushy/shygarmalar/${p.slug}`} className="font-bold hover:text-primary">«{p.title}»</Link>
                  <p className="mt-1 text-sm">{p.why}</p>
                  <Link href={p.href} className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-primary">
                    {p.step} <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">Сыныбыңдағы шығармалардың бәрін ашыпсың! Кітапханадан келесісін өзің таңда.</p>
          )}
          {plan.note && <p className="mt-3 text-sm text-muted">{plan.note}</p>}
        </>
      ) : (
        <p className="mb-4 mt-2 text-sm text-muted">Нәтижеңе қарап, келесі оқитын шығармаларыңды және неден бастауды ұсынамын.</p>
      )}
      {!row?.today && (
        <form action={makePlan} className="mt-4">
          <Submit className="btn-primary w-full">{plan ? "Жоспарды жаңарту" : "Жоспар құру"}</Submit>
        </form>
      )}
      {row?.today && <p className="mt-3 text-xs text-muted">Жоспар күніне бір рет жаңарады.</p>}
    </section>
  );
}
