import { BarChart3, FolderOpen, LayoutDashboard, Users, Wand2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { Shell } from "@/components/Shell";

const NAV = [
  { href: "/mugalim", label: "Шолу", short: "Шолу", icon: <LayoutDashboard />, exact: true },
  { href: "/mugalim/synyptar", label: "Сыныптарым", short: "Сынып", icon: <Users /> },
  { href: "/mugalim/zhasau", label: "Тапсырма жасау", short: "Жасау", icon: <Wand2 /> },
  { href: "/mugalim/bank", label: "Тапсырмалар банкі", short: "Банк", icon: <FolderOpen /> },
  { href: "/mugalim/natizheler", label: "Нәтижелер", short: "Нәтиже", icon: <BarChart3 /> },
];

export default async function TeacherLayout({ children }: LayoutProps<"/mugalim">) {
  const u = await requireRole("teacher");
  return (
    <Shell nav={NAV} subtitle="Мұғалім панелі" user={{ name: u.full_name, note: "Қазақ әдебиеті, 5–11 сынып" }}>
      {children}
    </Shell>
  );
}
