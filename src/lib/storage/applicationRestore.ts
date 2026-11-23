import { ProjectManifestSchema, type ProjectManifest } from "@/types/project";
import { PROJECT_FOLDERS } from "../constants";
import { timerKey, timerSchema } from "../workTimer";
import { browserRows, inventory, archiveHash } from "./applicationBackup";
import { backupWorkspace, readRestoreState, writeRestoreState } from "./index";

import {
  safePath,
  validateRecoveryRecords,
  type Snapshot,
} from "./restoreArchive";

type RowChange = { key: string; before: string | null; after: string };
type FileChange = {
  path: string;
  before: Blob | null;
  after: Blob;
  oldHash: string | null;
  hash: string;
};
export type Choice =
  { kind: "full" } | { kind: "preferences" } | { kind: "project"; id: string };
export interface Plan {
  root: FileSystemDirectoryHandle;
  rows: RowChange[];
  files: FileChange[];
  dirs: string[];
  owners: Record<string, string>;
  taskCount: number;
  calendarCount: number;
  historyCount: number;
  projects: string[];
  choice: Choice;
  recordCount: number;
  fileCount: number;
}
export const restoreLock = "qah:recovery-access";
export const pendingRestore = () => readRestoreState<Plan>("pending");
export const previousRestore = () => readRestoreState<Plan>("previous");
const isMissing = (e: unknown) =>
  e instanceof DOMException && e.name === "NotFoundError";
