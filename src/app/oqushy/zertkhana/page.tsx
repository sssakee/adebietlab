import { requireRole } from "@/lib/auth";
import { ToolGrid } from "@/components/ToolGrid";

export const metadata = { title: "Зертхана құралдары" };

export default async function Lab() {
  await requireRole("student");
  return (
    <div className="flex flex-col gap-6">
      <header className="card">
        <h1 className="text-3xl font-bold">Зертхана құралдары</h1>
        <p className="mt-1 text-muted">Барлық құрал ЖИ-сіз, ережемен жұмыс істейді: нәтижесі әрқашан бірдей әрі тексерілген.</p>
      </header>
      <ToolGrid />
    </div>
  );
}
