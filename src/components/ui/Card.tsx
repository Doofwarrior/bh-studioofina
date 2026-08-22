import { cn } from "@/utils/cn";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
}

export function Card({ title, subtitle, children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[2px] border border-[var(--qah-border)] bg-[var(--qah-surface)] p-4",
        className
      )}
      {...props}
    >
      {(title || subtitle) && (
        <div className="mb-3">
          {title && (
            <h3 className="text-base font-semibold text-[var(--qah-text)]">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-[var(--qah-text-muted)]">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
