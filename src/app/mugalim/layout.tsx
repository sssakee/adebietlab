import { BarChart3, FolderOpen, LayoutDashboard, PieChart, Users, Wand2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import type { TourStep } from "@/components/Tour";

const NAV = [
  { href: "/mugalim", label: "Шолу", short: "Шолу", icon: <LayoutDashboard />, exact: true },
  { href: "/mugalim/synyptar", label: "Сыныптарым", short: "Сынып", icon: <Users /> },
  { href: "/mugalim/zhasau", label: "Тапсырма жасау", short: "Жасау", icon: <Wand2 /> },
  { href: "/mugalim/bank", label: "Тапсырмалар банкі", short: "Банк", icon: <FolderOpen /> },
  { href: "/mugalim/natizheler", label: "Нәтижелер", short: "Нәтиже", icon: <BarChart3 /> },
  { href: "/mugalim/analitika", label: "Аналитика", short: "Талдау", icon: <PieChart /> },
];

const nav = (href: string) => `nav a[href="${href}"]`;
const TOUR: TourStep[] = [
  { title: "Қош келдіңіз!", text: "ӘдебиетLab-тың негізгі бөлімдерін бір минутта көрсетейін." },
  { target: nav("/mugalim/synyptar"), title: "Сыныптарым", text: "Сынып ашыңыз. Жүйе 6 таңбалы код береді, оқушылар сол кодпен кіреді." },
  { target: nav("/mugalim/zhasau"), title: "Тапсырма жасау", text: "Өз материалыңызды жүктеңіз. ЖИ тапсырма құрастырады, сіз тексеріп бекітесіз." },
  { target: nav("/mugalim/bank"), title: "Тапсырмалар банкі", text: "Бекітілген жинақтар осында. Оларды сыныпқа мерзімімен бересіз." },
  { target: nav("/mugalim/natizheler"), title: "Нәтижелер", text: "Кім қай тапсырмада қиналғанын кестеден көресіз, ашық жауаптарды бағалайсыз." },
  { target: nav("/mugalim/analitika"), title: "Аналитика", text: "Қай шығарма мен дағды қиын, кім артта қалып жатқаны себебімен көрінеді." },
  { target: "[data-tour=sound]", title: "Дыбыс", text: "Дыбысты осы батырмамен қосасыз. Нұсқаулықты «?» батырмасымен қайта ашасыз." },
];

export default async function TeacherLayout({ children }: LayoutProps<"/mugalim">) {
  const u = await requireRole("teacher");
  return (
    <Shell tour={{ key: "al_tour_teacher", steps: TOUR }} nav={NAV} subtitle="Мұғалім панелі" user={{ name: u.full_name, note: "Қазақ әдебиеті, 5–11 сынып" }}>
      {children}
    </Shell>
  );
}
