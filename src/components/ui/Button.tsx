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
        "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--studio-accent)] focus:ring-offset-2 disabled:opacity-50",
        {
          "bg-[var(--studio-accent)] text-black hover:bg-[var(--studio-accent-hover)]":
            variant === "primary",
          "border bg-transparent text-[var(--studio-text)] hover:bg-[var(--studio-surface-elevated)]":
            variant === "secondary",
          "bg-transparent text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]":
            variant === "ghost",
          "bg-[var(--studio-danger)] text-white hover:opacity-90":
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
