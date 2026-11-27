import { requireRole } from "@/lib/auth";
import { verses } from "@/lib/verses";
import { PageHead } from "@/components/PageHead";
import { QuoteCard } from "@/components/QuoteCard";

export const metadata = { title: "Цитата карточкасы" };

export default async function Card() {
  const u = await requireRole("student");
  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Цитата карточкасы" sub="Ұнаған жолды таңдап, түсін бер де, суретті сақта не Instagram-ға бөліс." />
      <QuoteCard verses={await verses()} name={u.full_name} />
    </div>
  );
}
