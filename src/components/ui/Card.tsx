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
        "rounded-lg border bg-[var(--studio-surface)] p-4",
        className
      )}
      {...props}
    >
      {(title || subtitle) && (
        <div className="mb-3">
          {title && (
            <h3 className="text-base font-semibold text-[var(--studio-text)]">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-[var(--studio-text-muted)]">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
