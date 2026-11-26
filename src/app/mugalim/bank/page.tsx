import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { Muiz } from "@/components/Ornament";

export const metadata = { title: "Тапсырмалар банкі" };

export default async function Bank() {
  const u = await requireRole("teacher");
  const sets = await sql<{ id: string; title: string; method: string; grade: number; level: string; status: string; n: number; assigned: number; created: string }[]>`
    select ts.id, ts.title, m.name as method, ts.grade, ts.level, ts.status, to_char(ts.created_at, 'DD.MM.YYYY') as created,
      (select count(*)::int from tasks where set_id = ts.id) as n,
      (select count(*)::int from assignments where set_id = ts.id) as assigned
    from task_sets ts join methods m on m.id = ts.method_id
    where ts.teacher_id = ${u.id} order by ts.created_at desc`;
  return (
    <div className="flex flex-col gap-6">
      <header className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Тапсырмалар банкі</h1>
          <p className="mt-1 text-muted">Жасалған жинақтар. Бекітілгенін кез келген сыныпқа қайта беруге болады.</p>
        </div>
        <Link href="/mugalim/zhasau" className="btn-primary">Жаңа жинақ</Link>
      </header>
      {sets.length ? (
        <ul className="grid gap-4 lg:grid-cols-2">
          {sets.map((s) => (
            <li key={s.id}>
              <Link href={`/mugalim/bank/${s.id}`} className="card flex h-full flex-col gap-2 p-5 transition-transform hover:-translate-y-0.5">
                <span className="flex flex-wrap gap-2">
                  <span className={`tag ${s.status === "approved" ? "bg-green-soft text-green-ink" : "bg-gold-soft text-ink"}`}>{s.status === "approved" ? "Бекітілген" : "Жоба"}</span>
                  <span className="tag bg-violet-soft text-violet">{s.method}</span>
                </span>
                <span className="text-lg font-bold">{s.title}</span>
                <span className="text-sm text-muted">{s.grade}-сынып · {s.level} деңгей · {s.n} тапсырма · {s.created}{s.assigned > 0 && ` · ${s.assigned} сыныпқа берілген`}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="card flex flex-col items-center gap-3 py-12 text-center text-muted">
          <Muiz className="w-16 text-gold" />
          Әзірге жинақ жоқ.
        </div>
      )}
    </div>
  );
}
