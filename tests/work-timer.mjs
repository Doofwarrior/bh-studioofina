import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";

const { outputFiles } = await build({
  entryPoints: ["src/lib/workTimer.ts"],
  bundle: true,
  format: "cjs",
  write: false,
});
function open(data = new Map()) {
  const module = { exports: {} };
  new Function("module", "localStorage", outputFiles[0].text)(module, {
    getItem: (k) => data.get(k) ?? null,
  });
  const api = module.exports;
  return {
    api,
    get: () => api.readTimer(),
    act(action, now, owner = "tab-a", alive = true) {
      const state = api.readTimer();
      api.applyTimer(state, action, now, owner, alive);
      data.set(api.timerKey, JSON.stringify(state));
      return state;
    },
  };
}
const task = {
  project: "Film",
  projectId: "a",
  taskId: "occurrence:a/2026-11-20",
  title: "Edit",
  slot: "2026-11-20",
};
const other = { ...task, projectId: "b" };
test("global switching, pauses and stops ledger exact non-overlapping intervals with scoped identities", () => {
  const { act, get, api } = open();
  const first = act({ type: "start", target: task }, 1000).active.id;
  act({ type: "start", target: task }, 1700);
  const second = act({ type: "start", target: other }, 3000, "tab-b").active.id;
  assert.notEqual(second, first);
  assert.equal(api.elapsed(get(), first, 4500), 2000);
  act({ type: "pause", id: second }, 4500);
  act({ type: "start", target: task }, 5000);
  act({ type: "stop", id: first }, 7000);
  act({ type: "stop", id: first }, 9000);
  const state = act({ type: "stop", id: second }, 9000);
  assert.deepEqual(
    state.entries.map((e) => [e.from, e.to, e.target.projectId]),
    [
      [1000, 3000, "a"],
      [3000, 4500, "b"],
      [5000, 7000, "a"],
    ],
  );
  assert.equal(state.active, undefined);
  assert.deepEqual(state.open, []);
  assert.equal(api.elapsed(state, first, 20000), 4000);
});
for (const include of [true, false])
  test(
    "recovery persists a frozen gap, " +
      (include ? "includes" : "excludes") +
      " it once",
    () => {
      const data = new Map();
      const { act } = open(data);
      const id = act({ type: "start", target: task }, 100).active.id;
      act({ type: "check" }, 12100);
      act({ type: "check" }, 22100, "tab-b"); // A second tab cannot attest for the owner.
      const reboot = open(data);
      const lost = reboot.act({ type: "check" }, 50100, "tab-c", false);
      assert.deepEqual([lost.pending.from, lost.pending.to], [12100, 50100]);
      assert.equal(lost.entries[0].to, 12100);
      assert.equal(lost.active, undefined);
      assert.throws(
        () => reboot.act({ type: "start", target: other }, 55000),
        /Review/,
      );
      const recovered = open(data);
      recovered.act(
        { type: "recover", id: lost.pending.decision, include },
        60000,
      );
      recovered.act(
        { type: "recover", id: lost.pending.decision, include },
        61000,
      );
      assert.equal(
        recovered.api.elapsed(recovered.get(), id, 62000),
        include ? 50000 : 12000,
      );
      assert.equal(recovered.get().pending, undefined);
      assert.equal(recovered.get().active, undefined);
    },
  );
test("manual work retains session and occurrence references and rejects overlaps, including active work", () => {
  const { act, get } = open();
  const target = { ...task, sessionId: "session-1" };
  const log = (from, to) => act({ type: "manual", target, from, to }, 5000);
  log(100, 2000);
  log(2000, 3000);
  assert.throws(() => log(1500, 2500), /Overlaps/);
  const id = act({ type: "start", target }, 4000).active.id;
  assert.throws(() => log(3900, 4200), /Overlaps/);
  assert.throws(() => log(5000, 6000), /past/);
  act({ type: "stop", id }, 5000);
  assert.deepEqual(
    get().entries.map((e) => [e.kind, e.target.sessionId, e.target.taskId]),
    ["manual", "manual", "timer"].map((k) => [k, "session-1", task.taskId]),
  );
  assert.equal(get().entries[0].recordedAt, 5000);
});

const focus = { workMinutes: 25, breakMinutes: 5 };
test("focus uses the existing run, separates intentional breaks, and survives switches and reload", () => {
  const data = new Map(),
    { act, api } = open(data);
  const target = { ...task, sessionId: "scheduled" };
  const id = act({ type: "start", target }, 1000).active.id;
  const focusing = act({ type: "start", target, focus }, 2000);
  const focusId = focusing.open[0].focus.id;
  assert.equal(focusing.active.id, id);
  act({ type: "break", id }, 3000);
  act({ type: "break", id }, 3500);
  assert.equal(api.elapsed(open(data).get(), id, 3900), 2000);
  act({ type: "start", target }, 4000);
  act({ type: "pause", id }, 4500);
  act({ type: "pause", id }, 4501);
  act({ type: "start", target }, 5000);
  act({ type: "start", target: other }, 5500, "tab-b");
  const saved = open(data);
  saved.act({ type: "start", target }, 6000);
  const stopped = saved.act({ type: "stop", id }, 6500);
  assert.equal(api.elapsed(stopped, id, 7000), 3500);
  assert.equal(stopped.active, undefined);
  const parts = stopped.entries.filter((e) => e.focusId === focusId);
  assert.ok(
    parts.every(
      (e) =>
        e.run === id &&
        e.target.slot === task.slot &&
        e.target.sessionId === "scheduled",
    ),
  );
  assert.equal(
    parts
      .filter((e) => e.kind === "break")
      .reduce((a, e) => a + e.to - e.from, 0),
    1000,
  );
  assert.equal(
    parts
      .filter((e) => e.kind === "timer")
      .reduce((a, e) => a + e.to - e.from, 0),
    2500,
  );
  assert.equal(
    stopped.open.some((r) => r.id === id),
    false,
  );
});
for (const include of [true, false])
  test("interrupted focus break remains separate, include=" + include, () => {
    const { act, get, api } = open();
    const { id } = act({ type: "start", target: task, focus }, 1000).active;
    act({ type: "break", id }, 2000);
    act({ type: "check" }, 12000);
    const { pending } = act({ type: "check" }, 14000, "other", false);
    assert.equal(pending.phase, "break");
    act({ type: "recover", id: pending.decision, include }, 17000);
    act({ type: "recover", id: pending.decision, include }, 17001);
    const state = get();
    assert.equal(api.elapsed(state, id, 18000), 1000);
    assert.equal(
      state.entries
        .filter((e) => e.kind === "break")
        .reduce((a, e) => a + e.to - e.from, 0),
      include ? 12000 : 10000,
    );
    assert.equal(state.active, undefined);
  });
