import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { STATUS, studentAssignments, TOOL_LABEL } from "@/lib/queries";
import { AI_MODE_LABEL } from "@/lib/ai/prompts/chat";
import { Muiz } from "@/components/Ornament";

export const metadata = { title: "Тапсырмаларым" };

export default async function MyTasks() {
  const u = await requireRole("student");
  const list = await studentAssignments(u.id, u.class_id);
  return (
    <div className="flex flex-col gap-6">
      <header className="card">
        <h1 className="text-3xl font-bold">Тапсырмаларым</h1>
        <p className="mt-1 text-muted">Мұғалім берген жұмыстар, мерзімі мен нәтижесі.</p>
      </header>
      {list.length ? (
        <ul className="flex flex-col gap-4">
          {list.map((a) => (
            <li key={a.id}>
              <Link href={`/oqushy/tapsyrmalar/${a.id}`} className="card flex flex-wrap items-center gap-4 p-5 hover:-translate-y-0.5 transition-transform">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-muted">
                    {a.kind === "lab" ? a.lab_tools.map((t) => TOOL_LABEL[t]).join(" · ") : "Тапсырмалар жинағы"} · {AI_MODE_LABEL[a.ai_mode]}
                  </p>
                  <p className="mt-1 text-lg font-bold">{a.title}</p>
                  {a.due_at && <p className="text-sm text-muted">Мерзімі: {a.due_at}</p>}
                </div>
                {a.kind === "tasks" && a.status !== "new" && (
                  <span className="num text-lg font-bold">
                    {a.score} / {a.max}
                  </span>
                )}
                <span className={`tag ${STATUS[a.status].cls}`}>{STATUS[a.status].label}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="card flex flex-col items-center gap-3 py-12 text-center text-muted">
          <Muiz className="w-16 text-gold" />
          Әзірге тапсырма жоқ. Мұғалім тапсырма бергенде осында шығады.
        </div>
      )}
    </div>
  );
}
