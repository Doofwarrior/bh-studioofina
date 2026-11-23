/**
 * BH Studio v1.0 — Storage API
 *
 * The ONLY module allowed to perform filesystem operations.
 *
 * Implementation: Browser File System Access API + localStorage fallback.
 * Future: Replace with Tauri FS API for native desktop builds.
 *
 * Rules:
 * - Async and Promise-based
 * - Validates all writes against Zod schemas
 * - Maintains in-memory cache of open projects
 * - Auto-backs up any file before overwriting
 */

import {
  ProjectManifestSchema,
  DecisionEntrySchema,
  PromptAssetSchema,
  type ProjectManifest,
  type DecisionEntry,
  type PromptAsset,
} from "@/types/project";
import {
  PROJECT_MANIFEST_FILENAME,
  PROJECT_FOLDERS,
} from "@/lib/constants";

// ─── In-Memory Cache ───

const projectCache = new Map<string, ProjectManifest>();

// ─── localStorage Helpers ───

const LS_PREFIX = "qah:";

function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function lsSet(key: string, value: unknown): void {
  localStorage.setItem(`${LS_PREFIX}${key}`, JSON.stringify(value));
}

// ─── Directory Handle Management ───

declare global {
  interface Window {
    showDirectoryPicker(options?: {
      mode?: "readwrite" | "read";
      startIn?: "documents" | "desktop" | "downloads" | "music" | "pictures" | "videos";
    }): Promise<FileSystemDirectoryHandle>;
  }
  interface FileSystemDirectoryHandle {
    name: string;
    requestPermission(descriptor: { mode: "readwrite" | "read" }): Promise<"granted" | "denied">;
    queryPermission(descriptor: { mode: "readwrite" | "read" }): Promise<"granted" | "denied" | "prompt">;
    entries(): AsyncIterableIterator<[string, FileSystemDirectoryHandle | FileSystemFileHandle]>;
  }
}

let workspaceHandle: FileSystemDirectoryHandle | null = null;

export type WorkspaceAccessIssue =
  | "unsupported"
  | "cancelled"
  | "denied"
  | "restoration-failed"
  | "storage-error"
  | null;

let workspaceAccessIssue: WorkspaceAccessIssue = null;

/**
 * Initialize the storage layer without invoking a user-gesture-only picker.
 * Restores a previously persisted workspace handle when permission is already granted.
 */
export async function initialize(): Promise<void> {
  workspaceAccessIssue = null;
  const savedHandle = await restoreDirectoryHandle();
  if (savedHandle) {
    workspaceHandle = savedHandle;
  }
}

export function getWorkspaceAccessIssue(): WorkspaceAccessIssue {
  return workspaceAccessIssue;
}

export async function requestWorkspaceAccess(): Promise<boolean> {
  try {
    // Try to restore from previous session
    const savedHandle = await restoreDirectoryHandle();
    if (savedHandle) {
      workspaceHandle = savedHandle;
      return true;
    }

    return await selectWorkspaceDirectory();
  } catch {
    workspaceAccessIssue = "storage-error";
    return false;
  }
}

// Non-gesture accessors so the UI can reflect the actual workspace connection
// state without re-invoking the native directory picker.
export function isWorkspaceConnected(): boolean {
  return workspaceHandle !== null;
}

export function getWorkspaceName(): string | null {
  return workspaceHandle?.name ?? null;
}

export async function selectWorkspaceDirectory(): Promise<boolean> {
  if (typeof window.showDirectoryPicker !== "function") {
    workspaceAccessIssue = "unsupported";
    return false;
  }

  try {
    const handle = await window.showDirectoryPicker({
      mode: "readwrite",
      startIn: "documents",
    });

    workspaceHandle = handle;
    workspaceAccessIssue = null;
    await saveDirectoryHandle(handle);
    return true;
  } catch (err) {
    workspaceAccessIssue =
      err instanceof DOMException && err.name === "AbortError"
        ? "cancelled"
        : "denied";
    return false;
  }
}

async function saveDirectoryHandle(
  handle: FileSystemDirectoryHandle
): Promise<void> {
  try {
    // Store handle in IndexedDB for persistence across sessions
    const db = await openDB();
    const tx = db.transaction("handles", "readwrite");
    const store = tx.objectStore("handles");
    await store.put(handle, "workspace");
    db.close();
  } catch {
    // Fallback: just keep in memory
  }
}

