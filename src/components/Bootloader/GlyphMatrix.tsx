import { useEffect, useRef } from "react";

interface GlyphMatrixProps {
  className?: string;
}

const GLYPHS = [
  "ا",
  "ب",
  "ت",
  "ث",
  "ج",
  "ح",
  "خ",
  "د",
  "ذ",
  "ر",
  "ز",
  "س",
  "ش",
  "ص",
  "ض",
  "ط",
  "ظ",
  "ع",
  "غ",
  "ف",
  "ق",
  "ك",
  "ل",
  "م",
  "ن",
  "ه",
  "و",
  "ي",
  "ح",
  "ق",
  "الحق",
];

const COLUMN_WIDTH = 20;

export function GlyphMatrix({ className = "" }: GlyphMatrixProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let animationFrame = 0;
    let running = true;
    let resizeObserver: ResizeObserver | undefined;

    const state = {
      width: 0,
      height: 0,
      columns: 0,
      drops: [] as number[],
      speeds: [] as number[],
      glyphs: [] as string[],
    };

    const setup = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      state.width = Math.max(1, Math.floor(rect.width));
      state.height = Math.max(1, Math.floor(rect.height));
      state.columns = Math.max(1, Math.ceil(state.width / COLUMN_WIDTH));

      canvas.width = Math.floor(state.width * dpr);
      canvas.height = Math.floor(state.height * dpr);

      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      state.drops = Array.from(
        { length: state.columns },
        () => Math.random() * Math.max(1, state.height / COLUMN_WIDTH)
      );

      state.speeds = Array.from(
        { length: state.columns },
        () => 0.25 + Math.random() * 0.55
      );

      state.glyphs = Array.from(
        { length: state.columns },
        () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
      );

      context.fillStyle = "rgba(3, 4, 3, 1)";
      context.fillRect(0, 0, state.width, state.height);
    };

    const draw = () => {
      if (!running) return;

      const { width, height } = state;

      context.fillStyle = "rgba(3, 4, 3, 0.08)";
      context.fillRect(0, 0, width, height);

      context.font = "16px 'Noto Sans Arabic', sans-serif";
      context.textBaseline = "top";

      for (let index = 0; index < state.columns; index += 1) {
        const x = index * COLUMN_WIDTH;
        const y = state.drops[index] * COLUMN_WIDTH;

        const alpha = 0.12 + Math.random() * 0.22;
        context.fillStyle = `rgba(127, 255, 127, ${alpha})`;
        context.fillText(state.glyphs[index], x, y);

        if (y > height + 40) {
          state.drops[index] = -Math.random() * 20;
          state.glyphs[index] =
            GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        } else {
          state.drops[index] += state.speeds[index];
        }
      }

      animationFrame = window.requestAnimationFrame(draw);
    };

    setup();

    const supportsResizeObserver = typeof ResizeObserver !== "undefined";

    if (supportsResizeObserver) {
      resizeObserver = new ResizeObserver(setup);
      resizeObserver.observe(canvas);
    } else {
      window.addEventListener("resize", setup);
    }

    if (reducedMotion) {
      context.font = "16px 'Noto Sans Arabic', sans-serif";
      context.textBaseline = "top";

      for (let index = 0; index < state.columns; index += 1) {
        const x = index * COLUMN_WIDTH;
        const y = state.drops[index] * COLUMN_WIDTH;

        context.fillStyle = "rgba(127, 255, 127, 0.16)";
        context.fillText(state.glyphs[index], x, y);
      }
    } else {
      animationFrame = window.requestAnimationFrame(draw);
    }

    return () => {
      running = false;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();

      if (!supportsResizeObserver) {
        window.removeEventListener("resize", setup);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`absolute inset-0 h-full w-full ${className}`}
    />
  );
}
