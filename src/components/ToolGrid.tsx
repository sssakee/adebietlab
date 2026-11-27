import Link from "next/link";
import { AudioLines, GitBranch, TrendingUp, Waypoints } from "lucide-react";

const TOOLS = [
  { href: "/oqushy/zertkhana/olen/abai-qys", title: "Өлең өлшегіш", text: "Буын санын, ұйқас түрін, өлең өлшемін көрнекі түрде анықта.", icon: AudioLines, color: "bg-primary" },
  { href: "/oqushy/zertkhana/karta/kozy-korpesh", title: "Кейіпкер картасы", text: "Кейіпкерлерді байланыстырып, қатынасын мәтінмен дәлелде.", icon: Waypoints, color: "bg-violet" },
  { href: "/oqushy/zertkhana/karta/kozy-korpesh#egerde", title: "«Егер...» тәжірибесі", text: "Кейіпкер басқа шешім қабылдаса ше? Болжам жаса, дәлелде.", icon: GitBranch, color: "bg-red" },
  { href: "/oqushy/zertkhana/zheli/kozy-korpesh", title: "Оқиға желісі", text: "Оқиғаларды ретке қойып, сюжет элементтеріне орналастыр.", icon: TrendingUp, color: "bg-green-ink" },
];

export function ToolGrid() {
  return (
    <div className="rise grid gap-4 md:grid-cols-2">
      {TOOLS.map((t) => {
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
          <Link key={t.title} href={t.href} transitionTypes={["nav-forward"]} className="card flex gap-4 p-5">
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