async function restoreDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB();
    const tx = db.transaction("handles", "readonly");
    const store = tx.objectStore("handles");

    const handle = await new Promise<FileSystemDirectoryHandle | null>((resolve) => {
      const request = store.get("workspace");
      request.onsuccess = () => resolve(request.result as FileSystemDirectoryHandle);
      request.onerror = () => resolve(null);
    });

    db.close();

    if (handle) {
      // Verify permission
      const permission = await handle.queryPermission({ mode: "readwrite" });
      if (permission === "granted") {
        return handle;
      }
      workspaceAccessIssue = "restoration-failed";
    }
    return null;
  } catch {
    workspaceAccessIssue = "storage-error";
    return null;
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("QAHStudioStorage", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("handles")) {
        db.createObjectStore("handles");
      }
    };
  });
}

// ─── Project Operations ───

export async function createProject(
  manifest: ProjectManifest
): Promise<void> {
  ProjectManifestSchema.parse(manifest);

  if (!navigator.locks) throw new Error("Safe project creation requires browser lock support.");
  // All slugs share one browser index. Serialize the entire check-and-create.
  await navigator.locks.request("qah:create-project", async () => {
    function readAvailableIndex() {
      const raw = localStorage.getItem(LS_PREFIX + "projects");
      const projects: ProjectManifest[] = raw === null ? [] : JSON.parse(raw);
      // Validate without transforming older records or stripping extension fields.
      ProjectManifestSchema.array().parse(projects);
      if (projects.some(p => p.slug === manifest.slug || p.id === manifest.id))
        throw new Error(`A project with this ID or slug already exists: ${manifest.slug}`);
      return projects;
    }
    readAvailableIndex();

    const workspace = workspaceHandle;
    if (workspace) {
      if (await workspace.queryPermission({mode:"readwrite"}) !== "granted")
        throw new Error("Workspace write permission is unavailable. Reconnect the folder before creating a project.");

      async function lookup(parent: FileSystemDirectoryHandle, name: string) {
        try {
          return await parent.getDirectoryHandle(name);
        } catch (error) {
          if (error instanceof DOMException && error.name === "NotFoundError") return null;
          throw error;
        }
      }

      let projectsDir = await lookup(workspace, "projects");
      if (projectsDir && await lookup(projectsDir, manifest.slug))
        throw new Error(`Workspace directory already exists: ${manifest.slug}`);
      projectsDir ??= await workspace.getDirectoryHandle("projects", {create:true});
      // File System Access has no exclusive mkdir. Other origins and external
      // filesystem writers do not participate in this origin's Web Lock.
      const projectDir = await projectsDir.getDirectoryHandle(manifest.slug, {create:true});
      for await (const entry of projectDir.entries()) {
        throw new Error(`Workspace directory already contains ${entry[0]}. Creation stopped.`);
      }
      for (const folder of PROJECT_FOLDERS)
        await projectDir.getDirectoryHandle(folder, {create:true});
      const file = await projectDir.getFileHandle(PROJECT_MANIFEST_FILENAME, {create:true});
      if ((await file.getFile()).size > 0)
        throw new Error("Workspace manifest already exists. Creation stopped.");
      const writer = await file.createWritable();
      await writer.write(JSON.stringify(manifest, null, 2));
      await writer.close();
    }
    // Project edits can update unrelated index entries during filesystem I/O.
    lsSet("projects", [...readAvailableIndex(), manifest]);
    projectCache.set(manifest.id, manifest);
  });
}

export async function readProjectManifest(
  projectSlug: string
): Promise<ProjectManifest> {
  // Check cache first
  const cached = Array.from(projectCache.values()).find(
    (p) => p.slug === projectSlug
  );
  if (cached) return cached;

  // Check localStorage
  const projects = lsGet<ProjectManifest[]>("projects") || [];
  const found = projects.find((p) => p.slug === projectSlug);
  if (found) {
    projectCache.set(found.id, found);
    return found;
  }

  // Check File System Access API
  if (workspaceHandle) {
    try {
      const projectsDir = await workspaceHandle.getDirectoryHandle("projects");
      const projectDir = await projectsDir.getDirectoryHandle(projectSlug);
      const fileHandle = await projectDir.getFileHandle(PROJECT_MANIFEST_FILENAME);
      const file = await fileHandle.getFile();
      const text = await file.text();
      const manifest = ProjectManifestSchema.parse(JSON.parse(text));
      projectCache.set(manifest.id, manifest);
      return manifest;
    } catch {
      // Fall through to error
    }
  }

  throw new Error(`Project not found: ${projectSlug}`);
}

