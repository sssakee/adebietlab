import { FlaskConical } from "lucide-react";

export function Logo({ subtitle = "Қазақ әдебиеті зертханасы" }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-on-color shadow-[0_6px_16px_-6px_var(--color-primary)]">
        <FlaskConical className="size-6" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-xl font-bold leading-tight">
          Әдебиет<span className="text-primary">Lab</span>
        </span>
        <span className="block text-xs font-medium text-muted">{subtitle}</span>
      </span>
    </div>
  );
}
