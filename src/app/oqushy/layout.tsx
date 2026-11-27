import Link from "next/link";
import { BookOpen, FlaskConical, Home, ListChecks, Medal, Trophy } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { levelFor } from "@/lib/grading";
import { studentAssignments } from "@/lib/queries";
import { Shell } from "@/components/Shell";
import { ChatWidget } from "@/components/ChatWidget";
import type { TourStep } from "@/components/Tour";

const NAV = [
  { href: "/oqushy", label: "Басты бет", short: "Басты", icon: <Home />, exact: true },
  { href: "/oqushy/shygarmalar", label: "Шығармалар", short: "Шығарма", icon: <BookOpen /> },
  { href: "/oqushy/zertkhana", label: "Зертхана құралдары", short: "Зертхана", icon: <FlaskConical /> },
  { href: "/oqushy/baige", label: "Бәйге", short: "Бәйге", icon: <Medal /> },
  { href: "/oqushy/tapsyrmalar", label: "Тапсырмаларым", short: "Тапсырма", icon: <ListChecks /> },
  { href: "/oqushy/zhetistikter", label: "Жетістіктер", short: "Жетістік", icon: <Trophy /> },
];

const nav = (href: string) => `nav a[href="${href}"]`;
const TOUR: TourStep[] = [
  { title: "Сәлем! Мен — Қырантай", text: "Мұнда шығарманы оқып қана қоймай, зерттейсің. Бір минутта бәрін көрсетейін." },
  { target: nav("/oqushy/shygarmalar"), title: "Шығармалар", text: "5–11 сыныптағы шығармалар осында. Атауы, ақыны не жанры бойынша ізде." },
  { target: nav("/oqushy/zertkhana"), title: "Зертхана құралдары", text: "Өлеңнің буынын сана, кейіпкерлерді байланыстыр, оқиғаны ретке қой. Жауабыңды бірден тексересің." },
  { target: nav("/oqushy/baige"), title: "Бәйге", text: "Күн сайын бес сұрақтық викторина, жұмыс тізбегің және сыныптағы апталық рейтинг." },
  { target: nav("/oqushy/tapsyrmalar"), title: "Тапсырмаларың", text: "Мұғалім берген жұмыс пен мерзімі осында. Тапсырған соң мұғалімнің пікірін де осы жерден оқисың." },
  { target: nav("/oqushy/zhetistikter"), title: "Жетістіктер", text: "Әр ашылымың үшін жұлдыз жинап, жаңа белгі аласың." },
  { target: "[aria-controls=chat-panel]", title: "Сұрағың болса, маған жаз", text: "Дайын жауап бермеймін, бірақ ойлануға бағыт беремін." },
  { target: "[data-tour=sound]", title: "Дыбыс", text: "Дыбысты осы батырмамен қосасың. Әдепкіде ол өшірулі. Нұсқаулықты «?» батырмасымен қайта ашасың." },
];

export default async function StudentLayout({ children }: LayoutProps<"/oqushy">) {
  const u = await requireRole("student");
  const open = (await studentAssignments(u.id, u.class_id)).find((a) => a.status === "new");
  const aside = open && (
    <div className="rounded-3xl bg-gold-soft p-4">
      <p className="font-bold">Мұғалім тапсырмасы</p>
      <p className="mt-2 text-sm text-muted">
        {open.title}{open.kind === "lab" && `: ${open.lab_tools.length} зертхана құралы`}.
        {open.due_at && ` Мерзімі — ${open.due_at}.`}
      </p>
      <Link href={`/oqushy/tapsyrmalar/${open.id}`} data-nav="forward" className="btn-primary mt-3 w-full whitespace-nowrap px-3">
        Тапсырманы ашу
      </Link>
    </div>
  );
  return (
    <Shell tour={{ key: "al_tour_student", steps: TOUR }} nav={NAV} aside={aside} floating={<ChatWidget />} user={{ name: u.full_name, note: `${u.class_name ?? ""} · ${levelFor(u.points).name} зерттеуші` }}>
      {/* room below content so the floating chat button never covers the last button */}
      <div className="lg:pb-24">{children}</div>
    </Shell>
  );
}