export async function writeProjectManifest(
  manifest: ProjectManifest
): Promise<void> {
  ProjectManifestSchema.parse(manifest);

  // Update localStorage
  const projects = lsGet<ProjectManifest[]>("projects") || [];
  const index = projects.findIndex((p) => p.id === manifest.id);
  if (index >= 0) {
    projects[index] = manifest;
  } else {
    projects.push(manifest);
  }
  lsSet("projects", projects);

  // Update File System Access API
  if (workspaceHandle) {
    try {
      const projectsDir = await workspaceHandle.getDirectoryHandle("projects");
      const projectDir = await projectsDir.getDirectoryHandle(manifest.slug);
      const fileHandle = await projectDir.getFileHandle(
        PROJECT_MANIFEST_FILENAME,
        { create: true }
      );
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(manifest, null, 2));
      await writable.close();
    } catch (err) {
      console.warn("[Storage] File System Access API write failed:", err);
    }
  }

  projectCache.set(manifest.id, manifest);
}

export async function listProjects(): Promise<ProjectManifest[]> {
  // Validate localStorage entries
  const localProjects = lsGet<ProjectManifest[]>("projects") || [];
  const validLocal = localProjects.filter((p) => {
    try {
      ProjectManifestSchema.parse(p);
      return true;
    } catch {
      return false;
    }
  });

  // When a workspace is connected, reconcile with the durable on-disk store.
  if (workspaceHandle) {
    try {
      const projectsDir = await workspaceHandle.getDirectoryHandle("projects");
      const fsProjects: ProjectManifest[] = [];
      for await (const [, entry] of projectsDir.entries()) {
        if (entry.kind !== "directory") continue;
        try {
          const fileHandle = await entry.getFileHandle(PROJECT_MANIFEST_FILENAME);
          const file = await fileHandle.getFile();
          const parsed = ProjectManifestSchema.safeParse(JSON.parse(await file.text()));
          if (parsed.success) fsProjects.push(parsed.data);
        } catch {
          // Ignore malformed/partial project manifests.
        }
      }

      // Prefer filesystem manifests; dedupe by id (fallback to slug).
      const merged = new Map<string, ProjectManifest>();
      for (const p of [...validLocal, ...fsProjects]) {
        merged.set(p.id || `slug:${p.slug}`, p);
      }
      const result = Array.from(merged.values());
      result.forEach((p) => projectCache.set(p.id, p));
      return result;
    } catch {
      // FS enumeration failed; fall back to localStorage only.
    }
  }

  validLocal.forEach((p) => projectCache.set(p.id, p));
  return validLocal;
}

export async function deleteProject(projectSlug: string): Promise<void> {
  // Remove from localStorage
  const projects = lsGet<ProjectManifest[]>("projects") || [];
  const filtered = projects.filter((p) => p.slug !== projectSlug);
  lsSet("projects", filtered);

  // Remove from File System Access API
  if (workspaceHandle) {
    try {
      const projectsDir = await workspaceHandle.getDirectoryHandle("projects");
      await projectsDir.removeEntry(projectSlug, { recursive: true });
    } catch (err) {
      console.warn("[Storage] File System Access API delete failed:", err);
    }
  }

  // Remove from cache
  const toRemove = Array.from(projectCache.values()).find(
    (p) => p.slug === projectSlug
  );
  if (toRemove) projectCache.delete(toRemove.id);

  // Remove project-scoped localStorage keys (decisions, prompts, files)
  const prefix = `${LS_PREFIX}project:${projectSlug}:`;
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k?.startsWith(prefix)) {
      localStorage.removeItem(k);
    }
  }
}

// ─── File Operations ───

