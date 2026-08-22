import { cn } from "@/utils/cn";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium text-[var(--qah-text-muted)]">
          {label}
        </label>
      )}
      <input
        className={cn(
          "w-full rounded-[2px] border border-[var(--qah-border)] bg-[var(--qah-surface)] px-3 py-2 text-sm text-[var(--qah-text)]",
          "placeholder:text-[var(--qah-text-subtle)]",
          "focus:outline-none focus:ring-1 focus:ring-[var(--qah-accent)] focus:border-[var(--qah-accent)]",
          error && "border-[var(--qah-danger)] focus:ring-[var(--qah-danger)]",
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-xs text-[var(--qah-danger)]">{error}</p>
      )}
    </div>
  );
}
