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
        /* QAL'AT AL-HAQQ design system */
        qah: {
          bg: "#050505",
          surface: "#0a0a0a",
          "surface-raised": "#111111",
          border: "#1a1a1a",
          "border-strong": "#2a2a2a",
          text: "#e8e8e8",
          "text-muted": "#888888",
          "text-subtle": "#555555",
          accent: "#b8a050",
          "accent-dim": "#7a6b35",
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
    },
  },
  plugins: [],
};
