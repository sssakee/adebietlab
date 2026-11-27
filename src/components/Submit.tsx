"use client";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

/** Submit button for server-action forms: disables itself and shows a spinner while the action runs. */
export function Submit({ children, disabled, ...rest }: React.ComponentProps<"button">) {
  const { pending } = useFormStatus();
  return (
    <button {...rest} disabled={pending || disabled} aria-busy={pending || undefined}>
      {pending && <LoaderCircle className="size-4 shrink-0 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
