import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function LabHeader({ kicker, title, back = "/oqushy/zertkhana", children }: { kicker: string; title: string; back?: string; children?: React.ReactNode }) {
  return (
    <header className="card flex flex-wrap items-center gap-4 py-4">
      <Link href={back} className="grid size-12 shrink-0 place-items-center rounded-2xl bg-soft hover:bg-accent-soft" aria-label="Артқа">
        <ArrowLeft className="size-5" aria-hidden="true" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-muted">{kicker}</p>
        <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
      </div>
      {children}
    </header>
  );
}
