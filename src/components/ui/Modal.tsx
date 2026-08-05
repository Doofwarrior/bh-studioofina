import { cn } from "@/utils/cn";
import { X } from "lucide-react";
import type { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={cn(
          "relative w-full rounded-lg border bg-[var(--studio-surface)] p-6 shadow-xl",
          {
            "max-w-sm": size === "sm",
            "max-w-lg": size === "md",
            "max-w-2xl": size === "lg",
          }
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--studio-text)]">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[var(--studio-text-muted)] hover:bg-[var(--studio-surface-elevated)] hover:text-[var(--studio-text)]"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
