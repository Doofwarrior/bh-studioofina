/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Legacy studio palette — preserved for compatibility */
        studio: {
          50: "#f8f9fa",
          100: "#e9ecef",
          200: "#dee2e6",
          300: "#ced4da",
          400: "#adb5bd",
          500: "#6c757d",
          600: "#495057",
          700: "#343a40",
          800: "#212529",
          900: "#121416",
        },
        /* QAL'AT AL-HAQQ design system — Glyphic Matrix × Cyber-Brutalism */
        qah: {
          bg: "#030403",
          surface: "#080a08",
          "surface-raised": "#0d100d",
          border: "#1a241a",
          "border-strong": "#243024",
          "border-pale": "#2d3a2d",
          "border-mute": "#1f291f",
          text: "#e8ece8",
          "text-muted": "#9aa89a",
          "text-subtle": "#5a685a",
          "text-dim": "#3a483a",
          accent: "#7fff7f",
          "accent-bright": "#9aff9a",
          "accent-dim": "#4a8f4a",
          "accent-dark": "#2a4f2a",
          warning: "#c4a030",
          danger: "#a04040",
          success: "#4a7a4a",
        },
      },
      fontFamily: {
        mono: [
          '"IBM Plex Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
        sans: ['"Inter"', "system-ui", "-apple-system", "sans-serif"],
        arabic: ['"Noto Sans Arabic"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        none: "0",
        sm: "2px",
        DEFAULT: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
      },
      boxShadow: {
        "glow-sm": "0 0 4px var(--qah-accent-glow)",
        glow: "0 0 8px var(--qah-accent-glow), 0 0 16px var(--qah-accent-glow)",
        "glow-active": "0 0 0 1px var(--qah-accent), 0 0 8px var(--qah-accent-glow)",
      },
      backgroundImage: {
        "grid-texture":
          "linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px)",
        "grid-texture-fine":
          "linear-gradient(rgba(255, 255, 255, 0.008) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.008) 1px, transparent 1px)",
        scanline:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.008) 2px, rgba(255, 255, 255, 0.008) 4px)",
      },
      backgroundSize: {
        "grid-16": "16px 16px",
        "grid-32": "32px 32px",
        "grid-48": "48px 48px",
      },
      animation: {
        "glitch-1": "glitch-shift-1 2s infinite linear alternate-reverse",
        "glitch-2": "glitch-shift-2 3s infinite linear alternate-reverse",
        "label-jitter": "label-jitter 4s infinite ease-in-out",
      },
      keyframes: {
        "glitch-shift-1": {
          "0%, 100%": { transform: "translateX(-1px)" },
          "50%": { transform: "translateX(-2px)" },
          "75%": { transform: "translateX(0)" },
        },
        "glitch-shift-2": {
          "0%, 100%": { transform: "translateX(1px)" },
          "50%": { transform: "translateX(2px)" },
          "75%": { transform: "translateX(0)" },
        },
        "label-jitter": {
          "0%, 100%": { transform: "translateX(0)", opacity: "1" },
          "50%": { transform: "translateX(0.5px)", opacity: "0.95" },
          "75%": { transform: "translateX(-0.5px)", opacity: "0.98" },
        },
      },
    },
  },
  plugins: [],
};