export async function readFile(
  projectSlug: string,
  folder: string,
  filename: string
): Promise<string> {
  // Try File System Access API first
  if (workspaceHandle) {
    try {
      const projectsDir = await workspaceHandle.getDirectoryHandle("projects");
      const projectDir = await projectsDir.getDirectoryHandle(projectSlug);
      const folderDir = await projectDir.getDirectoryHandle(folder);
      const fileHandle = await folderDir.getFileHandle(filename);
      const file = await fileHandle.getFile();
      return await file.text();
    } catch {
      // Fall through to localStorage
    }
  }

  // Fallback to localStorage
  const key = `project:${projectSlug}:${folder}:${filename}`;
  return lsGet<string>(key) || "";
}

export async function writeFile(
  projectSlug: string,
  folder: string,
  filename: string,
  content: string
): Promise<void> {
  // Auto-backup before overwrite
  try {
    const existing = await readFile(projectSlug, folder, filename);
    if (existing) {
      const backupKey = `backup:${projectSlug}:${folder}:${filename}:${Date.now()}`;
      lsSet(backupKey, existing);
    }
  } catch {
    // No existing file to backup
  }

  // Write to File System Access API
  if (workspaceHandle) {
    try {
      const projectsDir = await workspaceHandle.getDirectoryHandle("projects");
      const projectDir = await projectsDir.getDirectoryHandle(projectSlug);
      const folderDir = await projectDir.getDirectoryHandle(folder, { create: true });
      const fileHandle = await folderDir.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      return;
    } catch (err) {
      console.warn("[Storage] File System Access API write failed:", err);
    }
  }

  // Fallback to localStorage
  const key = `project:${projectSlug}:${folder}:${filename}`;
  lsSet(key, content);
}

export async function listFiles(
  projectSlug: string,
  folder: string
): Promise<string[]> {
  // Try File System Access API
  if (workspaceHandle) {
    try {
      const projectsDir = await workspaceHandle.getDirectoryHandle("projects");
      const projectDir = await projectsDir.getDirectoryHandle(projectSlug);
      const folderDir = await projectDir.getDirectoryHandle(folder);
      const files: string[] = [];
      for await (const [name, entry] of folderDir.entries()) {
        if (entry.kind === "file") {
          files.push(name);
        }
      }
      return files;
    } catch {
      // Fall through
    }
  }

  // Fallback: scan localStorage keys
  const prefix = `${LS_PREFIX}project:${projectSlug}:${folder}:`;
  const files: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) {
      files.push(key.replace(prefix, ""));
    }
  }
  return files;
}

// ─── Decision Log ───

export function decodeDecisionLog(raw: string, source: string): DecisionEntry[] {
  try {
    let value: unknown = JSON.parse(raw);
    if (typeof value === "string") value = JSON.parse(value);
    DecisionEntrySchema.array().parse(value);
    // Keep extension metadata that schema parsing would otherwise strip.
    return value as DecisionEntry[];
  } catch {
    throw new Error(`Invalid decision log in ${source}. Check the original data before appending.`);
  }
}

// Insert local-only entries before their next shared ID to preserve both logs' order.
export function reconcileDecisions(disk: DecisionEntry[], local: DecisionEntry[]): DecisionEntry[] {
  const rows = new Map(disk.map(row => [row.id, row]));
  if (rows.size !== disk.length || new Set(local.map(row => row.id)).size !== local.length)
    throw new Error("Duplicate IDs within a decision log. Review the original entries.");
  const result: DecisionEntry[] = [];
  let cursor = 0;
  for (const row of local) {
    const shared = rows.get(row.id);
    if (shared) {
      if (JSON.stringify(shared) !== JSON.stringify(row))
        throw new Error(`Conflicting decision log entries for ${row.id}.`);
      while (cursor < disk.length && disk[cursor].id !== row.id) result.push(disk[cursor++]);
      if (cursor === disk.length) throw new Error("Conflicting decision log order.");
      cursor++;
    }
    result.push(row);
  }
  return result.concat(disk.slice(cursor));
}

