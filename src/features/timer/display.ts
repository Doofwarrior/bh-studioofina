export const prefKey = "qah:work-timer:display";
export type Mode = "always" | "active" | "minimized";
export interface Preferences {
  mode: Mode;
  remind: boolean;
  position?: { x: number; y: number };
}
export function readPrefs(): Preferences {
  let p;
  try {
    p = JSON.parse(localStorage.getItem(prefKey) ?? "{}") ?? {};
  } catch {
    return { mode: "always", remind: false };
  }
  return {
    mode: ["always", "active", "minimized"].includes(p.mode)
      ? p.mode
      : "always",
    remind: p.remind === true,
    position:
      Number.isFinite(p.position?.x) && Number.isFinite(p.position?.y)
        ? p.position
        : undefined,
  };
}
export function duration(ms: number) {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return [
    Math.floor(seconds / 3600),
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
}