async function requiredWorkspace() {
  const root = backupWorkspace();
  if (
    !root ||
    (await root.queryPermission({ mode: "readwrite" })) !== "granted"
  )
    throw Error("Reconnect the authorized workspace before recovery.");
  return root;
}
async function projectMap(s: Snapshot) {
  const projects = new Map<string, ProjectManifest>();
  for (const p of ProjectManifestSchema.array().parse(
    JSON.parse(s.browser["qah:projects"] ?? "[]"),
  ))
    projects.set(p.id, p);
  for (const [path, file] of s.files)
    if (/^projects\/[^/]+\/project\.json$/.test(path)) {
      const p = ProjectManifestSchema.parse(JSON.parse(await file.text()));
      if (
        p.slug !== path.split("/")[1] ||
        (projects.has(p.id) && projects.get(p.id)!.slug !== p.slug)
      )
        throw Error("Conflicting project identity: " + path);
      projects.set(p.id, p);
    }
  return projects;
}
export const archiveProjects = projectMap;
function timer(raw: string | undefined) {
  const state = timerSchema.parse(
    JSON.parse(raw ?? '{"version":1,"open":[],"entries":[]}'),
  );
  if (state.active || state.pending)
    throw Error(
      "Stop active timers and resolve interrupted time before restoring timer data.",
    );
  return state;
}
function selectRows(
  s: Snapshot,
  choice: Choice,
  p: ProjectManifest | undefined,
  current: Snapshot,
) {
  if (choice.kind === "full") {
    const rows = { ...s.browser };
    if (rows["qah:projects"] && current.browser["qah:projects"]) {
      const archived: ProjectManifest[] = JSON.parse(rows["qah:projects"]);
      const ids = new Set(archived.map((p) => p.id));
      const retained: ProjectManifest[] = JSON.parse(
        current.browser["qah:projects"],
      ).filter((p: ProjectManifest) => !ids.has(p.id));
      if (retained.length)
        rows["qah:projects"] = JSON.stringify([...archived, ...retained]);
    }
    return rows;
  }
  const rows: Record<string, string> = {};
  for (const [k, v] of Object.entries(s.browser)) {
    if (choice.kind === "preferences") {
      if (
        k === "qah:calendar-view-settings" ||
        k === "qah:work-timer:display" ||
        k.startsWith("qah:work-view:")
      )
        rows[k] = v;
      continue;
    }
    const id = choice.id,
      slug = p!.slug;
    if (k === "qah:projects") {
      const original: ProjectManifest[] = JSON.parse(
          current.browser[k] ?? "[]",
        ),
        record = (JSON.parse(v) as ProjectManifest[]).find(
          (row) => row.id === id,
        );
      if (record)
        rows[k] = JSON.stringify([
          ...original.filter((row) => row.id !== id),
          record,
        ]);
    } else if (k === timerKey) {
      const source = timer(v),
        dest = timer(current.browser[k]);
      if (
        source.open.some((r) => r.target.projectId === id) ||
        dest.open.some((r) => r.target.projectId === id)
      )
        throw Error(
          "Close this project's timer runs before selective recovery.",
        );
      const entries = source.entries.filter((e) => e.target.projectId === id);
      if (entries.length || dest.entries.some((e) => e.target.projectId === id))
        rows[k] = JSON.stringify({
          ...dest,
          entries: [
            ...dest.entries.filter((e) => e.target.projectId !== id),
            ...entries,
          ],
        });
    } else if (
      k === "qah:planner:project:" + encodeURIComponent(id) ||
      k.startsWith("qah:calendar:project:" + encodeURIComponent(id) + ":") ||
      k.startsWith("qah:haqverse:" + id + ":") ||
      k.startsWith("qah:project:" + slug + ":") ||
      (k.startsWith("qah:work-history:") && JSON.parse(v).projectId === id) ||
      (k.startsWith("qah:reminder-delivery:") &&
        JSON.parse(k.slice("qah:reminder-delivery:".length))[0] === id)
    )
      rows[k] = v;
  }
  return rows;
}
async function directory(
  root: FileSystemDirectoryHandle,
  path: string,
  create = false,
) {
  let dir = root;
  for (const name of path.split("/")) {
    dir = await dir.getDirectoryHandle(name, { create });
    if (dir.name !== name) throw Error("Directory name collision: " + path);
  }
  return dir;
}
async function actualFile(root: FileSystemDirectoryHandle, path: string) {
  const parts = safePath(path),
    name = parts.pop()!;
  try {
    const dir = await directory(root, parts.join("/"));
    const handle = await dir.getFileHandle(name);
    if (handle.name !== name) throw Error("File name collision: " + path);
    return await handle.getFile();
  } catch (e) {
    if (isMissing(e)) return null;
    throw e;
  }
}
export async function previewRestore(
  source: Snapshot,
  choice: Choice,
): Promise<Plan> {
  const root = await requiredWorkspace();
  const current = { browser: browserRows(), files: await inventory(root) };
  timer(current.browser[timerKey]);
  const catalog = await projectMap(source),
    existing = await projectMap(current);
  const selected =
    choice.kind === "project" ? catalog.get(choice.id) : undefined;
  if (choice.kind === "project" && !selected)
    throw Error("Missing selected project.");
  const targets =
    choice.kind === "full" ? [...catalog.values()] : selected ? [selected] : [];
  for (const p of targets)
    for (const other of existing.values())
      if ((p.id === other.id) !== (p.slug === other.slug))
        throw Error("Project ID or folder collision: " + p.slug);
  const incoming = selectRows(source, choice, selected, current);
  if (choice.kind === "full") {
    timer(incoming[timerKey]);
  }
  const rows: RowChange[] = [],
    files: FileChange[] = [],
    dirs = new Set<string>();
  const merged = {
    browser: { ...current.browser, ...incoming },
    files: new Map(current.files),
  };
  let fileCount = 0;
  for (const [path, after] of source.files) {
    if (
      choice.kind !== "full" &&
      (!selected || !path.startsWith("projects/" + selected.slug + "/"))
    )
      continue;
    fileCount++;
    merged.files.set(path, after);
    const before = await actualFile(root, path),
      oldHash = before && (await archiveHash(before)),
      hash = await archiveHash(after);
    if (oldHash !== hash) files.push({ path, before, after, oldHash, hash });
  }
  for (const [key, after] of Object.entries(incoming)) {
    const before = current.browser[key] ?? null;
    if (
      choice.kind === "project" &&
      before &&
      key.startsWith("qah:work-history:") &&
      JSON.parse(before).projectId !== choice.id
    )
      throw Error("History ID belongs to a different project.");
    if (key.startsWith("qah:backup:") && before !== null && before !== after)
      throw Error("A different existing backup occupies this browser key: " + key);
    if (before !== after) rows.push({ key, before, after });
  }
  // Include required empty application folders when rebuilding a filesystem project.
  const wanted = new Set<string>();
  for (const f of files) {
    const parts = f.path.split("/");
    for (let i = 1; i < parts.length; i++)
      wanted.add(parts.slice(0, i).join("/"));
  }
  for (const p of targets)
    if (source.files.has("projects/" + p.slug + "/project.json"))
      for (const folder of PROJECT_FOLDERS)
        wanted.add("projects/" + p.slug + "/" + folder);
  for (const path of wanted) {
    try {
      await directory(root, path);
    } catch (e) {
      if (!isMissing(e)) throw e;
      dirs.add(path);
    }
  }
  await validateRecoveryRecords(merged.browser, merged.files);
  const owners = Object.fromEntries(targets.map((p) => [p.slug, p.id]));
  const taskCount = Object.entries(incoming)
    .filter(
      ([k]) => k === "qah:planner" || k.startsWith("qah:planner:project:"),
    )
    .reduce((n, [, v]) => n + JSON.parse(v).length, 0);
  return {
    root,
    choice,
    owners,
    taskCount,
    calendarCount: Object.keys(incoming).filter((k) =>
      k.startsWith("qah:calendar:"),
    ).length,
    historyCount: Object.keys(incoming).filter((k) =>
      k.startsWith("qah:work-history:"),
    ).length,
    projects: targets.map((p) => p.name + " (" + p.id + ")"),
    rows,
    files,
    dirs: [...dirs].sort(),
    recordCount: Object.keys(incoming).length,
    fileCount,
  };
}
function signature(p: Plan) {
  return JSON.stringify([
    p.choice,
    p.projects,
    p.rows,
    p.files.map((f) => [f.path, f.oldHash, f.hash]),
    p.dirs,
    p.recordCount,
    p.fileCount,
  ]);
}
async function detached(blob: Blob | null, digest: string | null) {
  if (!blob) return null;
  const parts: ArrayBuffer[] = [];
  for (let i = 0; i < blob.size; i += 4194304)
    parts.push(await blob.slice(i, i + 4194304).arrayBuffer());
  const copy = new Blob(parts);
  if ((await archiveHash(copy)) !== digest)
    throw Error("File changed while staging recovery.");
  return copy;
}
export async function startRestore(
  source: Snapshot,
  preview: Plan,
  confirmed: boolean,
) {
  if (!confirmed) throw Error("Explicit confirmation required.");
  if (await pendingRestore())
    throw Error("Finish the interrupted recovery first.");
  const plan = await previewRestore(source, preview.choice);
  if (
    !(await plan.root.isSameEntry(preview.root)) ||
    signature(plan) !== signature(preview)
  )
    throw Error("Destination changed. Preview again.");
  for (const f of plan.files) {
    f.before = await detached(f.before, f.oldHash);
    f.after = (await detached(f.after, f.hash))!;
  }
  await writeRestoreState("pending", plan);
  await finishRestore(false);
}
export async function finishRestore(undo: boolean) {
  const plan = await pendingRestore();
  if (!plan) throw Error("No pending restore.");
  const root = await requiredWorkspace();
  if (!(await root.isSameEntry(plan.root)))
    throw Error("Reconnect the original recovery folder.");
  for (const [slug, id] of Object.entries(plan.owners)) {
    const path = "projects/" + slug + "/project.json",
      manifest = await actualFile(root, path);
    if (
      manifest &&
      !(
        manifest.size === 0 &&
        plan.files.some((f) => f.path === path && f.before === null)
      ) &&
      ProjectManifestSchema.parse(JSON.parse(await manifest.text())).id !== id
    )
      throw Error("Workspace project identity changed: " + slug);
  }
  // Only overwrite the reviewed states. Unknown external changes require inspection.
  for (const row of plan.rows) {
    const raw = localStorage.getItem(row.key);
    if (raw !== row.before && raw !== row.after)
      throw Error("Browser record changed externally: " + row.key);
  }
  if (!undo) for (const dir of plan.dirs) await directory(root, dir, true);
  for (const f of plan.files) {
    const file = await actualFile(root, f.path),
      actual = file && (await archiveHash(file)),
      target = undo ? f.oldHash : f.hash;
    if (actual === target) continue;
    if (
      actual !== f.oldHash &&
      actual !== f.hash &&
      !(file?.size === 0 && f.before === null)
    )
      throw Error("File changed externally: " + f.path);
    const parts = safePath(f.path),
      name = parts.pop()!,
      dir = await directory(root, parts.join("/"));
    const blob = undo ? f.before : f.after;
    if (blob === null) {
      await dir.removeEntry(name);
      continue;
    }
    if ((await archiveHash(blob)) !== target)
      throw Error("Journal checksum mismatch.");
    const writer = await (
      await dir.getFileHandle(name, { create: true })
    ).createWritable();
    await writer.write(blob);
    await writer.close();
  }
  for (const row of plan.rows) {
    const raw = undo ? row.before : row.after;
    if (raw === null) localStorage.removeItem(row.key);
    else localStorage.setItem(row.key, raw);
  }
  for (const row of plan.rows)
    if (localStorage.getItem(row.key) !== (undo ? row.before : row.after))
      throw Error("Browser readback failed: " + row.key);
  for (const f of plan.files) {
    const file = await actualFile(root, f.path);
    if ((file && (await archiveHash(file))) !== (undo ? f.oldHash : f.hash))
      throw Error("File readback failed: " + f.path);
  }
  if (undo) {
    for (const path of [...plan.dirs].reverse()) {
      const parts = path.split("/"),
        name = parts.pop()!;
      try {
        const parent = parts.length
          ? await directory(root, parts.join("/"))
          : root;
        await parent.getDirectoryHandle(name); // Never remove a file substituted for a directory.
        await parent.removeEntry(name);
      } catch (e) {
        if (
          !isMissing(e) &&
          !(e instanceof DOMException && e.name === "InvalidModificationError")
        )
          throw e;
      }
    }
  } else {
    await validateRecoveryRecords(browserRows(), await inventory(root));
    await writeRestoreState("previous", plan);
  }
  await writeRestoreState("pending", undefined);
}
export async function undoPreviousRestore() {
  if (await pendingRestore())
    throw Error("Finish the pending operation first.");
  timer(browserRows()[timerKey]);
  const plan = await previousRestore();
  if (!plan) throw Error("No previous restore.");
  if (!(await (await requiredWorkspace()).isSameEntry(plan.root)))
    throw Error("Reconnect the original recovery folder.");
  for (const r of plan.rows)
    if (localStorage.getItem(r.key) !== r.after)
      throw Error("Cannot undo after a subsequent edit: " + r.key);
  for (const f of plan.files) {
    const file = await actualFile(plan.root, f.path);
    if (!file || (await archiveHash(file)) !== f.hash)
      throw Error("Cannot undo after a subsequent file edit: " + f.path);
  }
  await writeRestoreState("pending", plan);
  await finishRestore(true);
  await writeRestoreState("previous", undefined);
}
