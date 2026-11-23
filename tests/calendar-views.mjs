import { build } from "esbuild";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { test } from "node:test";

const bundle = await build({
  stdin: {
    contents:
      "export * from './src/features/calendar/scheduling'; export * from './src/features/calendar/viewModel'; export * from './src/lib/calendar'; export * from './src/lib/planner'",
    resolveDir: process.cwd(),
  },
  platform: "node",
  format: "cjs",
  bundle: true,
  packages: "external",
  write: false,
});
const module = { exports: {} };
const data = new Map();
const storage = {
  get length() {
    return data.size;
  },
  key(i) {
    return [...data.keys()][i];
  },
  getItem(k) {
    return data.get(k) ?? null;
  },
  setItem(k, v) {
    data.set(k, v);
  },
};
new Function("require", "module", "localStorage", bundle.outputFiles[0].text)(
  createRequire(import.meta.url),
  module,
  storage,
);
const api = module.exports;
test("month and week align to configured start across year and leap-day boundaries", () => {
  const week = api.visibleDays(new Date(2026, 0, 1), "Week", 1).map(api.dayKey);
  assert.equal(week[0], "2025-12-29");
  assert.equal(week.at(-1), "2026-01-04");
  const month = api
    .visibleDays(new Date(2024, 1, 29), "Month", 0)
    .map(api.dayKey);
  assert.ok(month.includes("2024-02-29"));
  assert.equal(month.length % 7, 0);
  assert.equal(
    api.dayKey(api.shift(new Date(2024, 0, 31), "Month", 1)),
    "2024-02-01",
  );
});
test("scoped display resolves session title, civil deadlines, overnight and exclusive all-day ends", () => {
  const scope = { kind: "project", projectId: "test" };
  const task = api.createPlannerItem(
    { title: "Edit", dueDate: "2026-11-20" },
    scope.projectId,
  );
  api.saveCalendarEntry(scope, {
    kind: "session",
    taskId: task.id,
    startsAt: new Date(2026, 10, 20, 23).toISOString(),
    endsAt: new Date(2026, 10, 21, 1).toISOString(),
  });
  api.saveCalendarEntry(scope, {
    kind: "event",
    title: "Retreat",
    allDay: true,
    startsAt: "2026-11-19T00:00:00+06:00",
    endsAt: "2026-11-21T00:00:00+06:00",
  });
  const rows = api.readItems(scope, "Test");
  const active = (day) =>
    rows
      .filter((row) => api.onDay(row, new Date(2026, 10, day)))
      .map((r) => r.kind)
      .sort();
  assert.deepEqual(active(19), ["Event"]);
  assert.deepEqual(active(20), ["Deadline", "Event", "Session"]);
  assert.deepEqual(active(21), ["Session"]);
  assert.equal(rows.find((r) => r.kind === "Session").title, "Edit");
  assert.deepEqual(api.readItems({ kind: "workspace" }, "Workspace"), []);
});

test("scheduling and Dashboard preserve scoped identities, task metadata and overdue dates", () => {
  data.clear();
  const p = { id: "project-a", name: "Film" };
  const source = { projectId: p.id, name: p.name };
  const task = api.createPlannerItem(
    { title: "Cut", notes: "Use assembly" },
    p.id,
  );
  api.updatePlannerItem(task.id, { status: "doing" }, p.id);
  const [target] = api.unscheduled(source);
  assert.equal(target.task.id, task.id);
  assert.deepEqual(api.unscheduled({ name: "Workspace" }), []);
  const now = new Date(2026, 10, 20, 11);
  const session = api.saveSession(target, +now, 60);
  assert.deepEqual(api.unscheduled(source), []);
  assert.deepEqual(api.listPlannerItems(p.id)[0].dueDate, undefined);
  const before = api.readItems(api.scope(source), source.name);
  assert.equal(api.conflicts(before, +now, 30).length, 1);
  assert.equal(api.conflicts(before, +now + 3600000, 15).length, 0);
  assert.equal(api.conflicts(before, +now, 30, before[0]).length, 0);
  api.saveSession(target, +now + 60000, 30, session.id);
  api.setDeadline(target, "2026-11-19", "15:30");
  const rows = api.todaysWork([p], now);
  assert.deepEqual(
    rows.map((r) => r.kind),
    ["Deadline", "Session"],
  );
  assert.equal(rows[1].end - rows[1].start, 30 * 60000);
  const [saved] = api.listPlannerItems(p.id);
  assert.deepEqual(
    [saved.id, saved.notes, saved.status, saved.dueDate],
    [task.id, "Use assembly", "doing", "2026-11-19T15:30"],
  );
  api.updatePlannerItem(task.id, { status: "done" }, p.id);
  assert.deepEqual(
    api.todaysWork([p], now).map((r) => r.status),
    ["done"],
  );
});
