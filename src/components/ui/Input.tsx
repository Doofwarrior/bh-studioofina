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
        <label className="text-sm font-medium text-[var(--studio-text-muted)]">
          {label}
        </label>
      )}
      <input
        className={cn(
          "w-full rounded-md border bg-[var(--studio-surface)] px-3 py-2 text-sm text-[var(--studio-text)]",
          "placeholder:text-[var(--studio-text-subtle)]",
          "focus:outline-none focus:ring-1 focus:ring-[var(--studio-accent)]",
          error && "border-[var(--studio-danger)] focus:ring-[var(--studio-danger)]",
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-xs text-[var(--studio-danger)]">{error}</p>
      )}
    </div>
  );
}
