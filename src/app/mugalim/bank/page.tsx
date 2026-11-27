import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { Muiz } from "@/components/Ornament";
import { PageHead } from "@/components/PageHead";

export const metadata = { title: "Тапсырмалар банкі" };

const FILTERS = [["", "Барлығы"], ["draft", "Жоба"], ["approved", "Бекітілген"]] as const;

export default async function Bank({ searchParams }: PageProps<"/mugalim/bank">) {
  const u = await requireRole("teacher");
  const sp = await searchParams;
  const status = FILTERS.some(([v]) => v && v === sp.s) ? String(sp.s) : "";
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q ?? "").trim();
  const sets = await sql<{ id: string; title: string; method: string; grade: number; level: string; status: string; n: number; assigned: number; created: string }[]>`
    select ts.id, ts.title, m.name as method, ts.grade, ts.level, ts.status, to_char(ts.created_at, 'DD.MM.YYYY') as created,
      (select count(*)::int from tasks where set_id = ts.id) as n,
      (select count(*)::int from assignments where set_id = ts.id) as assigned
    from task_sets ts join methods m on m.id = ts.method_id
    where ts.teacher_id = ${u.id} order by ts.created_at desc`;
  const shown = sets.filter((s) => (!status || s.status === status) && (!q || s.title.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Тапсырмалар банкі" sub="Бекітілген жинақты кез келген сыныпқа беруге болады." stats={[["Жинақ", sets.length], ["Бекітілген", sets.filter((s) => s.status === "approved").length], ["Тапсырма", sets.reduce((n, s) => n + s.n, 0)]]}>
        <Link href="/mugalim/zhasau" className="btn-gold">Жаңа жинақ</Link>
      </PageHead>
      {sets.length > 0 && (
        <section className="card flex flex-wrap items-center gap-3 p-4" aria-label="Сүзгі">
          <nav aria-label="Күйі" className="flex flex-wrap gap-2">
            {FILTERS.map(([v, label]) => (
              <Link key={v} href={{ query: { ...(v && { s: v }), ...(q && { q }) } }} aria-current={status === v ? "true" : undefined} className="chip min-h-10 px-4 text-sm aria-[current=true]:border-primary aria-[current=true]:bg-accent-soft aria-[current=true]:text-primary-dark">
                {label}
              </Link>
            ))}
          </nav>
          <form role="search" className="flex w-full min-w-0 gap-2 sm:w-auto sm:flex-1">
            {status && <input type="hidden" name="s" value={status} />}
            <label htmlFor="bq" className="sr-only">Жинақ атауы бойынша іздеу</label>
            <input id="bq" name="q" defaultValue={q} placeholder="Атауы бойынша іздеу…" className="field min-w-0 py-2" />
            <button className="btn-ghost shrink-0 px-4">Іздеу</button>
          </form>
          <p className="w-full text-sm text-muted" role="status">Табылды: <b className="num text-ink">{shown.length}</b> / {sets.length}</p>
        </section>
      )}
      {shown.length ? (
        <ul className="rise grid gap-4 lg:grid-cols-2">
          {shown.map((s) => (
            <li key={s.id}>
              <Link href={`/mugalim/bank/${s.id}`} transitionTypes={["nav-forward"]} className="card flex h-full flex-col gap-2 p-5">
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
          {sets.length ? "Бұл сүзгі бойынша жинақ табылмады." : "Әзірге жинақ жоқ."}
        </div>
      )}
    </div>
  );
}
