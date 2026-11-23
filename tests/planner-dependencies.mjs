import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const bundle = await build({entryPoints: ["src/lib/planner.ts"], bundle: true, format: "cjs", write: false});
const projects = [{id: "a", name: "Alpha"}, {id: "b", name: "Beta"}];
function open(data = new Map()) {
  const module = {exports: {}};
  const storage = {getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v)};
  new Function("module", "localStorage", bundle.outputFiles[0].text)(module, storage);
  return module.exports;
}
function task(api, title, projectId) {
  return {taskId: api.createPlannerItem({title}, projectId).id, projectId};
}

test("scoped dependency graph rejects self, duplicate, direct and indirect cycles without writes", () => {
  const data = new Map(), api = open(data);
  const a = task(api, "A"), b = task(api, "B", "a"), c = task(api, "C", "b");
  const add = (from, to) => api.changeDependency(from, to, "add", projects);
  const reject = (from, to, reason) => {
    const before = [...data];
    assert.throws(() => add(from, to), reason);
    assert.deepEqual([...data], before);
  };
  reject(a, a, /itself/);
  add(a, b);
  reject(a, b, /already/);
  reject(b, a, /cycle/);
  add(b, c);
  reject(c, a, /cycle/);
  reject(c, {taskId: "missing"}, /missing/i);
  reject(c, {...a, projectId: "unlisted"}, /unavailable/i);
  add(a, c);
  assert.equal(open(data).listPlannerItems()[0].prerequisites.length, 2);
});

test("links resolve by project and ID, survive reload and deletion, and warnings allow explicit override", () => {
  const data = new Map(), api = open(data);
  const parent = task(api, "Parent"), pre = task(api, "Mix audio", "a");
  data.set("qah:planner:project:b", data.get("qah:planner:project:a"));
  api.updatePlannerItem(pre.taskId, {status:"done"}, "b");
  api.changeDependency(parent, pre, "add", projects);
  const next = open(data);
  const check = answer => next.confirmPrerequisites(parent, projects, "Start task", message => {
    assert.match(message, /Mix audio/);
    assert.match(message, /Alpha/);
    return answer;
  });
  assert.equal(check(false), false);
  assert.equal(check(true), true);
  assert.equal(next.listPlannerItems()[0].status, "todo");
  next.updatePlannerItem(pre.taskId, {status:"done"}, "a");
  assert.equal(next.confirmPrerequisites(parent, projects, "Start task", () => assert.fail()), true);
  next.deletePlannerItem(pre.taskId, "a");
  assert.equal(next.confirmPrerequisites(parent, projects, "Schedule task", msg => /missing/i.test(msg)), true);
  next.changeDependency(parent, pre, "remove", projects);
  assert.equal(open(data).listPlannerItems()[0].prerequisites, undefined);
});
