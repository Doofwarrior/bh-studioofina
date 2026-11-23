import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
const { outputFiles } = await build({
  stdin: {
    contents:
      "export * from './src/features/calendar/workInsights';export * from './src/lib/workHistory';export * from './src/lib/calendar';export * from './src/lib/planner';export * from './src/lib/workTimer'",
    resolveDir: process.cwd(),
  },
  format: "cjs",
  bundle: true,
  write: false,
});
function open(data, fail = false) {
  const module = { exports: {} };
  new Function("module", "localStorage", outputFiles[0].text)(module, {
    get length() {
      return data.size;
    },
    key: (i) => [...data.keys()][i],
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      if (fail) throw Error("storage unavailable");
      data.set(k, v);
    },
  });
  return module.exports;
}
const projects = [{ id: "p", name: "Film" }];
test("analytics counts scoped occurrences once and clips planned and corrected actual time to local days", () => {
  const data = new Map(),
    a = open(data),
    f = {
      ...a.initial,
      from: "2024-02-29",
      to: "2024-02-29",
      project: "project:p",
    };
  const root = a.createPlannerItem(
    { title: "Assembly", dueDate: "2024-02-28" },
    "p",
  );
  a.startSeries(
    root.id,
    "p",
    root.dueDate,
    { frequency: "daily", interval: 1, until: "2024-03-01" },
    [],
  );
  const occurrence = a.listPlannerItems("p")[1];
  a.updatePlannerItem(occurrence.id, { status: "done" }, "p");
  const late = a.createPlannerItem(
    { title: "Late", dueDate: "2024-02-29T07:00" },
    "p",
  );
  a.createPlannerItem({ title: "Elsewhere", dueDate: "2024-02-29" });
  const ms = +new Date("2024-02-29T00:00"),
    hour = 3600000;
  const session = a.saveCalendarEntry(
    { kind: "project", projectId: "p" },
    {
      kind: "session",
      taskId: occurrence.id,
      startsAt: new Date(ms - hour).toISOString(),
      endsAt: new Date(ms + hour).toISOString(),
    },
  );
  const state = a.readTimer(),
    target = {
      taskId: occurrence.id,
      projectId: "p",
      project: "Film",
      title: "Assembly",
    };
  const act = (action, now) => a.applyTimer(state, action, now, "tab", true);
  act(
    { type: "manual", target, from: ms - hour, to: ms + hour },
    ms + 2 * hour,
  );
  const entry = state.entries[0],
    ref = { type: "correct", id: entry.id, projectId: "p" };
  act(
    { ...ref, operation: "edit", from: ms, to: ms + hour / 2 },
    ms + 2 * hour,
  );
  act(
    {
      ...ref,
      revision:
        entry.correction?.revision ?? state.entries[0].correction.revision,
      operation: "split",
      at: ms + hour / 4,
    },
    ms + 2 * hour,
  );
  state.entries.push({
    ...state.entries[0],
    kind: "break",
    id: "break",
    from: ms + hour,
    to: ms + 2 * hour,
  });
  data.set(a.timerKey, JSON.stringify(state));
  const [r] = a.analytics(projects, f, new Date(ms + 12 * hour));
  assert.deepEqual(
    [
      r.count,
      r.done,
      r.overdue,
      r.planned,
      r.actual,
      r.completedTime,
      r.activeTime,
    ],
    [2, 1, 1, hour, hour / 2, hour / 2, 0],
  );
  const rows = a.workResults(projects, { ...f, status: "done" }, "Film");
  assert(
    rows.some(
      (v) =>
        new URL(v.url, "http://local").searchParams.get("task") ===
        occurrence.id,
    ),
  );
  assert(
    rows.some(
      (v) =>
        new URL(v.url, "http://local").searchParams.get("item") === session.id,
    ),
  );
  assert(!rows.some((v) => v.title === late.title));
});
test("history begins with real successful changes and survives deletion, independent writers and reload", () => {
  const legacy = {
    id: "legacy",
    title: "Legacy",
    notes: "",
    status: "todo",
    updatedAt: "old",
    createdAt: "old",
  };
  const data = new Map([["qah:planner", JSON.stringify([legacy])]]);
  const a = open(data),
    b = open(data);
  assert.deepEqual(a.listHistory(), []);
  a.updatePlannerItem("legacy", { status: "done" });
  b.updatePlannerItem("legacy", { status: "done" });
  assert.equal(b.listHistory().length, 1);
  assert.throws(() =>
    open(data, true).updatePlannerItem("legacy", { title: "Failed" }),
  );
  const task = b.createPlannerItem({ title: "Production" }, "p");
  a.changeSubtask(task.id, { kind: "add", title: "Review" }, "p");
  a.deletePlannerItem(task.id, "p");
  const reloaded = open(data),
    events = reloaded.filteredHistory(projects, {
      ...a.initial,
      project: "project:p",
      action: "Task deleted",
    });
  assert.equal(events.length, 1);
  assert.equal(events[0].taskId, task.id);
  assert.equal(events[0].title, "Production");
  assert.equal(reloaded.listHistory().length, 4);
  assert.equal(new Set(reloaded.listHistory().map((h) => h.id)).size, 4);
});
