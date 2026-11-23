import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
const { outputFiles } = await build({
  stdin: {
    contents:
      "export * from './src/lib/planner'; export * from './src/lib/taskReminders'",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: "cjs",
});
function open(data, notification) {
  const module = { exports: {} };
  new Function("module", "localStorage", "Notification", outputFiles[0].text)(
    module,
    { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) },
    notification,
  );
  return module.exports;
}
test("legacy task detail edits preserve scope and identity, reject stale saves and invalid input", () => {
  const data = new Map(),
    api = open(data),
    base = api.createPlannerItem({ title: "Before" });
  const input = {
    title: "After",
    notes: "Cut",
    status: "doing",
    dueDate: "2026-11-20T12:00",
    referenceLinks: ["https://example.org"],
    reminders: [{ id: "r", minutes: 5, enabled: true, desktop: false }],
  };
  assert.throws(() => api.saveTaskDetails(base, input, "other"), /changed/);
  assert.throws(
    () => api.saveTaskDetails(base, { ...input, dueDate: "2026-02-30" }),
    /date/i,
  );
  api.saveTaskDetails(base, input);
  assert.throws(() => api.saveTaskDetails(base, input), /changed/);
  const saved = open(data).listPlannerItems()[0];
  assert.deepEqual(saved.reminders, input.reminders);
  assert.equal(saved.id, base.id);
  api.saveTaskDetails(saved, {
    ...input,
    reminders: [{ ...input.reminders[0], enabled: false, minutes: 10 }],
  });
  assert.equal(open(data).listPlannerItems()[0].reminders[0].enabled, false);
});
test("missed deadline and session reminders deliver once across reloads and stay scoped to occurrence and project", () => {
  const data = new Map(),
    anchor = "2026-11-20T10:00",
    now = new Date(anchor).getTime();
  const rule = { id: "r", enabled: true, minutes: 10, desktop: false };
  const due = (scope, id, r, time) =>
    open(data).dueReminder(scope, id, r, anchor, time);
  assert.equal(due("p", "o1", rule, now - 600001), false);
  assert.equal(due("p", "o1", rule, now + 86400000), true);
  assert.equal(due("p", "o1", rule, now + 86400000), false);
  assert.equal(due("p", "o2", rule, now), true);
  assert.equal(due("q", "o1", rule, now), true);
  assert.equal(due("p", "o1", { ...rule, sessionId: "s1" }, now), true);
  assert.equal(
    due("p", "o2", { ...rule, enabled: false, minutes: 3 }, now),
    false,
  );
});
test("desktop notification permission is requested explicitly and denied or unsupported delivery falls back", async () => {
  let requests = 0,
    deliveries = 0;
  class Desktop {
    static permission = "default";
    static requestPermission() {
      requests++;
      return (this.permission = "granted");
    }
    constructor() {
      deliveries++;
    }
  }
  const api = open(new Map(), Desktop);
  api.notifyDesktop("Task");
  assert.equal(requests, 0);
  assert.equal(deliveries, 0);
  await api.requestDesktop();
  api.notifyDesktop("Task");
  assert.equal(deliveries, 1);
  Desktop.permission = "denied";
  await api.requestDesktop();
  api.notifyDesktop("Task");
  assert.equal(requests, 1);
  assert.equal(deliveries, 1);
  assert.equal(await open(new Map()).requestDesktop(), "unsupported");
});
