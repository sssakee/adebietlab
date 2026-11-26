import { requireRole } from "@/lib/auth";
import { ToolGrid } from "@/components/ToolGrid";
import { PageHead } from "@/components/PageHead";
import { QUOTES } from "@/lib/quotes";

export const metadata = { title: "Зертхана құралдары" };

export default async function Lab() {
  await requireRole("student");
  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Зертхана құралдары" sub="Барлық құрал ЖИ-сіз, ережемен жұмыс істейді." quote={QUOTES.olen} />
      <ToolGrid />
    </div>
  );
}
