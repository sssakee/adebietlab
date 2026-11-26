import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getWork } from "@/lib/queries";
import { Mascot } from "@/components/Mascot";
import { RHYME_TYPES } from "@/lib/poem";
import { LabHeader } from "../../LabHeader";
import { PoemLab, OwnText } from "./PoemLab";

export const metadata = { title: "Өлең өлшегіш" };

export default async function OlenPage({ params }: PageProps<"/oqushy/zertkhana/olen/[slug]">) {
  await requireRole("student");
  const w = await getWork((await params).slug);
  if (!w?.lab.poem) notFound();
  return (
    <div className="flex flex-col gap-6">
      <LabHeader kicker="Зертхана құралы · Өлең өлшегіш" title={`${w.author}, «${w.title}» (1-шумақ)`}>
        <span className="tag gap-1.5 bg-green-soft px-4 py-2 text-sm text-green-ink">
          <Check className="size-4" aria-hidden="true" /> ЖИ-сіз: ережемен тексеріледі
        </span>
      </LabHeader>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <PoemLab slug={w.slug} lines={w.lab.poem.lines} />
        <div className="flex flex-col gap-6">
          <div className="card flex items-center gap-3">
            <Mascot size={96} />
            <p className="rounded-2xl bg-soft p-4 text-sm font-medium">
              Буын санау оңай: сөздегі <b>дауысты дыбыстарды</b> сана. «Ақ ки-ім-ді» — 4 буын. <b>У</b> әрпі дауыссыздан кейін ғана буын болады: «су-ық».
            </p>
          </div>
          <section className="card" aria-labelledby="types">
            <h2 id="types" className="mb-3 text-lg font-bold">Ұйқас түрлері</h2>
            <dl className="grid grid-cols-[80px_1fr] gap-y-2 text-sm">
              {Object.entries(RHYME_TYPES).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="font-bold text-primary">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
          <OwnText />
        </div>
      </div>
    </div>
  );
}
