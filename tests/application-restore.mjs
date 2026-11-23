import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash, randomUUID } from "node:crypto";
import { setup } from "./fixtures/workspace.mjs";
async function fixture() {
  const env = setup(),
    { api, ls, root, connect } = env;
  await connect();
  const id = randomUUID(),
    date = new Date().toISOString(),
    p = {
      id,
      name: "Film",
      slug: "film",
      type: "custom",
      createdAt: date,
      modifiedAt: date,
      version: "1.0",
      settings: { defaultExportFormat: "json" },
      tags: [],
    };
  const dir = await (
    await root.getDirectoryHandle("projects", { create: true })
  ).getDirectoryHandle("film", { create: true });
  await dir.put("project.json", JSON.stringify(p));
  ls.setItem("qah:projects", JSON.stringify([p]));
  const refs = await dir.getDirectoryHandle("references", { create: true });
  await refs.put("clip.bin", new Uint8Array([0, 255, 9]));
  const task = api.createPlannerItem(
    { title: "Before", dueDate: "2026-01-01" },
    id,
  );
  api.startSeries(
    task.id,
    id,
    task.dueDate,
    { frequency: "daily", interval: 1, until: "2026-01-02" },
    ["workspace-copy:" + id + "/clip.bin"],
  );
  api.updatePlannerItem(task.id, { status: "done" }, id);
  const pref = "qah:calendar-view-settings";
  ls.setItem(
    pref,
    JSON.stringify({
      view: "Day",
      weekStart: 0,
      days: [1],
      start: "09:00",
      end: "17:00",
    }),
  );
  await api.runBackup();
  const backups = await root.getDirectoryHandle("Qalat Backups");
  const blob = await (
      await backups.getFileHandle(api.backupStatus().last.name)
    ).getFile(),
    archive = await api.parseArchive(blob);
  return { ...env, archive, blob, refs, id, task, pref };
}
test("full restore, cancellation, readback, undo and interruption during filesystem write", async () => {
  const { api, archive, refs, id, task, ls } = await fixture();
  const key = "qah:planner:project:" + id;
  ls.removeItem(key);
  await refs.removeEntry("clip.bin");
  const plan = await api.previewRestore(archive, { kind: "full" });
  await assert.rejects(api.startRestore(archive, plan, false), /confirmation/);
  assert.equal(ls.getItem(key), null);
  assert.equal(await api.pendingRestore(), undefined);
  refs.interrupt = true;
  await assert.rejects(api.startRestore(archive, plan, true), /Interrupted/);
  assert(await api.pendingRestore());
  refs.interrupt = false;
  await api.finishRestore(false);
  assert.equal(await api.pendingRestore(), undefined);
  assert.equal(
    api.listPlannerItems(id).find((t) => t.id === task.id).status,
    "done",
  );
  assert.deepEqual(
    await (await (await refs.getFileHandle("clip.bin")).getFile()).bytes(),
    Uint8Array.from([0, 255, 9]),
  );
  await api.undoPreviousRestore();
  assert.equal(ls.getItem(key), null);
  assert(!refs.children.has("clip.bin"));
});
test("selective project and preference scopes, browser write interruption and rollback", async () => {
  const { api, archive, id, ls, pref } = await fixture();
  const other = api.createPlannerItem({ title: "Leave alone" });
  ls.removeItem(pref);
  ls.removeItem("qah:planner:project:" + id);
  const project = await api.previewRestore(archive, { kind: "project", id });
  const save = ls.setItem;
  Object.defineProperty(ls, "setItem", {
    value: () => {
      throw Error("Quota failure");
    },
    configurable: true,
  });
  await assert.rejects(api.startRestore(archive, project, true), /Quota/);
  assert(await api.pendingRestore());
  Object.defineProperty(ls, "setItem", { value: save, configurable: true });
  await api.finishRestore(true);
  assert.equal(ls.getItem("qah:planner:project:" + id), null);
  await api.startRestore(
    archive,
    await api.previewRestore(archive, { kind: "project", id }),
    true,
  );
  assert.equal(api.listPlannerItems()[0].id, other.id);
  assert.equal(ls.getItem(pref), null);
  await api.startRestore(
    archive,
    await api.previewRestore(archive, { kind: "preferences" }),
    true,
  );
  assert.equal(ls.getItem(pref), archive.browser[pref]);
});
test("rejects stale previews, cross-project collisions, revoked permission and corrupted archives", async () => {
  const { api, archive, root, ls, id, blob, pref } = await fixture();
  ls.removeItem(pref);
  const plan = await api.previewRestore(archive, { kind: "preferences" });
  ls.setItem(pref, archive.browser[pref]);
  await assert.rejects(api.startRestore(archive, plan, true), /changed/);
  root.permission = "denied";
  await assert.rejects(
    api.previewRestore(archive, { kind: "full" }),
    /authorized/,
  );
  root.permission = "granted";
  const p = JSON.parse(ls["qah:projects"])[0];
  ls.setItem("qah:projects", JSON.stringify([{ ...p, id: randomUUID() }]));
  await assert.rejects(
    api.previewRestore(archive, { kind: "project", id }),
    /collision|identit/i,
  );
  const bytes = Buffer.from(await blob.arrayBuffer()),
    end = bytes.indexOf(10);
  const head = JSON.parse(bytes.subarray(0, end));
  const modified = (fn) => {
    const m = structuredClone(head.manifest);
    fn(m);
    const sha256 = createHash("sha256").update(JSON.stringify(m)).digest("hex");
    return new Blob([
      JSON.stringify({ manifest: m, sha256 }) + "\n",
      bytes.subarray(end + 1),
    ]);
  };
  await assert.rejects(
    api.parseArchive(
      modified((m) => (m.workspace[0].path = "projects/film/../other")),
    ),
    /Unsafe/,
  );
  await assert.rejects(api.parseArchive(modified((m) => (m.version = 2))));
  await assert.rejects(
    api.parseArchive(
      modified((m) => {
        m.browser["qah:planner"] = "{}";
        m.browserSha256 = createHash("sha256")
          .update(JSON.stringify(m.browser))
          .digest("hex");
      }),
    ),
    /Invalid Planner/,
  );
  await assert.rejects(
    api.parseArchive(blob.slice(0, -1)),
    /inventory|length/i,
  );
  bytes[bytes.length - 1] ^= 1;
  await assert.rejects(api.parseArchive(new Blob([bytes])), /checksum/);
});

