import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash, randomUUID } from "node:crypto";

import {setup, Folder} from "./fixtures/workspace.mjs";
const sha=x=>createHash("sha256").update(x).digest("hex");
const snapshot = (ls) =>
  Object.fromEntries(
    Object.entries(ls)
      .filter(([k]) => !k.startsWith("qah:backup-control:"))
      .sort(),
  );
test("verified primary and secondary archives preserve raw browser records and copied bytes", async () => {
  const { api, ls, root, other, connect, secondary } = setup();
  await connect();
  await secondary();
  const pid = randomUUID(),
    date = "2026-01-01T00:00:00Z",
    project = {
      id: pid,
      name: "Film",
      slug: "film",
      type: "custom",
      createdAt: date,
      modifiedAt: date,
      version: "1.0",
      settings: { defaultExportFormat: "json" },
      tags: [],
    };
  const projects = await root.getDirectoryHandle("projects", { create: true }),
    dir = await projects.getDirectoryHandle("film", { create: true });
  await dir.put("project.json", JSON.stringify(project));
  ls.setItem("qah:projects", JSON.stringify([project]));
  const refs = await dir.getDirectoryHandle("references", { create: true }),
    binary = Buffer.from([0, 255, 10]);
  await refs.put("fixture.bin", binary);
  const task = api.createPlannerItem(
    { title: "Fixture", dueDate: "2026-01-01" },
    pid,
  );
  api.startSeries(
    task.id,
    pid,
    "2026-01-01",
    { frequency: "daily", interval: 1, until: "2026-01-03" },
    ["workspace-copy:" + pid + "/fixture.bin"],
  );
  api.changeSubtask(task.id, { kind: "add", title: "Review" }, pid);
  api.saveCalendarEntry(
    { kind: "project", projectId: pid },
    {
      kind: "session",
      taskId: task.id,
      startsAt: date,
      endsAt: "2026-01-01T01:00:00Z",
    },
  );
  ls.setItem(
    "qah:reminder-delivery:" + JSON.stringify([pid, task.id, "r"]),
    JSON.stringify([null, date, 10]),
  );
  ls.setItem(
    "qah:work-timer:v1",
    JSON.stringify({
      version: 1,
      open: [],
      entries: [
        {
          id: "e",
          kind: "manual",
          from: 1,
          to: 2,
          recordedAt: 3,
          target: {
            taskId: task.id,
            projectId: pid,
            project: "Film",
            title: "Fixture",
          },
          correction: { root: "e", from: 0, to: 2, at: 3, revision: "rev" },
        },
      ],
    }),
  );
  const filters = { from: "", to: "", action: "", status: "", project: "all" };
  ls.setItem(
    "qah:work-view:search:sample",
    JSON.stringify({ query: "Film", filters }),
  );
  await root.put("outside-projects.txt", "excluded workspace bytes");
  ls.setItem("unrelated-site-record", "excluded browser bytes");
  ls.setItem("qah:backup-control:fixture", "excluded control metadata");
  const before = snapshot(ls);
  await api.runBackup();
  const last = api.backupStatus().last;
  const read = async (folder) =>
    Buffer.from(
      await (
        await (
          await (
            await folder.getDirectoryHandle("Qalat Backups")
          ).getFileHandle(last.name)
        ).getFile()
      ).arrayBuffer(),
    );
  const bytes = await read(root);
  assert.deepEqual(await read(other), bytes);
  const end = bytes.indexOf(10),
    { sha256, manifest } = JSON.parse(bytes.subarray(0, end));
  assert.equal(sha256, sha(JSON.stringify(manifest)));
  assert.equal(manifest.version, 1);
  const expectedRecords = Object.fromEntries(
    Object.entries(before).filter(([key]) => key.startsWith("qah:")),
  );
  assert.deepEqual(manifest.browser, expectedRecords);
  assert.deepEqual(manifest.excluded, [
    "backup control metadata",
    "workspace files outside projects/",
    "external linked file contents",
    "browser handles and permission grants",
  ]);
  for (const marker of ["excluded workspace bytes", "excluded browser bytes", "excluded control metadata"])
    assert.equal(bytes.includes(Buffer.from(marker)), false);
  assert.equal(manifest.browserSha256, sha(JSON.stringify(manifest.browser)));
  let offset = end + 1;
  for (const f of manifest.workspace) {
    const body = bytes.subarray(offset, offset + f.size);
    assert.equal(sha(body), f.blocks[0]);
    if (f.path.endsWith("fixture.bin")) assert.deepEqual(body, binary);
    offset += f.size;
  }
  assert.equal(offset, bytes.length);
  assert.deepEqual(snapshot(ls), before);
  await api.runBackup(true);
  assert.equal(api.backupStatus().last.name, last.name);
  await api.runBackup();
  assert.equal(
    (await root.getDirectoryHandle("Qalat Backups")).children.size,
    1,
  );
  assert.equal(
    (await other.getDirectoryHandle("Qalat Backups")).children.size,
    1,
  );
});
test("invalid, unavailable and changing sources cannot register success", async () => {
  const { root, api, ls, connect } = setup();
  await assert.rejects(api.runBackup(), /Connect/);
  await connect();
  root.permission = "denied";
  await assert.rejects(api.runBackup(), /permission/);
  root.permission = "granted";
  ls.setItem("qah:planner", "{}");
  await assert.rejects(api.runBackup(), /Invalid Planner/);
  assert.equal(ls["qah:planner"], "{}");
  ls.removeItem("qah:planner");
  const projects = await root.getDirectoryHandle("projects", { create: true });
  await projects.getDirectoryHandle("partial", { create: true });
  await assert.rejects(api.runBackup(), /Missing project.json/);
  await projects.removeEntry("partial");
  projects.entries = async function* () {
    ls.setItem("qah:content", randomUUID());
  };
  await assert.rejects(api.runBackup(), /changed during backup/);
  assert.equal(api.backupStatus().last, undefined);
});
test("incomplete and corrupt secondary writes leave the verified primary untouched", async () => {
  const { root, other, api, connect, secondary } = setup();
  await connect();
  await api.runBackup();
  const original = api.backupStatus().last;
  await secondary();
  const dir = await other.getDirectoryHandle("Qalat Backups", { create: true });
  dir.interrupt = true;
  await assert.rejects(api.runBackup(), /Interrupted/);
  dir.interrupt = false;
  dir.corrupt = true;
  await assert.rejects(api.runBackup(), /SHA-256/);
  assert.equal(api.backupStatus().last.name, original.name);
  assert.match(api.backupStatus().error, /SHA-256/);
  assert(
    (await root.getDirectoryHandle("Qalat Backups")).children.has(
      original.name,
    ),
  );
});
test("retention uses the union of the newest seven daily, four weekly and twelve monthly buckets", () => {
  const { api } = setup(),
    records = [];
  for (let day = 0; day < 430; day++) {
    const date = new Date(Date.UTC(2025, 0, 1 + day)).toISOString();
    records.push({ name: date, date });
  }
  const result = api.retainedNames(records),
    back = [...records].reverse();
  function picks(key, limit) {
    const seen = new Set(),
      names = [];
    for (const r of back) {
      const k = key(r.date);
      if (!seen.has(k)) {
        seen.add(k);
        names.push(r.name);
      }
      if (seen.size === limit) break;
    }
    return names;
  }
  const expected = new Set([
    ...back.slice(0, 7).map((r) => r.name),
    ...picks((d) => Math.floor((Date.parse(d) / 86400000 + 3) / 7), 4),
    ...picks((d) => d.slice(0, 7), 12),
  ]);
  assert.deepEqual(result, expected);
});

