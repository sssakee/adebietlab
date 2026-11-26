import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { isMock } from "@/lib/ai";
import { GenForm } from "./GenForm";
import { PageHead } from "@/components/PageHead";

export const metadata = { title: "Тапсырма жасау" };

export default async function Generate() {
  await requireRole("teacher");
  const methods = await sql<{ id: string; name: string; description: string }[]>`select id, name, description from methods order by name`;
  const works = await sql<{ id: string; label: string }[]>`select id, '«' || title || '» — ' || author as label from works order by author, title`;
  return (
    <div className="flex flex-col gap-6">
      <PageHead lines={["Әдіс таңда.", "Материал бер.", "Тексеріп бекіт."]} sub="ЖИ тек сіздің материалға сүйенеді. Бекітпейінше оқушы ештеңе көрмейді." />
      {isMock() && <p className="rounded-2xl bg-gold-soft p-3 text-sm font-bold">Демо режим (AI_MOCK): тапсырмалар ЖИ-сіз, ережемен жасалады. Нақты ЖИ үшін .env файлына кілт қойыңыз.</p>}
      <GenForm methods={methods} works={works} />
    </div>
  );
}