async function decisionState(slug: string) {
  const key = `project:${slug}:decisions:decisions.json`;
  const raw = localStorage.getItem(LS_PREFIX + key);
  const local = raw === null ? [] : decodeDecisionLog(raw, "browser storage");
  let disk: DecisionEntry[] = [];
  let diskText: string | undefined;
  let project: FileSystemDirectoryHandle | undefined;
  if (workspaceHandle) {
    try {
      const projects = await workspaceHandle.getDirectoryHandle("projects");
      project = await projects.getDirectoryHandle(slug);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "NotFoundError")) throw error;
    }
    if (project) {
      const known = lsGet<ProjectManifest[]>("projects")?.find(p => p.slug === slug);
      if (known) {
        const manifest = await (await project.getFileHandle(PROJECT_MANIFEST_FILENAME)).getFile();
        if (ProjectManifestSchema.parse(JSON.parse(await manifest.text())).id !== known.id)
          throw new Error("Workspace project identity differs. Check the connected folder.");
      }
      try {
        const dir = await project.getDirectoryHandle("decisions");
        const handle = await dir.getFileHandle("decisions.json");
        diskText = await (await handle.getFile()).text();
        disk = decodeDecisionLog(diskText, "workspace");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "NotFoundError")) throw error;
      }
    }
  }
  return {key, raw, diskText, project, entries: reconcileDecisions(disk, local)};
}

export async function appendDecision(projectSlug: string, entry: DecisionEntry): Promise<void> {
  DecisionEntrySchema.parse(entry);
  if (!globalThis.navigator?.locks) throw new Error("Safe decision-log writes require browser lock support.");
  await navigator.locks.request("qah:decision-log:" + projectSlug, async () => {
    const state = await decisionState(projectSlug);
    const existing = state.entries.find(row => row.id === entry.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(entry))
      throw new Error(`Conflicting decision log entries for ${entry.id}.`);
    if (!existing) state.entries.push(entry);
    // Canonical file representation: JSON array text, stored as a string by lsSet.
    const content = JSON.stringify(state.entries, null, 2);
    if (state.project && state.diskText !== content) {
      if (state.diskText !== undefined)
        lsSet(`backup:${projectSlug}:decisions:decisions.json:${crypto.randomUUID()}`, state.diskText);
      const dir = await state.project.getDirectoryHandle("decisions", {create:true});
      const file = await dir.getFileHandle("decisions.json", {create:true});
      const writer = await file.createWritable();
      await writer.write(content);
      await writer.close();
    }
    if (state.raw !== JSON.stringify(content)) {
      if (state.raw !== null)
        lsSet(`backup:${projectSlug}:decisions:decisions.json:${crypto.randomUUID()}`, JSON.parse(state.raw));
      lsSet(state.key, content);
    }
  });
}

export async function readDecisions(projectSlug: string): Promise<DecisionEntry[]> {
  return (await decisionState(projectSlug)).entries;
}

// ─── Prompt Assets ───

export async function savePrompt(
  projectSlug: string,
  prompt: PromptAsset
): Promise<void> {
  PromptAssetSchema.parse(prompt);

  const key = `project:${projectSlug}:prompts:${prompt.id}.json`;
  lsSet(key, prompt);

  await writeFile(
    projectSlug,
    "prompts",
    `${prompt.id}.json`,
    JSON.stringify(prompt, null, 2)
  );
}

// ─── Export ───

export async function createExportDirectory(
  projectSlug: string,
  exportId: string
): Promise<string> {
  if (workspaceHandle) {
    try {
      const projectsDir = await workspaceHandle.getDirectoryHandle("projects");
      const projectDir = await projectsDir.getDirectoryHandle(projectSlug);
      const exportsDir = await projectDir.getDirectoryHandle("exports", { create: true });
      const exportDir = await exportsDir.getDirectoryHandle(exportId, { create: true });
      return exportDir.name;
    } catch (err) {
      console.warn("[Storage] File System Access API export dir failed:", err);
    }
  }

  // Fallback: just return a virtual path
  return `${projectSlug}/exports/${exportId}`;
}

// ─── Backup ───

export async function createBackup(projectSlug: string): Promise<void> {
  const manifest = await readProjectManifest(projectSlug);
  const backupKey = `backup:project:${projectSlug}:${Date.now()}`;
  lsSet(backupKey, manifest);

  // Also backup all files
  for (const folder of PROJECT_FOLDERS) {
    try {
      const files = await listFiles(projectSlug, folder);
      for (const file of files) {
        const content = await readFile(projectSlug, folder, file);
        const fileBackupKey = `backup:file:${projectSlug}:${folder}:${file}:${Date.now()}`;
        lsSet(fileBackupKey, content);
      }
    } catch {
      // Folder might not exist
    }
  }
}

