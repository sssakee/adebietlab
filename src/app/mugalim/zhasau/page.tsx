import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { isMock } from "@/lib/ai";
import { GenForm } from "./GenForm";

export const metadata = { title: "Тапсырма жасау" };

export default async function Generate() {
  await requireRole("teacher");
  const methods = await sql<{ id: string; name: string; description: string }[]>`select id, name, description from methods order by name`;
  const works = await sql<{ id: string; label: string }[]>`select id, '«' || title || '» — ' || author as label from works order by author, title`;
  return (
    <div className="flex flex-col gap-6">
      <header className="card">
        <h1 className="text-3xl font-bold">Әдіс + материал → тапсырма</h1>
        <p className="mt-1 text-muted">Әдіс таңдап, материалыңызды беріңіз. ЖИ тек сол материалға сүйеніп тапсырма жасайды, сіз қарап, өңдеп, бекітесіз. Бекітпейінше оқушы ештеңе көрмейді.</p>
        {isMock() && <p className="mt-3 rounded-2xl bg-gold-soft p-3 text-sm font-bold">Демо режим (AI_MOCK): тапсырмалар ЖИ-сіз, ережемен жасалады. Нақты ЖИ үшін .env файлына кілт қойыңыз.</p>}
      </header>
      <GenForm methods={methods} works={works} />
    </div>
  );
}
