import { cn } from "@/utils/cn";
import { useId, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const description = [props["aria-describedby"], error && `${id}-error`].filter(Boolean).join(" ");
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-[var(--qah-text-muted)]">
          {label}
        </label>
      )}
      <input
        className={cn(
          "w-full rounded-[2px] border border-qah-border-pale bg-[var(--qah-surface)] px-3 py-2 text-sm text-[var(--qah-text)]",
          "placeholder:text-[var(--qah-text-subtle)]",
          "focus:outline-none focus:ring-1 focus:ring-[var(--qah-accent)] focus:border-[var(--qah-accent)]",
          error && "border-[var(--qah-danger)] focus:ring-[var(--qah-danger)]",
          className
        )}
        {...props}
        id={id}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={description || undefined}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-[var(--qah-identity)]">{error}</p>
      )}
    </div>
  );
}
