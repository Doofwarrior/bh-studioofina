import type { ReactNode } from "react";
import { GlyphMatrix } from "./GlyphMatrix";

interface BootloaderProps {
  children: ReactNode;
}

export default function Bootloader({ children }: BootloaderProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-qah-bg">
      <GlyphMatrix />

      <div className="relative z-10 min-h-screen">
        {children}
      </div>
    </div>
  );
}