// Attachments use the existing project references directory. Verify the on-disk
// project identity because the browser cache may describe a previous workspace.
async function referenceDirectory(projectId: string) {
  if (!workspaceHandle)
    throw Error("Connect the workspace folder to access file copies.");
  const project = (await listProjects()).find((p) => p.id === projectId);
  if (!project) throw Error("Project unavailable.");
  const projects = await workspaceHandle.getDirectoryHandle("projects");
  const dir = await projects.getDirectoryHandle(project.slug);
  const manifest = await (
    await dir.getFileHandle(PROJECT_MANIFEST_FILENAME)
  ).getFile();
  if (
    ProjectManifestSchema.parse(JSON.parse(await manifest.text())).id !==
    projectId
  )
    throw Error("Workspace project identity changed.");
  return dir.getDirectoryHandle("references");
}
export async function copyTaskFile(projectId: string, file: File) {
  const dir = await referenceDirectory(projectId);
  const name = crypto.randomUUID() + "-" + file.name;
  try {
    await dir.getFileHandle(name);
    throw Error("Destination already exists.");
  } catch (err) {
    if (!(err instanceof DOMException && err.name === "NotFoundError"))
      throw err;
  }
  const handle = await dir.getFileHandle(name, { create: true });
  const writer = await handle.createWritable();
  await writer.write(file);
  await writer.close();
  const stored = await handle.getFile();
  if (stored.size !== file.size) throw Error("Stored file size differs.");
  return (
    "workspace-copy:" +
    encodeURIComponent(projectId) +
    "/" +
    encodeURIComponent(name)
  );
}
export async function readTaskCopy(projectId: string, link: string) {
  const prefix = "workspace-copy:" + encodeURIComponent(projectId) + "/";
  if (!link.startsWith(prefix))
    throw Error("File belongs to a different project.");
  const dir = await referenceDirectory(projectId);
  return (
    await dir.getFileHandle(decodeURIComponent(link.slice(prefix.length)))
  ).getFile();
}

// The secondary destination uses the same browser-authorized handle store as the workspace.
export function backupWorkspace() { return workspaceHandle; }
async function readBackupSetting<T>(key: string): Promise<T | undefined> {
  const db = await openDB();
  try {
    const request = db.transaction("handles").objectStore("handles").get(key);
    return await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}

async function writeBackupSetting(key: string, value?: unknown) {
  const db = await openDB();
  try {
    const tx = db.transaction("handles", "readwrite", key.startsWith("restore-") ? {durability: "strict"} : undefined);
    const store = tx.objectStore("handles");
    if (value === undefined) store.delete(key); else store.put(value, key);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error ?? Error("Backup setting could not be saved."));
    });
  } finally { db.close(); }
}

export function secondaryBackupFolder() {
  return readBackupSetting<FileSystemDirectoryHandle>("backup-secondary");
}

export async function configureSecondaryBackup(enable: boolean) {
  if (enable && typeof window.showDirectoryPicker !== "function")
    throw Error("This browser does not expose its folder picker.");
  const folder = enable ? await window.showDirectoryPicker({mode: "readwrite"}) : undefined;
  if (folder && workspaceHandle &&
      (await workspaceHandle.resolve(folder) !== null || await folder.resolve(workspaceHandle) !== null))
    throw Error("Choose a separate folder outside the workspace.");
  await writeBackupSetting("backup-secondary", folder);
  return folder?.name;
}

// Called inside the backup lock. Distinct workspaces can have the same name
// and can share a secondary destination. Rotate each source independently.
export async function backupSourceId(folder: FileSystemDirectoryHandle) {
  const sources = await readBackupSetting<{folder: FileSystemDirectoryHandle; id: string}[]>("backup-sources") ?? [];
  for (const source of sources) if (await folder.isSameEntry(source.folder)) return source.id;
  const id = crypto.randomUUID();
  await writeBackupSetting("backup-sources", [...sources, {folder, id}]);
  return id;
}

export function readRestoreState<T>(key: "pending" | "previous") {
  return readBackupSetting<T>("restore-" + key);
}
export function writeRestoreState(key: "pending" | "previous", state?: unknown) {
  return writeBackupSetting("restore-" + key, state);
}
