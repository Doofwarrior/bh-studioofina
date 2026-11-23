import { Badge } from "@/components/ui/Badge";
import { FocusMode } from "./FocusMode";
import { EntryCorrection } from "./EntryCorrection";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { confirmPrerequisites } from "@/lib/planner";
import {
  elapsed,
  targetKey,
  timerConnection,
  type TimerAction,
  type TimerState,
  type WorkTarget,
} from "@/lib/workTimer";
import { timerChoices, validateTarget, type Choice } from "./catalog";
import { MiniTimer } from "./MiniTimer";
import {
  duration,
  prefKey,
  readPrefs,
  type Preferences,
  type Mode,
} from "./display";

const field = "bg-qah-bg border border-qah-border px-2 py-1";
const empty: TimerState = { version: 1, open: [], entries: [] };
const label = (t: WorkTarget) =>
  [t.project, t.title, t.slot].filter(Boolean).join(" · ");
const dateTime = (ms: number) => new Date(ms).toLocaleString();
const choiceLabel = (c: Choice) =>
  label(c.target) +
  (c.start !== undefined ? " · Session " + dateTime(c.start) : "");
function localInput() {
  const d = new Date(Date.now() - 30 * 60000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function WorkTimer() {
  const [focused, setFocused] = useState(false);
  const [state, setState] = useState(empty),
    [now, setNow] = useState(Date.now);
  const [prefs, setPrefs] = useState<Preferences>(readPrefs);
  const [error, setError] = useState(""),
    [details, setDetails] = useState(false);
  const [catalog, setCatalog] = useState<
    Awaited<ReturnType<typeof timerChoices>>
  >({ projects: [], choices: [] });
  const [key, select] = useState(""),
    [project, selectProject] = useState("");
  const [from, setFrom] = useState(localInput),
    [minutes, setMinutes] = useState("30");
  const [notices, setNotices] = useState<
    { key: string; choice: Choice; end: boolean }[]
  >([]);
  const [revision, refresh] = useState(0);
  const conn = useRef<ReturnType<typeof timerConnection> | null>(null);
  const modal = useRef<HTMLDialogElement>(null);
  const location = useLocation();
  const lastScan = useRef(Date.now());
  const selected = catalog.choices.find((c) => targetKey(c.target) === key);
  const run = state.open.find((r) => r.id === state.selected);
  const current = state.open.find((r) => targetKey(r.target) === key);
  const matchesSelection = (t: WorkTarget) =>
    selected &&
    t.taskId === selected.target.taskId &&
    t.projectId === selected.target.projectId &&
    (!selected.target.sessionId || t.sessionId === selected.target.sessionId);
  const entries = state.entries.filter(
    (e) => e.kind !== "break" && matchesSelection(e.target),
  );
  const ownTimers = state.open.filter(
    (r) => r.target.projectId === (project || undefined),
  );
  const ownEntries = state.entries.filter(
    (e) => e.target.projectId === (project || undefined),
  );
  const total =
    entries.reduce((n, e) => n + e.to - e.from, 0) +
    (state.active && !state.active.phase && run && matchesSelection(run.target)
      ? Math.max(state.active.checkpoint, now) - state.active.from
      : 0);
  const updatePrefs = (patch: Partial<Preferences>) => {
    try {
      const next = { ...readPrefs(), ...patch };
      localStorage.setItem(prefKey, JSON.stringify(next));
      setPrefs(next);
    } catch {
      setError("Could not save mini timer preferences.");
    }
  };
  const show = useCallback(
    (target?: Pick<WorkTarget, "projectId" | "taskId" | "sessionId">) => {
      if (target) {
        select(targetKey(target));
        selectProject(target.projectId ?? "");
      }
      setFocused(false);
      refresh((n) => n + 1);
      setDetails(true);
    },
    [],
  );
  useEffect(() => {
    const c = timerConnection(setState, setError);
    conn.current = c;
    const open = (e: Event) => show((e as CustomEvent).detail);
    const reload = () => refresh((n) => n + 1);
    const storage = (e: StorageEvent) => {
      if (e.key === prefKey) setPrefs(readPrefs());
      if (
        !e.key ||
        e.key.startsWith("qah:calendar:") ||
        e.key.startsWith("qah:planner")
      )
        reload();
    };
    window.addEventListener("qah:timer-details", open);
    window.addEventListener("qah:calendar-changed", reload);
    window.addEventListener("storage", storage);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      c.close();
      window.clearInterval(clock);
      window.removeEventListener("qah:timer-details", open);
      window.removeEventListener("storage", storage);
      window.removeEventListener("qah:calendar-changed", reload);
    };
  }, [show]);
  useEffect(() => {
    let live = true;
    timerChoices()
      .then((result) => {
        if (live) setCatalog(result);
      })
      .catch(() => {
        if (live) setError("Timer task list unavailable.");
      });
    return () => {
      live = false;
    };
  }, [location.key, revision]);
  useEffect(() => {
    const since = lastScan.current;
    lastScan.current = Math.max(now, since);
    const alerts = catalog.choices.flatMap((choice) => {
      if (choice.start === undefined || choice.end === undefined) return [];
      const end = choice.end > since && choice.end <= now;
      const start =
        prefs.remind &&
        choice.start > since &&
        choice.start <= now &&
        choice.end > now;
      return end || start
        ? [
            {
              key:
                targetKey(choice.target) +
                String(end) +
                String(end ? choice.end : choice.start),
              choice,
              end,
            },
          ]
        : [];
    });
    if (alerts.length)
      setNotices((old) => [
        ...old,
        ...alerts.filter((a) => !old.some((n) => a.key === n.key)),
      ]);
  }, [now, catalog, prefs.remind]);
  const recoveryId = state.pending?.decision;
  useEffect(() => {
    if (recoveryId) setDetails(true);
  }, [recoveryId]); // Interruptions require an explicit decision.
  useEffect(() => {
    if (details) modal.current?.showModal();
    else modal.current?.close();
  }, [details]);

  async function send(action: TimerAction) {
    try {
      if (action.type === "start" || action.type === "manual")
        validateTarget(action.target, catalog.projects);
      if (
        action.type === "start" &&
        !confirmPrerequisites(
          action.target,
          catalog.projects,
          "Start work timer",
        )
      )
        return;
      await conn.current?.send(action);
      setError("");
      setNow(Date.now());
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Timer update failed.";
      setError(message);
      return message;
    }
  }
  function controls(id: string, target: WorkTarget) {
    return (
      <>
        <Button
          size="sm"
          onClick={() =>
            void send(
              state.active?.id === id
                ? { type: "pause", id }
                : { type: "start", target },
            )
          }
        >
          {state.active?.id === id ? "Pause" : "Resume"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void send({ type: "stop", id })}
        >
          Stop
        </Button>
      </>
    );
  }
  return (
    <>
      <button className="text-xs" onClick={() => show(run?.target)}>
        Work timer
      </button>
      <MiniTimer
        state={state}
        prefs={prefs}
        now={now}
        details={() => show(run?.target)}
        toggle={() => {
          if (run)
            void send(
              state.active
                ? { type: "pause", id: run.id }
                : { type: "start", target: run.target },
            );
        }}
        move={(x, y) => updatePrefs({ position: { x, y } })}
      />
      {!details && (notices.length > 0 || error) && (
        <div
          className="fixed top-12 right-2 z-40 max-w-sm border border-qah-border bg-qah-surface p-2 text-sm"
          role="status"
        >
          {error ||
            (notices[0].end ? "Session ended · " : "Start work? · ") +
              label(notices[0].choice.target)}{" "}
          <Button size="sm" onClick={() => show(notices[0]?.choice.target)}>
            Review
          </Button>
        </div>
      )}
      {details && (
        <dialog
          ref={modal}
          aria-label="Work timer details"
          onCancel={() => setDetails(false)}
          className="qah-panel-enter m-auto max-h-[90vh] w-[min(42rem,95vw)] overflow-auto border border-qah-border bg-qah-surface p-4 text-qah-text backdrop:bg-black/70"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl">Work timer</h2>
            <Button size="sm" onClick={() => setDetails(false)}>
              Close
            </Button>
          </div>
          {error && <p role="alert"><Badge variant="danger">{error}</Badge></p>}
          {state.pending && (
            <section className="my-3 border border-qah-accent p-2">
              <h3>Review interrupted time</h3>
              <p>
                {run && label(run.target)} · {dateTime(state.pending.from)} –{" "}
                {dateTime(state.pending.to)} (
                {duration(state.pending.to - state.pending.from)}). Count this
                gap as {state.pending.phase === "break" ? "break time" : "work"}
                ?
              </p>
              {[true, false].map((include) => (
                <Button
                  key={String(include)}
                  size="sm"
                  onClick={() =>
                    void send({
                      type: "recover",
                      id: state.pending!.decision,
                      include,
                    })
                  }
                >
                  {include ? "Include gap" : "Exclude gap"}
                </Button>
              ))}
            </section>
          )}
          {focused && selected && !state.pending ? (
            <>
              <FocusMode
                state={state}
                target={selected.target}
                run={current}
                now={now}
                send={(a) => void send(a)}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setFocused(false)}
              >
                Timer details
              </Button>
            </>
          ) : (
            <>
              {notices.map((n) => (
                <div key={n.key} role="status">
                  {n.end
                    ? "Scheduled session ended"
                    : "Scheduled session starting"}{" "}
                  · {choiceLabel(n.choice)}
                  {!n.end && !state.pending && (
                    <Button
                      size="sm"
                      onClick={() => {
                        void send({ type: "start", target: n.choice.target });
                        setNotices((list) =>
                          list.filter((i) => i.key !== n.key),
                        );
                      }}
                    >
                      Start work
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setNotices((list) => list.filter((i) => i.key !== n.key))
                    }
                  >
                    Dismiss
                  </Button>
                </div>
              ))}
              <section className="my-3 grid gap-2">
                <label>
                  Timer project{" "}
                  <select
                    className={field}
                    value={project}
                    onChange={(e) => {
                      selectProject(e.target.value);
                      select("");
                    }}
                  >
                    <option value="">Workspace</option>
                    {catalog.projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Task or scheduled session{" "}
                  <select
                    className={field + " max-w-full"}
                    value={key}
                    onChange={(e) => select(e.target.value)}
                  >
                    <option value="">Choose a task or session</option>
                    {catalog.choices
                      .filter((c) => (c.target.projectId ?? "") === project)
                      .map((c) => (
                        <option
                          key={targetKey(c.target)}
                          value={targetKey(c.target)}
                        >
                          {choiceLabel(c)}
                        </option>
                      ))}
                  </select>
                </label>
                {selected && (
                  <>
                    <p>
                      Actual <span className="qah-elapsed">{duration(total)}</span>
                      {selected.start !== undefined &&
                        selected.end !== undefined &&
                        " · Planned " + duration(selected.end - selected.start)}
                    </p>
                    {!state.pending && (
                      <div className="flex gap-2">
                        {current ? (
                          controls(current.id, selected.target)
                        ) : (
                          <Button
                            onClick={() =>
                              void send({
                                type: "start",
                                target: selected.target,
                              })
                            }
                          >
                            Start
                          </Button>
                        )}
                      </div>
                    )}
                    {!state.pending && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setFocused(true)}
                      >
                        Focus Mode
                      </Button>
                    )}
                    <form
                      className="flex flex-wrap items-end gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const time = new Date(from).getTime();
                        void send({
                          type: "manual",
                          target: selected.target,
                          from: time,
                          to: time + Number(minutes) * 60000,
                        });
                      }}
                    >
                      <label>
                        Actual start{" "}
                        <input
                          className={field}
                          type="datetime-local"
                          required
                          value={from}
                          onChange={(e) => setFrom(e.target.value)}
                        />
                      </label>
                      <label>
                        Worked minutes{" "}
                        <input
                          className={field + " w-20"}
                          type="number"
                          min="1"
                          required
                          value={minutes}
                          onChange={(e) => setMinutes(e.target.value)}
                        />
                      </label>
                      <Button size="sm" disabled={!!state.pending}>
                        Log time
                      </Button>
                    </form>
                  </>
                )}
              </section>
              {ownTimers.length > 0 && (
                <section>
                  <h3>Open timers</h3>
                  {ownTimers.map((r) => (
                    <div
                      className="flex flex-wrap items-center gap-2"
                      key={r.id}
                    >
                      {label(r.target)} ·{" "}
                      {r.target.sessionId ? "Scheduled session · " : ""}
                      <span className="qah-elapsed">{duration(elapsed(state, r.id, now))}</span>
                      <Badge variant={r.id === state.active?.id && !state.active.phase ? "success" : "warning"}>
                      {r.id === state.active?.id
                        ? state.active.phase
                          ? "On break"
                          : "Running"
                        : "Paused"}</Badge>
                      {!state.pending && controls(r.id, r.target)}
                    </div>
                  ))}
                </section>
              )}
              <details>
                <summary>
                  Time records ·{" "}
                  {project
                    ? catalog.projects.find((p) => p.id === project)?.name
                    : "Workspace"}{" "}
                  ({ownEntries.length})
                </summary>
                <ul>
                  {ownEntries
                    .slice()
                    .reverse()
                    .map((e) => (
                      <li key={e.id}>
                        {label(e.target)} ·{" "}
                        {e.target.sessionId ? "Scheduled session · " : ""}
                        {e.kind} · {dateTime(e.from)} – {dateTime(e.to)} ·{" "}
                        {duration(e.to - e.from)}
                        {e.correction && (
                          <small>
                            {" "}
                            · Corrected (original {dateTime(
                              e.correction.from,
                            )}{" "}
                            – {dateTime(e.correction.to)})
                          </small>
                        )}
                        {!state.pending && (
                          <EntryCorrection entry={e} save={send} />
                        )}
                      </li>
                    ))}
                </ul>
              </details>
              <label className="mt-3 block">
                Mini timer visibility{" "}
                <select
                  className={field}
                  value={prefs.mode}
                  onChange={(e) =>
                    updatePrefs({ mode: e.target.value as Mode })
                  }
                >
                  <option value="always">Always Visible</option>
                  <option value="active">Active Sessions Only</option>
                  <option value="minimized">Minimized</option>
                </select>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={prefs.remind}
                  onChange={(e) => updatePrefs({ remind: e.target.checked })}
                />{" "}
                Remind me at scheduled starts
              </label>
              <p className="mt-3 text-xs text-qah-text-muted">
                Time records stay in this browser profile on this site. Clearing
                site data removes them. Reminders appear while QAL’AT is open.
                After interruption, review time since the last checkpoint before
                resuming.
              </p>
            </>
          )}
        </dialog>
      )}
    </>
  );
}
