import { cn } from "@/utils/cn";
import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}

export function Badge({ children, variant = "default" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[2px] px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-[var(--qah-surface-raised)] text-[var(--qah-text-muted)]":
            variant === "default",
          "bg-[var(--qah-success)]/10 text-[var(--qah-success)]": variant === "success",
          "bg-[var(--qah-warning)]/10 text-[var(--qah-warning)]": variant === "warning",
          "bg-[var(--qah-danger)]/10 text-[var(--qah-danger)]": variant === "danger",
        }
      )}
    >
      {children}
    </span>
  );
}
