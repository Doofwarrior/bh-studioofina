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
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-[var(--studio-surface-elevated)] text-[var(--studio-text-muted)]":
            variant === "default",
          "bg-green-900/30 text-green-400": variant === "success",
          "bg-amber-900/30 text-amber-400": variant === "warning",
          "bg-red-900/30 text-red-400": variant === "danger",
        }
      )}
    >
      {children}
    </span>
  );
}
