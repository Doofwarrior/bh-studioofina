import {appendHistory} from "./workHistory";
import { z } from "zod";

const stamp = z.number().int().nonnegative().safe();
const targetSchema = z.object({
  taskId: z.string().min(1),
  projectId: z.string().optional(),
  sessionId: z.string().optional(),
  title: z.string(),
  project: z.string(),
  slot: z.string().optional(),
});
export type WorkTarget = z.infer<typeof targetSchema>;
const goals = z.object({
  workMinutes: z.number().int().positive().safe(),
  breakMinutes: z.number().int().positive().safe(),
});
export type FocusGoals = z.infer<typeof goals>;
const breakPhase = z.literal("break").optional();
const interval = z
  .object({
    id: z.string(),
    decision: z.string(),
    from: stamp,
    to: stamp,
    phase: breakPhase,
  })
  .refine((i) => i.to >= i.from);
export const timerSchema = z.object({
  version: z.literal(1),
  open: z.array(
    z.object({
      id: z.string(),
      target: targetSchema,
      focus: goals.extend({ id: z.string() }).optional(),
    }),
  ),
  selected: z.string().optional(),
  active: z
    .object({
      id: z.string(),
      from: stamp,
      checkpoint: stamp,
      owner: z.string(),
      phase: breakPhase,
    })
    .optional(),
  pending: interval.optional(),
  entries: z.array(
    z.object({
      id: z.string(),
      run: z.string().optional(),
      target: targetSchema,
      from: stamp,
      to: stamp,
      kind: z.enum(["timer", "manual", "recovered", "break"]),
      focusId: z.string().optional(),
      correction: z
        .object({
          root: z.string(),
          from: stamp,
          to: stamp,
          revision: z.string(),
          at: stamp,
        })
        .optional(),
      recordedAt: stamp,
    }),
  ),
});
export type TimerState = z.infer<typeof timerSchema>;
export const timerKey = "qah:work-timer:v1";
export function readTimer(): TimerState {
  const raw = localStorage.getItem(timerKey);
  return raw === null
    ? { version: 1, open: [], entries: [] }
    : timerSchema.parse(JSON.parse(raw));
}
export function targetKey(
  t: Pick<WorkTarget, "projectId" | "taskId" | "sessionId">,
) {
  return JSON.stringify([t.projectId, t.taskId, t.sessionId]);
}
function overlaps(
  state: TimerState,
  from: number,
  to: number,
  except?: string,
) {
  return state.entries.some(
    (entry) => entry.id !== except && entry.from < to && from < entry.to,
  );
}
function record(
  state: TimerState,
  id: string,
  from: number,
  to: number,
  kind: "timer" | "recovered" | "break",
  now: number,
) {
  if (to === from) return;
  if (to < from || overlaps(state, from, to))
    throw Error(
      "Timer interval overlaps recorded work or the clock moved backwards.",
    );
  const run = state.open.find((row) => row.id === id);
  if (!run) throw Error("Timer session missing.");
  state.entries.push({
    id: crypto.randomUUID(),
    run: id,
    focusId: run.focus?.id,
    target: run.target,
    from,
    to,
    kind,
    recordedAt: now,
  });
}
export type Entry = TimerState["entries"][number];
export type Correction = {
  type: "correct";
  id: string;
  projectId?: string;
  revision?: string;
} & (
  | { operation: "edit"; from: number; to: number }
  | { operation: "split"; at: number }
  | { operation: "remove" }
);
function correct(state: TimerState, action: Correction, now: number) {
  const index = state.entries.findIndex(
    (e) => e.id === action.id && e.target.projectId === action.projectId,
  );
  const entry = state.entries[index];
  if (!entry || entry.correction?.revision !== action.revision)
    throw Error("This record changed. Reopen it before correcting.");
  if (action.operation === "remove") {
    state.entries.splice(index, 1);
    return;
  }
  const provenance = {
    root: entry.correction?.root ?? entry.id,
    from: entry.correction?.from ?? entry.from,
    to: entry.correction?.to ?? entry.to,
    revision: crypto.randomUUID(),
    at: now,
  };
  if (action.operation === "split") {
    if (
      !Number.isSafeInteger(action.at) ||
      action.at <= entry.from ||
      action.at >= entry.to
    )
      throw Error("Split inside the recorded interval.");
    state.entries.splice(
      index,
      1,
      { ...entry, to: action.at, correction: provenance },
      {
        ...entry,
        id: crypto.randomUUID(),
        from: action.at,
        correction: provenance,
      },
    );
    return;
  }
  const { from, to } = action;
  if (
    !Number.isSafeInteger(from) ||
    !Number.isSafeInteger(to) ||
    from < 0 ||
    from >= to ||
    to > now
  )
    throw Error("Enter a positive interval ending in the past.");
  if (
    overlaps(state, from, to, entry.id) ||
    (state.active && state.active.from < to)
  )
    throw Error("Correction overlaps recorded or running time.");
  state.entries[index] = { ...entry, from, to, correction: provenance };
}
export type TimerAction =
  | { type: "start"; target: WorkTarget; focus?: FocusGoals; expectedFocusRunId?: string }
  | { type: "break"; id: string }
  | Correction
  | { type: "pause" | "stop"; id: string }
  | { type: "recover"; id: string; include: boolean }
  | { type: "manual"; target: WorkTarget; from: number; to: number }
  | { type: "check" };

