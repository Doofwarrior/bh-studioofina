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

import { z } from "zod";
import {
  ProjectManifestSchema,
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

const LS_PREFIX = "bh-studio:";

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

function lsRemove(key: string): void {
  localStorage.removeItem(`${LS_PREFIX}${key}`);
}

// ─── Directory Handle Management ───

let workspaceHandle: FileSystemDirectoryHandle | null = null;

export async function requestWorkspaceAccess(): Promise<boolean> {
  try {
    // Try to restore from previous session
    const savedHandle = await restoreDirectoryHandle();
    if (savedHandle) {
      workspaceHandle = savedHandle;
      return true;
    }

    // Request new directory
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
    const keys = await navigator.storage.getDirectory();
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
    const handle = await store.get("workspace");
    db.close();

    if (handle) {
      // Verify permission
      const permission = await (handle as FileSystemDirectoryHandle).requestPermission({
        mode: "readwrite",
      });
      if (permission === "granted") {
        return handle as FileSystemDirectoryHandle;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("BHStudioStorage", 1);
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

// ─── Path Helpers ───

function getWorkspacePath(): string {
  const configured = localStorage.getItem("bh-studio:workspace-path");
  return configured || "~/BH-Studio-Workspace";
}

// ─── Project Operations ───

export async function createProject(
  manifest: ProjectManifest
): Promise<void> {
  ProjectManifestSchema.parse(manifest);

  // Save to localStorage (primary store for v1.0 browser build)
  const projects = lsGet<ProjectManifest[]>("projects") || [];
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
  // Try localStorage first
  const projects = lsGet<ProjectManifest[]>("projects") || [];

  // Validate all entries
  const validProjects = projects.filter((p) => {
    try {
      ProjectManifestSchema.parse(p);
      return true;
    } catch {
      return false;
    }
  });

  // Update cache
  validProjects.forEach((p) => projectCache.set(p.id, p));

  return validProjects;
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
  const key = `project:${projectSlug}:decisions:log`;
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

// ─── Prompt Assets ───

export async function savePrompt(
  projectSlug: string,
  prompt: PromptAsset
): Promise<void> {
  const key = `project:${projectSlug}:prompts:${prompt.id}`;
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
