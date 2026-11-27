import Link from "next/link";
import { AudioLines, GitBranch, TrendingUp, Waypoints } from "lucide-react";
import { TOOL_LABEL, toolHref } from "@/lib/queries";

export const TOOLS = {
  olen: { label: TOOL_LABEL.olen, icon: AudioLines, color: "bg-primary" },
  char_map: { label: TOOL_LABEL.char_map, icon: Waypoints, color: "bg-violet" },
  egerde: { label: TOOL_LABEL.egerde, icon: GitBranch, color: "bg-red" },
  zheli: { label: TOOL_LABEL.zheli, icon: TrendingUp, color: "bg-green-ink" },
} as const;
export type Tool = keyof typeof TOOLS;

/** Lab tools of one work, the same rows wherever they are listed. */
export function ToolLinks({ slug, tools, className = "flex flex-col gap-3" }: { slug: string; tools: string[]; className?: string }) {
  return (
    <ul className={className}>
      {tools.filter((t): t is Tool => t in TOOLS).map((t) => {
        const { label, icon: Icon, color } = TOOLS[t];
        return (
          <li key={t}>
            <Link href={toolHref(slug, t)} data-nav="forward" className="group flex min-h-14 items-center gap-3 rounded-2xl bg-soft p-3 font-bold transition-[background-color,translate] hover:translate-x-1 hover:bg-accent-soft">
              <span className={`grid size-10 shrink-0 place-items-center tile rounded-xl text-on-color ${color}`} aria-hidden="true">
                <Icon className="size-5" />
              </span>
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
