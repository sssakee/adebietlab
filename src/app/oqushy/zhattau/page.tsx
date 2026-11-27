import { requireRole } from "@/lib/auth";
import { verses } from "@/lib/verses";
import { PageHead } from "@/components/PageHead";
import { Memorize } from "@/components/Memorize";

export const metadata = { title: "Жаттау режимі" };

export default async function Memorise() {
  await requireRole("student");
  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Жаттау режимі" sub="Сөздер деңгей сайын жасырылады, сен оларды жадыңнан жазасың. Соңғы деңгейде бәрі дұрыс болса — 5 жұлдыз." />
      <Memorize verses={await verses()} />
    </div>
  );
}