test("corrections conserve split totals, retain lineage and reject stale, invalid, cross-project and overlapping edits", () => {
  const data = new Map(),
    { act, get } = open(data);
  const target = { ...task, sessionId: "session-2" };
  const original = act({ type: "manual", target, from: 100, to: 1000 }, 2000)
    .entries[0];
  act({ type: "manual", target: other, from: 1100, to: 1500 }, 2000);
  act({ type: "start", target }, 1900);
  const ref = { type: "correct", id: original.id, projectId: task.projectId };
  const edit = (from, to) => act({ ...ref, operation: "edit", from, to }, 2100);
  const before = get();
  assert.throws(() => edit(200, 100), /positive/);
  assert.throws(() => edit(100, 1200), /overlap/);
  assert.throws(() => edit(1800, 2000), /overlap/);
  assert.throws(
    () => act({ ...ref, operation: "split", at: 100 }, 2100),
    /inside/,
  );
  assert.throws(
    () => act({ ...ref, operation: "remove", projectId: "b" }, 2100),
    /changed/,
  );
  assert.deepEqual(get(), before);
  const edited = edit(200, 1000).entries[0];
  assert.throws(() => edit(300, 1000), /changed/);
  const parts = act(
    {
      ...ref,
      operation: "split",
      revision: edited.correction.revision,
      at: 550,
    },
    2200,
  ).entries.slice(0, 2);
  assert.equal(parts[0].to, parts[1].from);
  assert.equal(
    parts.reduce((a, e) => a + e.to - e.from, 0),
    800,
  );
  assert.notEqual(parts[0].id, parts[1].id);
  assert.ok(
    parts.every(
      (e) =>
        e.correction.root === original.id &&
        e.correction.from === 100 &&
        e.correction.to === 1000,
    ),
  );
  assert.deepEqual(parts[1].target, target);
  const final = open(data).act(
    { ...ref, operation: "remove", revision: parts[0].correction.revision },
    2300,
  );
  assert.equal(final.entries.length, 2);
  assert.equal(final.entries[0].id, parts[1].id);
  assert.equal(final.entries[1].target.projectId, "b");
});
test("correcting a completed focus interval adjusts actual work and preserves its occurrence, run and session", () => {
  const { act, api, get } = open();
  const target = { ...task, sessionId: "scheduled" };
  const { id } = act({ type: "start", target, focus }, 1000).active;
  act({ type: "break", id }, 3000);
  act({ type: "start", target }, 4500);
  const closed = act({ type: "stop", id }, 6000);
  const original = closed.entries[0];
  const ref = { type: "correct", id: original.id, projectId: target.projectId };
  const edited = act({ ...ref, operation: "edit", from: 1500, to: 3000 }, 8000)
    .entries[0];
  const parts = act(
    {
      ...ref,
      operation: "split",
      revision: edited.correction.revision,
      at: 2300,
    },
    8001,
  ).entries.slice(0, 2);
  assert.equal(api.elapsed(get(), id, 9000), 3000);
  assert.ok(
    parts.every(
      (part) =>
        part.focusId === original.focusId &&
        part.run === id &&
        part.target.slot === target.slot &&
        part.target.sessionId === "scheduled",
    ),
  );
  assert.equal(get().entries.find((e) => e.kind === "break").to, 4500);
});

test("stale focus resume cannot recreate an ended run or switch a replacement timer", () => {
  const data = new Map();
  const a = open(data), b = open(data);
  const id = a.act({ type: "start", target: task, focus }, 1000).active.id;
  const resume = { type: "start", target: task, expectedFocusRunId: id };
  a.act({ type: "pause", id }, 2000);
  assert.equal(b.act(resume, 3000, "tab-b").active.id, id);
  a.act({ type: "pause", id }, 4000);
  a.act({ type: "stop", id }, 5000);
  const ended = a.get();
  assert.throws(() => b.act(resume, 6000, "tab-b"), /focus session/i);
  assert.deepEqual(b.get(), ended);
  const replacement = a.act({ type: "start", target: task }, 7000);
  assert.notEqual(replacement.active.id, id);
  assert.throws(() => b.act(resume, 8000, "tab-b"), /focus session/i);
  assert.deepEqual(b.get(), replacement);
});
