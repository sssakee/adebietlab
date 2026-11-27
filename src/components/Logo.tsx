import { FlaskConical } from "lucide-react";

export function Logo({ subtitle = "Қазақ әдебиеті зертханасы" }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-12 shrink-0 place-items-center tile rounded-2xl bg-linear-135 from-primary to-violet text-on-color">
        <FlaskConical className="size-6" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-xl font-bold leading-tight">
          Әдебиет<span className="bg-linear-90 from-primary to-violet bg-clip-text text-transparent">Lab</span>
        </span>
        <span className="block text-xs font-medium text-muted">{subtitle}</span>
      </span>
    </div>
  );
}
