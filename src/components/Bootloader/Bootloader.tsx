import type { ReactNode } from "react";
import { GlyphMatrix } from "./GlyphMatrix";

interface BootloaderProps {
  children: ReactNode;
}

export default function Bootloader({ children }: BootloaderProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent">
      <div className="pointer-events-none fixed inset-0 z-0">
        <GlyphMatrix />
      </div>

      <div className="relative z-10 min-h-screen">
        {children}
      </div>
    </div>
  );
}
