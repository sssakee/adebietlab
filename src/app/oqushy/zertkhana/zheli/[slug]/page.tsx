import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getWork } from "@/lib/queries";
import { LabHeader } from "../../LabHeader";
import { Timeline } from "@/components/Timeline";

export const metadata = { title: "Оқиға желісі" };

export default async function ZheliPage({ params }: PageProps<"/oqushy/zertkhana/zheli/[slug]">) {
  const u = await requireRole("student");
  const w = await getWork((await params).slug);
  if (!w?.lab.timeline) notFound();
  const [saved] = await sql<{ data: { order: string[]; elements: Record<string, string> } }[]>`
    select data from lab_works where student_id = ${u.id} and work_id = ${w.id} and kind = 'zheli'`;
  // Stable starting shuffle (reversed then interleaved) so the answer is never the starting order.
  const ref = w.lab.timeline;
  const start = saved?.data.order ?? [...ref.filter((_, i) => i % 2 === 1), ...ref.filter((_, i) => i % 2 === 0).reverse()].map((e) => e.id);
  return (
    <div className="flex flex-col gap-6">
      <LabHeader kicker={`Зертхана құралы · Оқиға желісі · ${w.genre}`} title={`«${w.title}»`} back={`/oqushy/shygarmalar/${w.slug}`}>
        <span className="tag gap-1.5 bg-green-soft px-4 py-2 text-sm text-green-ink">
          <Check className="size-4" aria-hidden="true" /> ЖИ-сіз: ережемен тексеріледі
        </span>
      </LabHeader>
      <Timeline slug={w.slug} events={ref.map(({ id, text }) => ({ id, text }))} startOrder={start} startElements={saved?.data.elements ?? {}} />
    </div>
  );
}
