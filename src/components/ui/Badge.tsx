import { Check, Circle, LoaderCircle, OctagonAlert, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

const icons = { default: Circle, success: Check, warning: TriangleAlert, danger: OctagonAlert, processing: LoaderCircle };

interface BadgeProps {
  children: ReactNode;
  variant?: keyof typeof icons;
}

export function Badge({ children, variant = "default" }: BadgeProps) {
  const Icon = icons[variant];
  return (
    <span className={`qah-indicator qah-indicator--${variant}`}>
      <Icon size={13} aria-hidden="true" />
      {children}
    </span>
  );
}
