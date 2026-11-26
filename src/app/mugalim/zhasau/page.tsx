import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { isMock } from "@/lib/ai";
import { GenForm } from "./GenForm";
import { NewMethodForm } from "./NewMethodForm";
import { PageHead } from "@/components/PageHead";
import { QUOTES } from "@/lib/quotes";

export const metadata = { title: "Тапсырма жасау" };

export default async function Generate() {
  const u = await requireRole("teacher");
  const methods = await sql<{ id: string; name: string; description: string; own: boolean }[]>`
    select id, name, description, owner_id is not null as own from methods
    where owner_id is null or owner_id = ${u.id} order by owner_id nulls first, name`;
  const works = await sql<{ id: string; label: string }[]>`select id, '«' || title || '» — ' || author as label from works order by author, title`;
  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Тапсырма жасау" sub="ЖИ тек сіздің материалға сүйенеді. Бекітпейінше оқушы ештеңе көрмейді." quote={QUOTES.ulgi} />
      {isMock() && <p className="rounded-2xl bg-gold-soft p-3 text-sm font-bold">Демо режим (AI_MOCK): тапсырмалар ЖИ-сіз, ережемен жасалады. Нақты ЖИ үшін .env файлына кілт қойыңыз.</p>}
      <GenForm methods={methods} works={works} />
      <NewMethodForm />
    </div>
  );
}