// All changes are made to a freshly read snapshot under the same origin-wide Web Lock.
export function applyTimer(
  state: TimerState,
  action: TimerAction,
  now: number,
  owner: string,
  ownerAlive: boolean,
) {
  const active = state.active;
  if (active && !ownerAlive) {
    record(
      state,
      active.id,
      active.from,
      active.checkpoint,
      active.phase ?? "timer",
      now,
    );
    state.pending = {
      decision: crypto.randomUUID(),
      phase: active.phase,
      id: active.id,
      from: active.checkpoint,
      to: Math.max(now, active.checkpoint),
    };
    delete state.active;
    return; // Persist recovery before accepting another command.
  }
  if (action.type === "check") {
    if (active?.owner === owner && now - active.checkpoint >= 10000)
      active.checkpoint = now;
    return;
  }
  if (action.type === "recover") {
    const gap = state.pending;
    if (gap?.decision !== action.id) return;
    if (action.include)
      record(state, gap.id, gap.from, gap.to, gap.phase ?? "recovered", now);
    delete state.pending;
    return;
  }
  if (state.pending) throw Error("Review interrupted time first.");
  if (action.type === "correct") {
    correct(state, action, now);
    return;
  }
  if (action.type === "start" && action.focus) goals.parse(action.focus);
  if (action.type === "manual") {
    const { from, to, target } = action;
    if (
      !Number.isSafeInteger(from) ||
      !Number.isSafeInteger(to) ||
      from < 0 ||
      from >= to ||
      to > now
    )
      throw Error("Enter a positive duration ending in the past.");
    if (overlaps(state, from, to) || (active && active.from < to))
      throw Error(
        "Overlaps recorded or running work. Adjust the start or duration.",
      );
    state.entries.push({
      id: crypto.randomUUID(),
      target,
      from,
      to,
      kind: "manual",
      recordedAt: now,
    });
    return;
  }
  const run =
    action.type === "start"
      ? state.open.find(
          (row) => targetKey(row.target) === targetKey(action.target),
        )
      : state.open.find((row) => row.id === action.id);
  if (
    action.type === "start" && action.expectedFocusRunId !== undefined &&
    (!run?.focus || run.id !== action.expectedFocusRunId)
  ) throw Error("This focus session has ended or changed. Reopen timer details to continue.");
  if (
    action.type === "break" &&
    (!run?.focus || active?.id !== run.id || active.phase === "break")
  )
    return;
  if (
    action.type === "start" &&
    active &&
    active.id === run?.id &&
    !active.phase &&
    (!action.focus || run.focus)
  )
    return;
  if (action.type !== "start" && !run) return;
  if (active && (action.type === "start" || active.id === run?.id)) {
    if (now < active.checkpoint)
      throw Error("The clock moved backwards. Check the system time.");
    record(state, active.id, active.from, now, active.phase ?? "timer", now);
    delete state.active;
  }
  if (action.type === "break") {
    state.active = {
      id: action.id,
      from: now,
      checkpoint: now,
      owner,
      phase: "break",
    };
    return;
  }
  if (action.type === "start") {
    if (state.entries.some((entry) => entry.to > now))
      throw Error("Recorded work ends after the current system time.");
    const next = run ?? { id: crypto.randomUUID(), target: action.target };
    if (action.focus && !next.focus)
      next.focus = { ...action.focus, id: crypto.randomUUID() };
    if (!run) state.open.push(next);
    state.selected = next.id;
    state.active = { id: next.id, from: now, checkpoint: now, owner };
  } else if (action.type === "stop") {
    state.open = state.open.filter((row) => row.id !== action.id);
    if (state.selected === action.id)
      state.selected = state.active?.id ?? state.open.at(-1)?.id;
  }
}
export function elapsed(
  state: TimerState,
  id: string,
  now: number,
  focusId?: string,
) {
  const saved = state.entries.reduce(
    (ms, e) =>
      ms +
      (e.run === id && (!focusId || e.focusId === focusId) && e.kind !== "break"
        ? e.to - e.from
        : 0),
    0,
  );
  return (
    saved +
    (state.active?.id === id && !state.active.phase
      ? Math.max(state.active.checkpoint, now) - state.active.from
      : 0)
  );
}
const livePrefix = "qah:timer:document:";
export function timerConnection(
  onState: (s: TimerState) => void,
  onError: (msg: string) => void,
) {
  const owner = crypto.randomUUID();
  let closed = false;
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let ready = () => {};
  const registered = new Promise<void>((resolve) => {
    ready = resolve;
  });
  const report = (e: unknown) =>
    onError(e instanceof Error ? e.message : "Timer storage unavailable.");
  if (navigator.locks)
    void navigator.locks
      .request(livePrefix + owner, async () => {
        ready();
        await held;
      })
      .catch((e) => {
        ready();
        report(e);
      });
  async function send(action: TimerAction) {
    if (!navigator.locks)
      throw Error(
        "Work timers require browser Web Locks on localhost or HTTPS.",
      );
    await registered;
    await navigator.locks.request(timerKey, async () => {
      if (closed) return;
      const state = readTimer(),
        before = JSON.stringify(state);
      const alive =
        !state.active ||
        (await navigator.locks.query()).held?.some(
          (lock) => lock.name === livePrefix + state.active!.owner,
        );
      applyTimer(state, action, Date.now(), owner, !!alive);
      if (before !== JSON.stringify(state)){
        localStorage.setItem(timerKey, JSON.stringify(state));
        const previous:TimerState=JSON.parse(before);
        if(!alive || action.type!=="check"){
          const entry=action.type==="correct"?previous.entries.find(e=>e.id===action.id):undefined;
          const runId=!alive?previous.active?.id:action.type==="recover"?previous.pending?.id:"id" in action?action.id:undefined;
          const target=!alive?previous.open.find(r=>r.id===runId)?.target:"target" in action?action.target:entry?.target??previous.open.find(r=>r.id===runId)?.target;
          const previousIds=new Set(previous.entries.map(e=>e.id));
          if(target)appendHistory({projectId:target.projectId,taskId:target.taskId,slot:target.slot,title:target.title,
            action:!alive?"Timer interrupted":action.type==="correct"?"Time "+action.operation:"Timer "+action.type,
            detail:JSON.stringify({action,previousEntry:entry,previousRun:previous.active?.id,currentRun:state.active?.id,added:state.entries.filter(e=>!previousIds.has(e.id)),updated:entry&&state.entries.find(e=>e.id===entry.id)})});
        }
      }
      if (!closed) onState(state);
      if (!alive && action.type !== "check")
        throw Error("Review the interrupted interval, then retry this action.");
    });
  }
  const check = () => void send({ type: "check" }).catch(report);
  const sync = (e: StorageEvent) => {
    if (e.key === timerKey || e.key === null) check();
  };
  check();
  const interval = window.setInterval(check, 10000);
  window.addEventListener("storage", sync);
  return {
    send,
    close() {
      closed = true;
      release();
      window.clearInterval(interval);
      window.removeEventListener("storage", sync);
    },
  };
}
