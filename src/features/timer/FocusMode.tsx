import { Badge } from "@/components/ui/Badge";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  elapsed,
  type TimerState,
  type TimerAction,
  type WorkTarget,
} from "@/lib/workTimer";
import { duration } from "./display";
export function FocusMode({
  state,
  target,
  run,
  now,
  send,
}: {
  state: TimerState;
  target: WorkTarget;
  run?: TimerState["open"][number];
  now: number;
  send: (a: TimerAction) => void;
}) {
  const [work, setWork] = useState("25"),
    [rest, setRest] = useState("5");
  const focus = run?.focus;
  const active = run && state.active?.id === run.id ? state.active : undefined;
  const live = active ? Math.max(now, active.checkpoint) - active.from : 0;
  const worked = run && focus ? elapsed(state, run.id, now, focus.id) : 0;
  const breaks =
    (focus
      ? state.entries.reduce(
          (total, e) =>
            total +
            (e.focusId === focus.id && e.kind === "break" ? e.to - e.from : 0),
          0,
        )
      : 0) + (active?.phase === "break" ? live : 0);
  return (
    <section aria-label="Focus Mode" className="my-5 grid gap-4">
      <h3 className="text-xl">Focus Mode</h3>
      <p>
        {target.title} · {target.project}
        {target.slot && " · " + target.slot}
      </p>
      {focus && run ? (
        <>
          <p className="flex flex-wrap items-center gap-2">
            <Badge variant={active && !active.phase ? "success" : "warning"}>
            {active?.phase === "break"
              ? "On break"
              : active
                ? "Focusing"
                : "Paused"}</Badge>
            <span className="qah-elapsed text-3xl">{duration(active?.phase === "break" ? live : worked)}</span>
          </p>
          <p>
            Focus {duration(worked)} / {focus.workMinutes} min · Breaks{" "}
            {duration(breaks)} · Break target {focus.breakMinutes} min
          </p>
          {active &&
            (active.phase
              ? live >= focus.breakMinutes * 60000
              : worked >= focus.workMinutes * 60000) && (
              <p role="status"><Badge variant="success">Duration target reached.</Badge></p>
            )}
          <div className="flex flex-wrap gap-2">
            {active && !active.phase ? (
              <>
                <Button onClick={() => send({ type: "pause", id: run.id })}>
                  Pause focus
                </Button>
                <Button onClick={() => send({ type: "break", id: run.id })}>
                  Take break
                </Button>
              </>
            ) : (
              <Button onClick={() => send({ type: "start", target, expectedFocusRunId: run.id })}>
                Resume focus
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => send({ type: "stop", id: run.id })}
            >
              End focus
            </Button>
          </div>
        </>
      ) : (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send({
              type: "start",
              target,
              focus: { workMinutes: Number(work), breakMinutes: Number(rest) },
            });
          }}
        >
          <label>
            Focus minutes{" "}
            <input
              type="number"
              min="1"
              required
              className="w-16 bg-qah-bg"
              value={work}
              onChange={(e) => setWork(e.target.value)}
            />
          </label>
          <label>
            Break minutes{" "}
            <input
              type="number"
              min="1"
              required
              className="w-16 bg-qah-bg"
              value={rest}
              onChange={(e) => setRest(e.target.value)}
            />
          </label>
          <Button>Start focus</Button>
        </form>
      )}
    </section>
  );
}
