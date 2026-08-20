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

/**
 * Initialize the storage layer without invoking a user-gesture-only picker.
 * Restores a previously persisted workspace handle when permission is already granted.
 */
export async function initialize(): Promise<void> {
  const savedHandle = await restoreDirectoryHandle();
  if (savedHandle) {
    workspaceHandle = savedHandle;
  }
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
  try {
    const handle = await window.showDirectoryPicker({
      mode: "readwrite",
      startIn: "documents",
    });

    workspaceHandle = handle;
    await saveDirectoryHandle(handle);
    return true;
  } catch {
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
    }
    return null;
  } catch {
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

  // Save to localStorage (primary store for v1.0 browser build)
  const projects = lsGet<ProjectManifest[]>("projects") || [];

  if (projects.some((p) => p.slug === manifest.slug)) {
    throw new Error(`Project with slug already exists: ${manifest.slug}`);
  }

  projects.push(manifest);
  lsSet("projects", projects);

  // Create folder structure in File System Access API if available
  if (workspaceHandle) {
    try {
      const projectsDir = await workspaceHandle.getDirectoryHandle("projects", {
        create: true,
      });
      const projectDir = await projectsDir.getDirectoryHandle(manifest.slug, {
        create: true,
      });

      for (const folder of PROJECT_FOLDERS) {
        await projectDir.getDirectoryHandle(folder, { create: true });
      }

      // Write project.json
      const fileHandle = await projectDir.getFileHandle(
        PROJECT_MANIFEST_FILENAME,
        { create: true }
      );
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(manifest, null, 2));
      await writable.close();
    } catch (err) {
      console.warn("[Storage] File System Access API failed, using localStorage:", err);
    }
  }

  // Cache it
  projectCache.set(manifest.id, manifest);
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

export async function appendDecision(
  projectSlug: string,
  entry: DecisionEntry
): Promise<void> {
  DecisionEntrySchema.parse(entry);

  const key = `project:${projectSlug}:decisions:decisions.json`;
  const existing = lsGet<DecisionEntry[]>(key) || [];
  existing.push(entry);
  lsSet(key, existing);

  // Also write to File System Access API
  await writeFile(
    projectSlug,
    "decisions",
    "decisions.json",
    JSON.stringify(existing, null, 2)
  );
}

export async function readDecisions(
  projectSlug: string
): Promise<DecisionEntry[]> {
  // Try File System Access API first
  if (workspaceHandle) {
    try {
      const projectsDir = await workspaceHandle.getDirectoryHandle("projects");
      const projectDir = await projectsDir.getDirectoryHandle(projectSlug);
      const decisionsDir = await projectDir.getDirectoryHandle("decisions");
      const fileHandle = await decisionsDir.getFileHandle("decisions.json");
      const file = await fileHandle.getFile();
      const text = await file.text();
      const decisions = JSON.parse(text) as unknown[];
      return decisions.map((d) => DecisionEntrySchema.parse(d));
    } catch {
      // Fall through to localStorage
    }
  }

  // Fallback to localStorage
  const key = `project:${projectSlug}:decisions:decisions.json`;
  const existing = lsGet<DecisionEntry[]>(key) || [];
  return existing.filter((d) => {
    try {
      DecisionEntrySchema.parse(d);
      return true;
    } catch {
      return false;
    }
  });
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
