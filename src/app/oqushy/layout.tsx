import Link from "next/link";
import { BookOpen, FlaskConical, Home, ListChecks, Trophy } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { levelFor } from "@/lib/grading";
import { studentAssignments } from "@/lib/queries";
import { Shell } from "@/components/Shell";
import { ChatWidget } from "@/components/ChatWidget";

const NAV = [
  { href: "/oqushy", label: "Басты бет", short: "Басты", icon: <Home />, exact: true },
  { href: "/oqushy/shygarmalar", label: "Шығармалар", short: "Шығарма", icon: <BookOpen /> },
  { href: "/oqushy/zertkhana", label: "Зертхана құралдары", short: "Зертхана", icon: <FlaskConical /> },
  { href: "/oqushy/tapsyrmalar", label: "Тапсырмаларым", short: "Тапсырма", icon: <ListChecks /> },
  { href: "/oqushy/zhetistikter", label: "Жетістіктер", short: "Жетістік", icon: <Trophy /> },
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
      <Link href={`/oqushy/tapsyrmalar/${open.id}`} transitionTypes={["nav-forward"]} className="btn-primary mt-3 w-full whitespace-nowrap px-3">
        Тапсырманы ашу
      </Link>
    </div>
  );
  return (
    <Shell nav={NAV} aside={aside} user={{ name: u.full_name, note: `${u.class_name ?? ""} · ${levelFor(u.points).name} зерттеуші` }}>
      {/* room below content so the floating chat button never covers the last button */}
      <div className="lg:pb-24">{children}</div>
      <ChatWidget />
    </Shell>
  );
}
