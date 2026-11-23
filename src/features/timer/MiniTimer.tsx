import { Badge } from "@/components/ui/Badge";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { type TimerState, elapsed } from "@/lib/workTimer";

import { duration, type Preferences } from "./display";
export function MiniTimer({
  state,
  prefs,
  now,
  details,
  toggle,
  move,
}: {
  state: TimerState;
  prefs: Preferences;
  now: number;
  details: () => void;
  toggle: () => void;
  move: (x: number, y: number) => void;
}) {
  const el = useRef<HTMLElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const [position, setPosition] = useState(prefs.position);
  const [viewport, resize] = useState([window.innerWidth, window.innerHeight]);
  const [size, setSize] = useState([0, 0]);
  const run = state.open.find((r) => r.id === state.selected);
  const visible = prefs.mode !== "active" || !!state.active || !!state.pending;
  useEffect(() => {
    setPosition(prefs.position);
  }, [prefs.position]);
  useEffect(() => {
    const fn = () => resize([window.innerWidth, window.innerHeight]);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  useLayoutEffect(() => {
    if (!el.current) return;
    const measure = () =>
      setSize([el.current!.offsetWidth, el.current!.offsetHeight]);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el.current);
    return () => observer.disconnect();
  }, [visible]);
  if (!visible) return null;
  function bound(x: number, y: number) {
    return {
      x: Math.max(0, Math.min(x, viewport[0] - size[0])),
      y: Math.max(0, Math.min(y, viewport[1] - size[1])),
    };
  }
  const pos = bound(
    position?.x ?? viewport[0] - size[0] - 12,
    position?.y ?? viewport[1] - size[1] - 12,
  );
  return (
    <aside
      ref={el}
      aria-label="Mini Timer"
      style={{ left: pos.x, top: pos.y }}
      className="fixed z-40 flex max-w-[100vw] flex-wrap items-center gap-2 border border-qah-border-strong bg-qah-surface p-2 text-sm shadow-lg"
    >
      <button
        aria-label="Move mini timer"
        title="Drag or use arrow keys"
        className="cursor-move touch-none px-1"
        onPointerDown={(e) => {
          drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag.current)
            setPosition(
              bound(e.clientX - drag.current.dx, e.clientY - drag.current.dy),
            );
        }}
        onPointerUp={(e) => {
          if (drag.current) {
            const p = bound(
              e.clientX - drag.current.dx,
              e.clientY - drag.current.dy,
            );
            move(p.x, p.y);
            drag.current = null;
          }
        }}
        onPointerCancel={() => {
          drag.current = null;
          setPosition(prefs.position);
        }}
        onKeyDown={(e) => {
          const keys: Record<string, [number, number]> = {
            ArrowDown: [0, 10],
            ArrowUp: [0, -10],
            ArrowLeft: [-10, 0],
            ArrowRight: [10, 0],
          };
          const delta = keys[e.key];
          if (delta) {
            e.preventDefault();
            const p = bound(pos.x + delta[0], pos.y + delta[1]);
            move(p.x, p.y);
          }
        }}
      >
        ⠿
      </button>
      <button
        type="button"
        aria-label="Open full timer details"
        onClick={details}
        className="text-left"
      >
        {prefs.mode !== "minimized" && (
          <span className="block max-w-56 truncate">
            {run ? run.target.title + " · " + run.target.project : "Work timer"}
          </span>
        )}
        <span className="inline-flex flex-wrap items-center gap-2">
          {!state.pending && <Badge variant={state.active?.phase === "break" || (run && !state.active) ? "warning" : state.active ? "success" : "default"}>
            {state.active?.phase === "break" ? "Break" : state.active ? "Running" : run ? "Paused" : "Idle"}
          </Badge>}
          <span className="qah-elapsed">
          {state.pending
            ? <Badge variant="warning">Review interrupted time</Badge>
            : run
              ? state.active?.phase === "break"
                ? duration(
                    Math.max(now, state.active.checkpoint) - state.active.from,
                  )
                : duration(elapsed(state, run.id, now, run.focus?.id))
              : "00:00:00"}</span>
        </span>
      </button>
      {run && !state.pending && prefs.mode !== "minimized" && (
        <Button size="sm" onClick={toggle}>
          {state.active ? "Pause" : "Resume"}
        </Button>
      )}
    </aside>
  );
}
