import Link from "next/link";
import { AudioLines, BookA, GitBranch, Hourglass, Image as ImageIcon, MapPinned, MessagesSquare, PenLine, Repeat, TrendingUp, Waypoints, type LucideIcon } from "lucide-react";

type ToolCard = { href: string; title: string; text: string; icon: LucideIcon; color: string };

const TOOLS: ToolCard[] = [
  { href: "/oqushy/zertkhana/olen/abai-qys", title: "Өлең өлшегіш", text: "Буын санын, ұйқас түрін, өлең өлшемін көрнекі түрде анықта.", icon: AudioLines, color: "bg-primary" },
  { href: "/oqushy/zertkhana/karta/kozy-korpesh", title: "Кейіпкер картасы", text: "Кейіпкерлерді байланыстырып, қатынасын мәтінмен дәлелде.", icon: Waypoints, color: "bg-violet" },
  { href: "/oqushy/zertkhana/karta/kozy-korpesh#egerde", title: "«Егер...» тәжірибесі", text: "Кейіпкер басқа шешім қабылдаса ше? Болжам жаса, дәлелде.", icon: GitBranch, color: "bg-red" },
  { href: "/oqushy/zertkhana/zheli/kozy-korpesh", title: "Оқиға желісі", text: "Оқиғаларды ретке қойып, сюжет элементтеріне орналастыр.", icon: TrendingUp, color: "bg-green-ink" },
];

/** Tools for remembering and sharing, beyond the analysis tools above. */
export const MORE_TOOLS: ToolCard[] = [
  { href: "/oqushy/zhattau", title: "Жаттау режимі", text: "Өлең сөздері деңгей сайын жасырылады, сен жадыңнан жазасың.", icon: Repeat, color: "bg-magenta" },
  { href: "/oqushy/kartochka", title: "Цитата карточкасы", text: "Ұнаған жолды әдемі суретке айналдырып, бөліс.", icon: ImageIcon, color: "bg-navy" },
];

/** Tools where the AI takes part. */
export const AI_TOOLS: ToolCard[] = [
  { href: "/oqushy/suhbat", title: "Кейіпкермен сұхбат", text: "Абайға не Қозы Көрпешке сұрақ қой: ЖИ кейіпкер рөлінде, шығарма мазмұнына сүйеніп жауап береді.", icon: MessagesSquare, color: "bg-red" },
  { href: "/oqushy/shygarmashylyq", title: "Шығармашылық зертхана", text: "Шығарманың соңын өзгертіп жаз не кейіпкерге хат жаз. ЖИ пікір береді, бағаны мұғалім қояды.", icon: PenLine, color: "bg-magenta" },
];

/** Reference pages: where the authors came from, how literature grew, what old words mean. */
export const WORLD_TOOLS: ToolCard[] = [
  { href: "/oqushy/adebi-karta", title: "Әдеби карта", text: "Ақын-жазушылар мен шығармалар туған жеріне қарай Қазақстан картасында.", icon: MapPinned, color: "bg-green-ink" },
  { href: "/oqushy/tarih", title: "Әдебиет тарихы", text: "Көне жазбалардан бүгінге дейін: дәуір сайын кім жазды.", icon: Hourglass, color: "bg-violet" },
  { href: "/oqushy/sozdik", title: "Сөздік", text: "Көнерген, сирек сөздердің түсіндірмесі және сенің жеке сөздігің.", icon: BookA, color: "bg-primary" },
];

export function ToolGrid({ tools = TOOLS }: { tools?: ToolCard[] }) {
  return (
    <div className="rise grid gap-4 md:grid-cols-2">
      {tools.map((t) => {
        const body = (
          <>
            <span className={`grid size-14 shrink-0 place-items-center tile rounded-2xl text-on-color ${t.color}`} aria-hidden="true">
              <t.icon className="size-7" />
            </span>
            <span>
              <span className="block text-lg font-bold">{t.title}</span>
              <span className="mt-1 block text-sm font-medium text-muted">{t.text}</span>
            </span>
          </>
        );
        return t.href ? (
          <Link key={t.title} href={t.href} data-nav="forward" className="card flex gap-4 p-5">
            {body}
          </Link>
        ) : (
          <div key={t.title} className="card flex gap-4 p-5 opacity-70" aria-disabled="true">
            {body}
          </div>
        );
      })}
    </div>
  );
}
