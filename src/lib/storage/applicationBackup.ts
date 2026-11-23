import { z } from "zod";
import {
  backupSourceId,
  backupWorkspace,
  secondaryBackupFolder,
} from "./index";
import {
  validateSnapshot,
  type ProjectFiles,
  type BrowserRows,
} from "./backupValidation";

const control = "qah:backup-control:";
const ledgerKey = control + "verified",
  errorKey = control + "error";
const folderName = "Qalat Backups";
// Large files are hashed in bounded blocks. The manifest records the SHA-256
// of each block, including its order; raw attachment bytes follow the header.
const blockBytes = 4 * 1024 * 1024;
interface Receipt {
  source: string;
  name: string;
  date: string;
  hash: string;
  destinations: string[];
}
const receiptSchema = z.object({
  source: z.string().uuid(),
  name: z.string().regex(/^qalat-[0-9TZ.-]+-[0-9a-f-]{36}\.qab$/),
  date: z.string().datetime(),
  hash: z.string().regex(/^[0-9a-f]{64}$/),
  destinations: z.array(z.string()),
});
function ledger(): Receipt[] {
  return receiptSchema
    .array()
    .parse(JSON.parse(localStorage.getItem(ledgerKey) ?? "[]"));
}

let transientError: string | null = null;
export function backupStatus(): { last?: Receipt; error: string | null } {
  try {
    return {
      last: ledger().at(-1),
      error: transientError ?? localStorage.getItem(errorKey),
    };
  } catch {
    return {
      error: "Backup status records could not be read. Rotation is disabled.",
    };
  }
}
export function browserRows(): BrowserRows {
  const result: BrowserRows = {};
  for (const key of Object.keys(localStorage).sort())
    if (key.startsWith("qah:") && !key.startsWith(control)) {
      const value = localStorage.getItem(key);
      if (value === null) throw Error("Browser data changed during capture.");
      result[key] = value;
    }
  return result;
}
async function hash(bytes: ArrayBuffer) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (v) => v.toString(16).padStart(2, "0"),
  ).join("");
}
const hashText = (value: string) =>
  hash(new TextEncoder().encode(value).buffer);
