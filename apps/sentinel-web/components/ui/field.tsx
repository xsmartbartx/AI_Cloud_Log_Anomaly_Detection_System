import { useId } from "react";
import { cn } from "@/lib/cn";

type Common = { label: string; hint?: string; error?: string };

const base =
  "w-full rounded-md border bg-bg px-3 text-sm text-text placeholder:text-muted " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

export function Input({ label, hint, error, className, ...rest }: Common & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error || hint ? `${id}-d` : undefined}
        className={cn(base, "h-10", error ? "border-danger" : "border-border-input", className)}
        {...rest}
      />
      {(error || hint) && (
        <p id={`${id}-d`} className={cn("text-xs", error ? "text-danger" : "text-muted")}>{error ?? hint}</p>
      )}
    </div>
  );
}

export function LogArea({ label, hint, error, className, ...rest }: Common & React.TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: React.Ref<HTMLTextAreaElement> }) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <textarea
        id={id}
        spellCheck={false}
        aria-invalid={!!error}
        aria-describedby={error || hint ? `${id}-d` : undefined}
        className={cn(base, "min-h-56 py-3 font-mono text-xs leading-5 resize-y", error ? "border-danger" : "border-border-input", className)}
        {...rest}
      />
      {(error || hint) && (
        <p id={`${id}-d`} className={cn("text-xs", error ? "text-danger" : "text-muted")}>{error ?? hint}</p>
      )}
    </div>
  );
}