test("shared secondary retention keeps independent same-name workspaces", async () => {
  const { api, root, other, connect, secondary } = setup();
  await connect();
  await secondary();
  await api.runBackup();
  const first = api.backupStatus().last.name;
  await connect(new Folder(root.name));
  await api.runBackup();
  const copies = await other.getDirectoryHandle("Qalat Backups");
  assert(copies.children.has(first));
  assert.equal(copies.children.size, 2);
});

test("workspace files changed between reads abort before publication", async () => {
  const { root, api, connect } = setup();
  await connect();
  const projects = await root.getDirectoryHandle("projects", { create: true }),
    dir = await projects.getDirectoryHandle("film", { create: true });
  const date = new Date().toISOString();
  await dir.put(
    "project.json",
    JSON.stringify({
      id: randomUUID(),
      name: "Film",
      slug: "film",
      type: "custom",
      createdAt: date,
      modifiedAt: date,
      version: "1.0",
      tags: [],
      settings: { defaultExportFormat: "json" },
    }),
  );
  let reads = 0;
  dir.children.set("changing.bin", {
    kind: "file",
    getFile: async () => new Blob([String(++reads)]),
  });
  await assert.rejects(api.runBackup(), /changed during backup/);
  assert.equal(api.backupStatus().last, undefined);
  assert.equal(
    (await root.getDirectoryHandle("Qalat Backups")).children.size,
    0,
  );
});
test("invalid task relationships fail preflight without rewriting the source", async () => {
  const { api, ls, connect } = setup();
  await connect();
  const task = api.createPlannerItem({ title: "Broken occurrence" });
  const bad = JSON.stringify([
    { ...task, occurrence: { slot: "2026-01-01", seriesId: "absent" } },
  ]);
  ls.setItem("qah:planner", bad);
  await assert.rejects(api.runBackup(), /Missing recurrence root/);
  assert.equal(ls.getItem("qah:planner"), bad);
  assert.equal(api.backupStatus().last, undefined);
});
