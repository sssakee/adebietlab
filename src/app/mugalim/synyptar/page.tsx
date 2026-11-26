import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { levelFor } from "@/lib/grading";
import { teacherClasses } from "@/lib/teacher";
import { NewClassForm } from "./NewClassForm";
import { PageHead } from "@/components/PageHead";

export const metadata = { title: "Сыныптарым" };

export default async function Classes() {
  const u = await requireRole("teacher");
  const list = await teacherClasses(u.id);
  const students = await sql<{ class_id: string; full_name: string; points: number }[]>`
    select m.class_id, p.full_name, p.points from class_members m join profiles p on p.id = m.student_id
    join classes c on c.id = m.class_id where c.teacher_id = ${u.id} order by p.full_name`;
  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Сыныптарым" sub="Оқушылар сынып кодымен, атымен және PIN-мен қосылады." stats={[["Сынып", list.length], ["Оқушы", students.length]]} />
      <NewClassForm />
      {list.map((c) => {
        const ss = students.filter((s) => s.class_id === c.id);
        return (
          <section key={c.id} className="card" aria-labelledby={`c-${c.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id={`c-${c.id}`} className="text-2xl font-bold">{c.name}</h2>
              <p className="rounded-2xl bg-[#e4efff] px-4 py-2 font-bold text-primary">
                Сынып коды: <span className="num text-xl tracking-[0.2em]">{c.join_code}</span>
              </p>
            </div>
            {ss.length ? (
              <table className="mt-4 w-full text-left">
                <caption className="sr-only">{c.name} оқушылары</caption>
                <thead className="text-sm text-muted">
                  <tr><th className="py-2 font-bold">Оқушы</th><th className="font-bold">Деңгейі</th><th className="text-right font-bold">Ашылым</th></tr>
                </thead>
                <tbody>
                  {ss.map((s) => (
                    <tr key={s.full_name} className="border-t border-line">
                      <td className="py-3 font-bold">{s.full_name}</td>
                      <td>{levelFor(s.points).name}</td>
                      <td className="num text-right">{s.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mt-4 text-muted">Әзірге оқушы жоқ. Кодты оқушыларға беріңіз: олар /kiru бетінде «Оқушы» бөлімінен қосылады.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
