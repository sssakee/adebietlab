import { SplitText } from "@/components/SplitText";
import { Award, Flame, Star } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { levelFor } from "@/lib/grading";
import { discoveries, streak } from "@/lib/queries";
import { Mascot } from "@/components/Mascot";

export const metadata = { title: "Жетістіктер" };

export default async function Achievements() {
  const u = await requireRole("student");
  const [found, days] = await Promise.all([discoveries(u.id), streak(u.id)]);
  const [c] = await sql<{ olen: boolean; map: boolean; egerde: boolean; tasks: number }[]>`
    select
      exists (select 1 from lab_works where student_id = ${u.id} and kind = 'olen' and (result->>'rhyme_ok')::boolean) as olen,
      exists (select 1 from lab_works where student_id = ${u.id} and kind = 'char_map' and result->>'found' = result->>'total') as map,
      exists (select 1 from lab_works where student_id = ${u.id} and kind = 'egerde') as egerde,
      (select count(*)::int from submissions where student_id = ${u.id}) as tasks`;
  const lvl = levelFor(u.points);
  const badges = [
    { name: "Өлең зерттеушісі", text: "Өлеңнің өлшемі мен ұйқасын дұрыс анықтадың", got: c.olen },
    { name: "Картограф", text: "Кейіпкер картасындағы барлық байланысты таптың", got: c.map },
    { name: "Болжамшы", text: "«Егер...» тәжірибесінде болжам жасадың", got: c.egerde },
    { name: "Тапсырма шебері", text: "Мұғалімнің тапсырмасын орындадың", got: c.tasks > 0 },
  ];
  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-[32px] hero-bg p-8 text-white">
        <Mascot size={130} className="float absolute bottom-0 right-6 hidden sm:block" />
        <p className="text-sm font-bold text-white/90">{u.class_name}</p>
        <h1 className="mt-1 text-4xl font-bold">
          <SplitText text={u.full_name} />
        </h1>
        <p className="mt-2 text-xl font-bold text-gold">{lvl.name} зерттеуші</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <span className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 font-bold"><Star className="size-5 fill-gold text-gold" aria-hidden="true" /> <span className="num">{u.points}</span> ашылым</span>
          <span className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 font-bold"><Flame className="size-5 text-[#ff9b7f]" aria-hidden="true" /> <span className="num">{days}</span> күн қатарынан</span>
        </div>
      </section>
      <section className="card" aria-labelledby="b">
        <h2 id="b" className="mb-4 text-xl font-bold">Белгілер</h2>
        <ul className="rise grid gap-3 sm:grid-cols-2">
          {badges.map((b) => (
            <li key={b.name} className={`flex items-center gap-4 rounded-2xl p-4 ${b.got ? "bg-gold-soft" : "bg-soft opacity-70"}`}>
              <Award className={`size-10 shrink-0 ${b.got ? "text-gold" : "text-muted"}`} aria-hidden="true" />
              <span>
                <span className="block font-bold">{b.name}{!b.got && " · әлі ашылмаған"}</span>
                <span className="block text-sm text-muted">{b.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="card" aria-labelledby="d">
        <h2 id="d" className="mb-4 text-xl font-bold">Менің ашылымдарым</h2>
        {found.length ? (
          <ul className="flex flex-col gap-3">
            {found.map((d, i) => (
              <li key={i} className="rounded-2xl bg-soft p-4">
                <p className="font-bold">{d.title}</p>
                <p className="text-sm text-muted">{d.tool} · {d.at}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">Алғашқы ашылымың алда!</p>
        )}
      </section>
    </div>
  );
}
