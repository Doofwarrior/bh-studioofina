import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
process.env.TZ = "Asia/Dhaka";
const { outputFiles } = await build({
  stdin: {
    contents:
      "export * from './src/features/calendar/icalendar'; export { saveSession } from './src/features/calendar/scheduling'; export * from './src/features/calendar/viewModel'; export * from './src/lib/calendar'; export * from './src/lib/planner';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: "cjs",
});
function setup() {
  const data = new Map(),
    module = { exports: {} };
  new Function("module", "localStorage", outputFiles[0].text)(module, {
    get length() {
      return data.size;
    },
    key: (i) => [...data.keys()][i],
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
  });
  return { api: module.exports, data };
}
const ws = { kind: "workspace" },
  p = { kind: "project", projectId: "alpha" },
  projects = [{ id: "alpha", name: "Project, A" }];
function records(text) {
  assert(text.endsWith("\r\n"));
  for (const line of text.split("\r\n")) assert(Buffer.byteLength(line) <= 75);
  return [
    ...text
      .replaceAll("\r\n ", "")
      .matchAll(/BEGIN:VEVENT\r\n([\s\S]*?)END:VEVENT/g),
  ].map((m) =>
    Object.fromEntries(
      m[1]
        .trim()
        .split("\r\n")
        .map((line) => [
          line.slice(0, line.indexOf(":")),
          line.slice(line.indexOf(":") + 1),
        ]),
    ),
  );
}
test("ICS encodes Dhaka deadlines, exclusive all-day ends, Unicode folding, escaping, scope and stable rescheduling IDs", () => {
  const { api } = setup(),
    title = "ঢাকা".repeat(30) + "\\desk,;\nnext";
  api.createPlannerItem(
    { title: "Timed deadline", dueDate: "2026-11-21T00:30" },
    "alpha",
  );
  api.createPlannerItem({ title: "No deadline" }, "alpha");
  api.createPlannerItem({ title: "Wrong project", dueDate: "2026-11-21" });
  const entry = {
    kind: "event",
    title,
    allDay: true,
    startsAt: "2026-11-20T00:00:00+06:00",
    endsAt: "2026-11-23T00:00:00+06:00",
  };
  const saved = api.saveCalendarEntry(p, entry);
  const get = () =>
    records(
      api.exportCalendar(projects, "project:alpha", "2026-11-21", "2026-11-21")
        .text,
    );
  const rows = get();
  assert.equal(rows.length, 2);
  assert.equal(
    rows.find((r) => r.CATEGORIES === "Deadline").DTSTART,
    "20261120T183000Z",
  );
  const e = rows.find((r) => r.CATEGORIES === "Event");
  assert.equal(e["DTSTART;VALUE=DATE"], "20261120");
  assert.equal(e["DTEND;VALUE=DATE"], "20261123");
  assert.equal(e.SUMMARY, "ঢাকা".repeat(30) + "\\\\desk\\,\\;\\nnext");
  assert.equal(e["X-QALAT-PROJECT"], "Project\\, A");
  api.saveCalendarEntry(
    p,
    { ...entry, startsAt: "2026-11-21T00:00:00+06:00" },
    saved.id,
  );
  assert.equal(get().find((r) => r.CATEGORIES === "Event").UID, e.UID);
});
test("recurring deadlines export independent overrides and cancellations without writing projected tasks", () => {
  const { api, data } = setup(),
    t = api.createPlannerItem({ title: "Cut", dueDate: "2026-01-01" });
  api.startSeries(
    t.id,
    undefined,
    "2026-01-01",
    { frequency: "daily", interval: 1 },
    [],
  );
  const [first, second, third] = api.listPlannerItems();
  api.updatePlannerItem(first.id, { status: "done" });
  api.deletePlannerItem(second.id);
  api.updatePlannerItem(third.id, {
    dueDate: "2026-01-05",
    title: "Moved cut",
  });
  const before = [...data];
  const rows = records(
    api.exportCalendar([], "workspace", "2026-01-01", "2026-01-05").text,
  );
  assert.equal(rows.length, 5);
  assert.equal(new Set(rows.map((r) => r.UID)).size, 5);
  assert.equal(
    rows.filter((r) => r.STATUS === "CANCELLED")[0]["DTSTART;VALUE=DATE"],
    "20260102",
  );
  assert.equal(
    rows.find((r) => r.SUMMARY === "Moved cut")["DTSTART;VALUE=DATE"],
    "20260105",
  );
  assert.equal(
    records(
      api.exportCalendar([], "workspace", "2026-05-01", "2026-05-03").text,
    ).length,
    3,
  );
  assert.deepEqual([...data], before);
});
test("monthly events skip invalid dates, preserve offsets, count, and stop at the inclusive boundary", () => {
  const { api } = setup();
  api.saveCalendarEntry(ws, {
    kind: "event",
    title: "Review",
    startsAt: "2026-01-31T01:00:00+06:00",
    endsAt: "2026-01-31T02:00:00+06:00",
    recurrence: { frequency: "monthly", interval: 1, count: 2 },
  });
  assert.throws(
    () => api.exportCalendar([], "workspace", "2026-02-01", "2026-02-28"),
    /No Calendar/,
  );
  assert.equal(
    records(
      api.exportCalendar([], "workspace", "2026-03-01", "2026-03-31").text,
    )[0].DTSTART,
    "20260330T190000Z",
  );
  assert.throws(
    () => api.exportCalendar([], "workspace", "2026-05-01", "2026-05-31"),
    /No Calendar/,
  );
});
test("recurring session exceptions are identical in the displayed range and export, including moved-in and cancelled slots", () => {
  const { api } = setup(),
    task = api.createPlannerItem({ title: "Mix" });
  const rule = { frequency: "weekly", interval: 1, until: "2026-02-02" };
  const entry = {
    kind: "session",
    taskId: task.id,
    startsAt: "2026-01-05T09:00:00+06:00",
    endsAt: "2026-01-05T10:00:00+06:00",
    recurrence: rule,
  };
  const base = api.saveCalendarEntry(ws, entry);
  const get = (a, b) => records(api.exportCalendar([], "workspace", a, b).text);
  const original = get("2026-01-12", "2026-01-12")[0];
  api.saveSession(
    { name: "Workspace", task },
    Date.parse("2026-02-02T12:00:00+06:00"),
    60,
    base.id,
    "2026-01-12",
  );
  api.cancelCalendarOccurrence(ws, base.id, "2026-01-19");
  assert.throws(
    () => api.cancelCalendarOccurrence(ws, base.id, "2026-01-20"),
    /does not reference/,
  );
  assert.equal(api.listCalendar(ws).entries[0].entry.startsAt, entry.startsAt);
  const feb = get("2026-02-02", "2026-02-02");
  assert.equal(feb.length, 2);
  assert.equal(original.SEQUENCE, "0");
  assert.equal(feb.find((r) => r.UID === original.UID).SEQUENCE, "2");
  assert.equal(
    feb.find((r) => r.UID === original.UID).DTSTART,
    "20260202T060000Z",
  );
  assert.equal(get("2026-01-19", "2026-01-19")[0].STATUS, "CANCELLED");
  assert.equal(
    api
      .readItems(ws, "Workspace", { from: "2026-02-02", through: "2026-02-02" })
      .filter((i) => i.kind === "Session").length,
    2,
  );
});