function missing(e: unknown) {
  return e instanceof DOMException && e.name === "NotFoundError";
}
export async function inventory(root: FileSystemDirectoryHandle) {
  const files: ProjectFiles = new Map();
  let projects;
  try {
    projects = await root.getDirectoryHandle("projects");
  } catch (e) {
    if (missing(e)) return files;
    throw e;
  }
  async function walk(dir: FileSystemDirectoryHandle, parent: string) {
    for await (const [name, h] of dir.entries()) {
      const path = parent + "/" + name;
      if (h.kind === "directory") await walk(h, path);
      else {
        const file = await h.getFile();
        files.set(path, file);
      }
    }
  }
  for await (const [slug, h] of projects.entries()) {
    if (h.kind !== "directory")
      throw Error("Unexpected file in projects: " + slug);
    await walk(h, "projects/" + slug);
    if (!files.has("projects/" + slug + "/project.json"))
      throw Error("Missing project.json in projects/" + slug);
  }
  return files;
}
async function blockHashes(blob: Blob) {
  const blocks: string[] = [];
  for (let offset = 0; offset < blob.size; offset += blockBytes)
    blocks.push(
      await hash(await blob.slice(offset, offset + blockBytes).arrayBuffer()),
    );
  return blocks;
}
export async function archiveHash(blob: Blob) {
  return hashText(
    JSON.stringify({
      size: blob.size,
      blockBytes,
      blocks: await blockHashes(blob),
    }),
  );
}
async function capture(root: FileSystemDirectoryHandle, date: string) {
  const browser = browserRows(),
    files = await inventory(root);
  await validateSnapshot(browser, files);
  const workspace = [];
  const bodies: File[] = [];
  for (const path of [...files.keys()].sort()) {
    const file = files.get(path)!;
    workspace.push({ path, size: file.size, blocks: await blockHashes(file) });
    bodies.push(file);
  }
  const manifest = {
    format: "QALAT-APPLICATION-BACKUP",
    version: 1,
    created: date,
    blockBytes,
    covered: [
      "QAL’AT qah: browser records",
      "all files under projects/, including manifests and reference copies",
    ],
    excluded: [
      "backup control metadata",
      "workspace files outside projects/",
      "external linked file contents",
      "browser handles and permission grants",
    ],
    browserSha256: await hashText(JSON.stringify(browser)),
    browser,
    workspace,
  };
  const header = JSON.stringify(manifest);
  // One UTF-8 envelope line followed by file bodies in manifest order.
  const body = new Blob([
    JSON.stringify({ sha256: await hashText(header), manifest }) + "\n",
    ...bodies,
  ]);
  const digest = await archiveHash(body);
  const again = await inventory(root);
  if (again.size !== workspace.length)
    throw Error("Workspace contents changed during backup.");
  for (const record of workspace) {
    const file = again.get(record.path);
    if (
      !file ||
      file.size !== record.size ||
      JSON.stringify(await blockHashes(file)) !== JSON.stringify(record.blocks)
    )
      throw Error("Workspace file changed during backup: " + record.path);
  }
  if (JSON.stringify(browser) !== JSON.stringify(browserRows()))
    throw Error("Browser records changed during backup. Retry.");
  return { body, digest };
}
export function retainedNames(records: Receipt[]) {
  // Newest verified snapshot in each distinct UTC day, Monday-based week and month.
  const keep = new Set<string>(),
    days = new Set<string>(),
    weeks = new Set<string>(),
    months = new Set<string>();
  for (const r of [...records].sort(
    (a, b) => b.date.localeCompare(a.date) || b.name.localeCompare(a.name),
  )) {
    const day = r.date.slice(0, 10),
      monday = new Date(day + "T00:00:00Z");
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    for (const [set, bucket, limit] of [
      [days, day, 7],
      [weeks, monday.toISOString().slice(0, 10), 4],
      [months, day.slice(0, 7), 12],
    ] as const) {
      if (set.size < limit && !set.has(bucket)) {
        set.add(bucket);
        keep.add(r.name);
      }
    }
  }
  return keep;
}
async function exists(dir: FileSystemDirectoryHandle, name: string) {
  try {
    return await dir.getFileHandle(name);
  } catch (e) {
    if (missing(e)) return null;
    throw e;
  }
}
async function publish(
  dir: FileSystemDirectoryHandle,
  receipt: Receipt,
  body: Blob,
) {
  if (await exists(dir, receipt.name))
    throw Error("Backup filename already exists.");
  const file = await dir.getFileHandle(receipt.name, { create: true });
  const writer = await file.createWritable();
  try {
    await writer.write(body);
    await writer.close();
  } catch (e) {
    await writer.abort().catch(() => {});
    throw e;
  }
  if ((await archiveHash(await file.getFile())) !== receipt.hash)
    throw Error("Written backup failed SHA-256 verification.");
}
async function rotate(
  dir: FileSystemDirectoryHandle,
  receipts: Receipt[],
  latest: Receipt,
) {
  const known = new Map(receipts.map((r) => [r.name, r]));
  const present: Receipt[] = [];
  for await (const [name, handle] of dir.entries()) {
    const r = known.get(name);
    if (
      r &&
      handle.kind === "file" &&
      (await archiveHash(await handle.getFile())) === r.hash
    )
      present.push(r);
  }
  if (!present.some((r) => r.name === latest.name))
    throw Error(
      "Replacement backup unavailable before rotation. All copies retained.",
    );
  const keep = retainedNames(present);
  for (const r of present) {
    if (keep.has(r.name) || r.name === latest.name) continue;
    const file = await dir.getFileHandle(r.name);
    if ((await archiveHash(await file.getFile())) === r.hash)
      await dir.removeEntry(r.name);
  }
}
export async function runBackup(automatic = false) {
  try {
    if (!navigator.locks)
      throw Error("Browser lock support is required for backups.");
    await navigator.locks.request("qah:application-backup", async () => {
      const root = backupWorkspace();
      if (!root)
        throw Error("Connect an authorized workspace to create a backup.");
      const secondary = await secondaryBackupFolder();
      if (
        secondary &&
        ((await root.resolve(secondary)) !== null ||
          (await secondary.resolve(root)) !== null)
      )
        throw Error("Secondary destination must be outside the workspace.");
      const folders = [root, ...(secondary ? [secondary] : [])];
      for (const f of folders)
        if ((await f.queryPermission({ mode: "readwrite" })) !== "granted")
          throw Error(
            "Backup permission unavailable for " +
              f.name +
              ". Reauthorize this folder.",
          );
      const dirs = await Promise.all(
        folders.map((f) => f.getDirectoryHandle(folderName, { create: true })),
      );
      const source = await backupSourceId(root);
      const records = ledger(),
        date = new Date().toISOString(),
        last = records.filter((r) => r.source === source).at(-1);
      if (
        automatic &&
        last?.date.slice(0, 10) === date.slice(0, 10) &&
        !localStorage.getItem(errorKey)
      ) {
        const complete = await Promise.all(
          dirs.map((d) => exists(d, last.name)),
        );
        if (complete.every(Boolean)) return;
      }
      const { body, digest } = await capture(root, date);
      if (root !== backupWorkspace())
        throw Error("Workspace changed during backup.");
      const receipt: Receipt = {
        source,
        name:
          "qalat-" +
          date.replace(/:/g, "-") +
          "-" +
          crypto.randomUUID() +
          ".qab",
        date,
        hash: digest,
        destinations: folders.map((f) => f.name + "/" + folderName),
      };
      for (const dir of dirs) await publish(dir, receipt, body);
      records.push(receipt);
      localStorage.setItem(ledgerKey, JSON.stringify(records));
      localStorage.removeItem(errorKey);
      transientError = null;
      for (const dir of dirs)
        await rotate(
          dir,
          records.filter((r) => r.source === source),
          receipt,
        );
    });
  } catch (e) {
    transientError = e instanceof Error ? e.message : String(e);
    try {
      localStorage.setItem(errorKey, transientError);
    } catch {
      /* The failure remains visible when browser storage is full. */
    }
    throw e;
  } finally {
    window.dispatchEvent(new Event("qah:backup-status"));
  }
}