test("rejects an unsafe partial dependency and an active timer before staging writes", async () => {
  const { api, archive, id, ls, task } = await fixture();
  const key = "qah:planner:project:" + id;
  const source = structuredClone(archive.browser),
    tasks = JSON.parse(source[key]);
  const missing = api.createPlannerItem({ title: "External prerequisite" });
  source["qah:planner"] = ls["qah:planner"];
  tasks[0].prerequisites = [{ taskId: missing.id }];
  source[key] = JSON.stringify(tasks);
  ls.removeItem("qah:planner");
  await assert.rejects(
    api.previewRestore(
      { ...archive, browser: source },
      { kind: "project", id },
    ),
    /Unavailable prerequisite/,
  );
  const target = {
    taskId: task.id,
    projectId: id,
    project: "Film",
    title: "Work",
  };
  ls.setItem(
    "qah:work-timer:v1",
    JSON.stringify({
      version: 1,
      open: [{ id: "run", target }],
      entries: [],
      active: { id: "run", from: 1, checkpoint: 1, owner: "tab" },
    }),
  );
  await assert.rejects(
    api.previewRestore(archive, { kind: "full" }),
    /active timers/,
  );
  assert.equal(await api.pendingRestore(), undefined);
});

test("legacy decision logs and completed focus/break intervals remain usable after recovery", async () => {
  const { api, ls, root, id, task } = await fixture(),
    decision = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      context: "Edit",
      question: "Which cut?",
      options: ["A"],
      selected: "A",
      rationale: "Continuity",
      rejectedRationale: [],
      locked: true,
      aiAssisted: false,
    };
  const target = {
    projectId: id,
    taskId: task.id,
    project: "Film",
    title: "Edit",
  };
  const entries = ["timer", "break"].map((kind, i) => ({
    id: randomUUID(),
    kind,
    run: "ended",
    focusId: "focus",
    from: i * 60,
    to: (i + 1) * 60,
    recordedAt: 121,
    target,
  }));
  const key = "qah:project:film:decisions:decisions.json";
  for (const value of [[decision], JSON.stringify([decision])]) {
    ls.setItem(key, JSON.stringify(value));
    ls.setItem(
      "qah:work-timer:v1",
      JSON.stringify({ version: 1, open: [], entries }),
    );
    await api.runBackup();
    const dir = await root.getDirectoryHandle("Qalat Backups"),
      blob = await (
        await dir.getFileHandle(api.backupStatus().last.name)
      ).getFile(),
      source = await api.parseArchive(blob);
    ls.removeItem(key);
    ls.removeItem("qah:work-timer:v1");
    await api.startRestore(
      source,
      await api.previewRestore(source, { kind: "full" }),
      true,
    );
    assert.deepEqual(await api.readDecisions("film"), [decision]);
    assert.equal(ls[key], JSON.stringify(value));
    assert.deepEqual(JSON.parse(ls["qah:work-timer:v1"]).entries, entries);
  }
});
