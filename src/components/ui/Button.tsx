import { cn } from "@/utils/cn";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-[2px] font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--qah-accent)] disabled:opacity-50 disabled:cursor-not-allowed",
        {
          "bg-[var(--qah-accent-dim)] text-[var(--qah-bg)] hover:bg-[var(--qah-accent)] border border-[var(--qah-accent-dim)]":
            variant === "primary",
          "border border-[var(--qah-border-strong)] bg-[var(--qah-surface-raised)] text-[var(--qah-text)] hover:bg-[var(--qah-border-strong)] hover:text-[var(--qah-accent)]":
            variant === "secondary",
          "border border-transparent bg-transparent text-[var(--qah-text-muted)] hover:bg-[var(--qah-surface-raised)] hover:text-[var(--qah-text)]":
            variant === "ghost",
          "bg-[var(--qah-danger)] text-white hover:opacity-90 border border-[var(--qah-danger)]":
            variant === "danger",
        },
        {
          "px-3 py-1.5 text-xs": size === "sm",
          "px-4 py-2 text-sm": size === "md",
          "px-6 py-3 text-base": size === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
