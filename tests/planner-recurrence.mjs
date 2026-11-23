import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
const bundle = await build({
  stdin: {
    contents:
      "export * from './src/lib/planner'; export * from './src/lib/recurrence'; export * from './src/features/calendar/scheduling'",
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: "cjs",
  platform: "node",
  write: false,
});
function open(data = new Map()) {
  const module = { exports: {} };
  const storage = {
    get length() {
      return data.size;
    },
    key: (i) => [...data.keys()][i],
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
  };
  new Function("module", "localStorage", bundle.outputFiles[0].text)(
    module,
    storage,
  );
  return module.exports;
}
const daily = { frequency: "daily", interval: 1 };
const project = "film";
function fixture() {
  const data = new Map();
  const api = open(data);
  const legacy = api.createPlannerItem({ title: "Legacy" });
  const original = data.get("qah:planner");
  const root = api.createPlannerItem(
    { title: "Edit", dueDate: "2024-02-28T09:00" },
    project,
  );
  api.changeSubtask(root.id, { kind: "add", title: "Mix" }, project);
  return { api, data, root, original, legacy };
}
test("bounded civil recurrence clamps month ends, includes leap days, end dates and selected weekdays", () => {
  const api = open();
  const slots = (start, rule, from, to) => api.slots(start, rule, from, to);
  assert.deepEqual(
    slots(
      "2024-01-31",
      { frequency: "monthly", interval: 1 },
      "2024-02-01",
      "2024-03-31",
    ),
    ["2024-02-29", "2024-03-31"],
  );
  assert.deepEqual(
    slots(
      "2024-02-29",
      { frequency: "monthly", interval: 12 },
      "2025-02-01",
      "2025-03-01",
    ),
    ["2025-02-28"],
  );
  assert.deepEqual(
    slots(
      "2024-12-30",
      {
        frequency: "weekly",
        interval: 2,
        weekdays: [1, 3],
        until: "2025-01-13",
      },
      "2024-12-30",
      "2025-01-30",
    ),
    ["2024-12-30", "2025-01-01", "2025-01-13"],
  );
  assert.deepEqual(
    slots("2024-03-09", { ...daily, interval: 2 }, "2024-03-09", "2024-03-13"),
    ["2024-03-09", "2024-03-11", "2024-03-13"],
  );
  assert.throws(
    () => slots("2024-01-01", daily, "2024-01-01", "2030-01-01"),
    /range/i,
  );
});
test("scoped series keeps first task identity and gives each slot independent manual status and progress", () => {
  const { api, data, root, original } = fixture();
  api.startSeries(root.id, project, root.dueDate, daily, []);
  const rows = api.listPlannerItems(project);
  assert.equal(rows.length, 31);
  const second = rows.find((t) => t.dueDate === "2024-02-29T09:00");
  api.changeSubtask(
    second.id,
    { kind: "check", id: second.subtasks[0].id, done: true },
    project,
  );
  assert.equal(
    api.listPlannerItems(project).find((t) => t.id === second.id).status,
    "todo",
  );
  api.updatePlannerItem(second.id, { status: "done" }, project);
  const reloaded = open(data);
  reloaded.ensureOccurrences(project, "2024-02-28", "2024-03-29");
  const saved = reloaded.listPlannerItems(project);
  assert.equal(saved.length, 31);
  assert.equal(saved.find((t) => t.id === root.id).subtasks[0].done, false);
  assert.equal(saved.find((t) => t.id === second.id).status, "done");
  assert.equal(data.get("qah:planner"), original);
});
test("future and entire series edits protect history, detached overrides, deletions and reference snapshots", () => {
  const { api, data, root } = fixture();
  api.startSeries(root.id, project, root.dueDate, daily, ["asset:one"]);
  const rows = () => open(data).listPlannerItems(project);
  const at = (slot) => rows().find((t) => t.occurrence.slot === slot);
  const completed = at("2024-02-29");
  api.updatePlannerItem(completed.id, { status: "done" }, project);
  const history = at("2024-02-29");
  const moved = at("2024-03-01");
  api.editOccurrence(moved.id, project, "Own cut", "2024-04-10T16:00");
  const deleted = at("2024-03-04");
  api.deletePlannerItem(deleted.id, project);
  const defaults = {
    title: "New cut",
    time: "11:00",
    rule: daily,
    links: ["asset:two"],
  };
  api.editSeries(at("2024-03-02").id, project, "future", defaults);
  assert.equal(at("2024-03-02").dueDate, "2024-03-02T11:00");
  assert.equal(at("2024-02-28").title, "Edit");
  assert.deepEqual(at("2024-03-02").referenceLinks, ["asset:one"]);
  assert.deepEqual(at("2024-04-01").referenceLinks, ["asset:two"]);
  api.editSeries(root.id, project, "entire", {
    ...defaults,
    rule: { frequency: "monthly", interval: 1 },
    time: "",
  });
  api.ensureOccurrences(project, "2024-03-01", "2024-04-30");
  assert.deepEqual(at("2024-02-29"), history);
  assert.equal(at("2024-03-01").id, moved.id);
  assert.equal(at("2024-03-01").dueDate, "2024-04-10T16:00");
  assert.equal(at("2024-03-03"), undefined);
  assert.equal(at("2024-03-28").dueDate, "2024-03-28");
  assert.deepEqual(at("2024-04-28").referenceLinks, ["asset:two"]);
  api.editSeries(root.id, project, "entire", defaults);
  assert.equal(at("2024-03-04"), undefined);
  assert.equal(rows().filter((t) => t.id === completed.id).length, 1);
  assert.equal(at("2024-03-01").title, "Own cut");
  assert.deepEqual(at("2024-03-03").referenceLinks, ["asset:one"]);
});
test("Dashboard deadlines and sessions address the displayed occurrence across project and series edits", () => {
  const { api, root, data } = fixture();
  api.startSeries(root.id, project, root.dueDate, daily, []);
  const row = api
    .listPlannerItems(project)
    .find((t) => t.occurrence.slot === "2024-02-29");
  const source = { projectId: project, name: "Film", task: row };
  const now = new Date(2024, 1, 29, 10);
  api.saveSession(source, +now, 60);
  const today = () =>
    open(data).todaysWork([{ id: project, name: "Film" }], now);
  assert.deepEqual(
    today()
      .filter((i) => i.taskId === row.id)
      .map((i) => i.kind),
    ["Deadline", "Session"],
  );
  const shown = today().find((i) => i.kind === "Session");
  api.updatePlannerItem(shown.taskId, { status: "done" }, shown.projectId);
  assert.equal(today().find((i) => i.id === shown.id).status, "done");
  assert.equal(
    api.listPlannerItems(project).find((t) => t.id === root.id).status,
    "todo",
  );
  assert.equal(
    api.listPlannerItems(project).find((t) => t.id === row.id).dueDate,
    row.dueDate,
  );
});
test("series changes retain linked prerequisites across scopes and keep session identity for a retired slot", () => {
  const { api, root, data } = fixture();
  api.startSeries(root.id, project, root.dueDate, daily, []);
  const [prerequisite, scheduled] = api.listPlannerItems(project).slice(1, 3);
  const dependent = api.createPlannerItem({ title: "Delivery" }, "other");
  const projects = [
    { id: project, name: "Film" },
    { id: "other", name: "Other" },
  ];
  api.changeDependency(
    { taskId: dependent.id, projectId: "other" },
    { taskId: prerequisite.id, projectId: project },
    "add",
    projects,
  );
  const before = data.get("qah:planner:project:other");
  const time = new Date(2024, 2, 1, 14);
  const source = { projectId: project, name: "Film", task: scheduled };
  const { id } = api.saveSession(source, +time, 45);
  api.editSeries(
    root.id,
    project,
    "entire",
    {
      title: "Monthly",
      time: "",
      links: [],
      rule: { frequency: "monthly", interval: 1 },
    },
    projects,
  );
  assert.equal(data.get("qah:planner:project:other"), before);
  assert.ok(
    api.listPlannerItems(project).some((t) => t.id === prerequisite.id),
  );
  const session = api.todaysWork(projects, time).find((i) => i.id === id);
  assert.equal(session.taskId, scheduled.id);
  assert.equal(session.title, scheduled.title);
  api.saveSession(source, +time + 3600000, 30, id);
  assert.equal(
    api.todaysWork(projects, time).find((i) => i.id === id).start,
    +time + 3600000,
  );
});

test("floating deadlines follow local civil time across DST; stored slots and IDs are timezone independent", () => {
  const previous = process.env.TZ;
  try {
    const observed = [];
    for (const zone of ["America/New_York", "Asia/Dhaka"]) {
      process.env.TZ = zone;
      const api = open();
      const root = api.createPlannerItem(
        { title: "Morning", dueDate: "2024-03-09T09:00" },
        project,
      );
      api.startSeries(
        root.id,
        project,
        root.dueDate,
        { ...daily, until: "2024-03-11" },
        [],
      );
      const projects = [{ id: project, name: "Film" }];
      const starts = [9, 10, 11].map((day) => {
        const due = api
          .todaysWork(projects, new Date(2024, 2, day, 12))
          .find((i) => new Date(i.start).getDate() === day);
        assert.equal(new Date(due.start).getHours(), 9);
        return due.start;
      });
      observed.push((starts[1] - starts[0]) / 3600000);
      const slots = api.listPlannerItems(project).map((t) => t.occurrence.slot);
      assert.deepEqual(slots, ["2024-03-09", "2024-03-10", "2024-03-11"]);
    }
    assert.deepEqual(observed, [23, 24]);
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
test("moving future deadlines keeps original slot identities and expands Calendar by displayed dates", () => {
  const { api, root } = fixture();
  api.startSeries(root.id, project, root.dueDate, daily, []);
  const selected = api.listPlannerItems(project)[1];
  api.editSeries(selected.id, project, "future", {
    title: "Delivery",
    links: [],
    time: "17:00",
    deadlineOffset: 3,
    rule: daily,
  });
  const at = (id) => api.listPlannerItems(project).find((t) => t.id === id);
  assert.equal(at(root.id).dueDate, root.dueDate);
  assert.equal(at(selected.id).dueDate, "2024-03-03T17:00");
  api.ensureOccurrences(project, "2024-10-10", "2024-10-10");
  const materialized = api
    .listPlannerItems(project)
    .find((t) => t.dueDate === "2024-10-10T17:00");
  assert.equal(materialized.occurrence.slot, "2024-10-07");
  api.ensureOccurrences(project, "2024-10-10", "2024-10-10");
  assert.equal(
    api.listPlannerItems(project).filter((t) => t.id === materialized.id)
      .length,
    1,
  );
});
test("damaged recurrence metadata or an existing task ID collision cannot overwrite Planner records", () => {
  const { api, root, data } = fixture();
  const key = "qah:planner:project:film";
  const items = JSON.parse(data.get(key));
  const conflictingId = "occurrence:" + JSON.stringify([root.id, "2024-02-29"]);
  data.set(key, JSON.stringify([...items, { ...items[0], id: conflictingId }]));
  const before = data.get(key);
  assert.throws(
    () => api.startSeries(root.id, project, root.dueDate, daily, []),
    /conflicts/,
  );
  assert.equal(data.get(key), before);
  const damaged = JSON.stringify([{ ...items[0], series: { segments: [] } }]);
  data.set(key, damaged);
  assert.throws(
    () => api.ensureOccurrences(project, "2024-01-01", "2024-01-30"),
    /Invalid Planner/,
  );
  assert.equal(data.get(key), damaged);
});
