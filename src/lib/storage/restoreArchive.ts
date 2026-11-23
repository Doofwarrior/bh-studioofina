import type { PlannerItem } from "../planner";
import { z } from "zod";
import { ContentNoteSchema } from "@/types/content";
import { ProjectManifestSchema, PromptAssetSchema } from "@/types/project";
import {
  HaqVerseVisualAssetSchema,
  HaqVerseWorldRuleSchema,
  HaqVerseMotionRuleSchema,
  HaqVerseCameraMovementSchema,
} from "@/features/haqverse/domain/schemas";
import {
  validateSnapshot,
  type BrowserRows,
  type ProjectFiles,
} from "./backupValidation";
const digest = z.string().regex(/^[0-9a-f]{64}$/);
const manifestSchema = z
  .object({
    format: z.literal("QALAT-APPLICATION-BACKUP"),
    version: z.literal(1),
    created: z.string().datetime(),
    blockBytes: z.literal(4 * 1024 * 1024),
    covered: z.array(z.string()),
    excluded: z.array(z.string()),
    browserSha256: digest,
    browser: z.record(z.string()),
    workspace: z.array(
      z
        .object({
          path: z.string(),
          size: z.number().int().nonnegative().safe(),
          blocks: z.array(digest),
        })
        .strict(),
    ),
  })
  .strict();
export async function sha(bytes: ArrayBuffer) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (v) => v.toString(16).padStart(2, "0"),
  ).join("");
}
const textHash = (s: string) => sha(new TextEncoder().encode(s).buffer);
export function safePath(path: string) {
  const parts = path.split("/");
  if (
    parts.length < 3 ||
    parts[0] !== "projects" ||
    !/^[a-z0-9-]+$/.test(parts[1]) ||
    parts.some(
      (p) =>
        !p ||
        p === "." ||
        p === ".." ||
        p.includes("\\") ||
        p.includes(":") ||
        Array.from(p).some((ch) => ch.charCodeAt(0) < 32) ||
        /[. ]$/.test(p),
    )
  )
    throw Error("Unsafe archive path: " + path);
  return parts;
}
function checkKeys(rows: BrowserRows) {
  for (const [key, raw] of Object.entries(rows)) {
    if (key === "qah:content-vault")
      ContentNoteSchema.array().parse(JSON.parse(raw));
    else if (key === "qah:activeProject")
      ProjectManifestSchema.parse(JSON.parse(raw));
    else if (key.startsWith("qah:haqverse:")) {
      const schemas = {
        "camera-library": HaqVerseCameraMovementSchema,
        "visual-assets": HaqVerseVisualAssetSchema,
        "world-rules": HaqVerseWorldRuleSchema,
        "motion-rules": HaqVerseMotionRuleSchema,
      };
      const schema = Object.entries(schemas).find(([name]) =>
        key.endsWith(":" + name),
      )?.[1];
      if (!schema) throw Error("Unsupported data category: " + key);
      schema.array().parse(JSON.parse(raw));
    } else if (
      key.startsWith("qah:project:") ||
      key.startsWith("qah:backup:")
    ) {
      const value = JSON.parse(raw);
      if (/^qah:project:[^:]+:prompts:.+\.json$/.test(key))
        PromptAssetSchema.parse(
          typeof value === "string" ? JSON.parse(value) : value,
        );
    } else if (
      !/^qah:(projects$|planner($|:project:.+$)|calendar:|calendar-view-settings$|work-timer:(v1|display)$|work-history:|work-view:|reminder-delivery:|ollama-(model|base-url)$)/.test(
        key,
      )
    )
      throw Error("Unsupported or reserved browser key: " + key);
  }
}
export async function validateRecoveryRecords(
  rows: BrowserRows,
  files: ProjectFiles,
) {
  await validateSnapshot(rows, files);
  const edges = new Map<string, string[]>(),
    slots = new Set<string>();
  for (const [key, raw] of Object.entries(rows)) {
    if (key !== "qah:planner" && !key.startsWith("qah:planner:project:"))
      continue;
    const scope =
      key === "qah:planner"
        ? null
        : decodeURIComponent(key.slice("qah:planner:project:".length));
    if (
      scope !== null &&
      key !== "qah:planner:project:" + encodeURIComponent(scope)
    )
      throw Error("Noncanonical Planner scope");
    for (const task of JSON.parse(raw) as PlannerItem[]) {
      if (
        !task.id ||
        !task.title.trim() ||
        (task.notes !== undefined && typeof task.notes !== "string")
      )
        throw Error("Invalid Planner task: " + task.id);
      if (task.occurrence) {
        const slot = JSON.stringify([
          scope,
          task.occurrence.seriesId,
          task.occurrence.slot,
        ]);
        if (slots.has(slot)) throw Error("Duplicate recurring occurrence");
        slots.add(slot);
      }
      const links = (task.prerequisites ?? []).map((r) =>
        JSON.stringify([r.projectId ?? null, r.taskId]),
      );
      if (new Set(links).size !== links.length)
        throw Error("Duplicate prerequisite");
      edges.set(JSON.stringify([scope, task.id]), links);
    }
  }
  const visiting = new Set<string>(),
    done = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id))
      throw Error("Circular prerequisite in recovered records");
    if (done.has(id)) return;
    visiting.add(id);
    for (const link of edges.get(id) ?? []) visit(link);
    visiting.delete(id);
    done.add(id);
  }
  for (const id of edges.keys()) visit(id);
}
export interface Snapshot {
  browser: BrowserRows;
  files: ProjectFiles;
}
export async function parseArchive(blob: Blob) {
  let end = 0;
  while (end < blob.size) {
    const chunk = new Uint8Array(
      await blob.slice(end, end + 65536).arrayBuffer(),
    );
    const i = chunk.indexOf(10);
    if (i >= 0) {
      end += i;
      break;
    }
    end += chunk.length;
  }
  if (end === blob.size) throw Error("Missing archive header.");
  const envelope = JSON.parse(await blob.slice(0, end).text());
  const m = manifestSchema.parse(envelope.manifest);
  if (
    (await textHash(JSON.stringify(envelope.manifest))) !== envelope.sha256 ||
    (await textHash(JSON.stringify(m.browser))) !== m.browserSha256
  )
    throw Error("Invalid manifest or browser checksum.");
  checkKeys(m.browser);
  const files: ProjectFiles = new Map(),
    paths = new Map<string, string>(),
    directories = new Set<string>();
  let offset = end + 1;
  for (const file of m.workspace) {
    const parts = safePath(file.path);
    for (let i = 1; i <= parts.length; i++) {
      const path = parts.slice(0, i).join("/"),
        folded = path.normalize("NFC").toLowerCase();
      if (paths.has(folded) && paths.get(folded) !== path)
        throw Error("Ambiguous filesystem path: " + path);
      paths.set(folded, path);
      if (i < parts.length) {
        if (files.has(path)) throw Error("Archive directory collision");
        directories.add(path);
      }
    }
    if (
      files.has(file.path) ||
      directories.has(file.path) ||
      offset + file.size > blob.size ||
      file.blocks.length !== Math.ceil(file.size / m.blockBytes)
    )
      throw Error("Invalid file inventory: " + file.path);
    const body = blob.slice(offset, offset + file.size);
    offset += file.size;
    for (const [i, hash] of file.blocks.entries())
      if (
        (await sha(
          await body
            .slice(i * m.blockBytes, (i + 1) * m.blockBytes)
            .arrayBuffer(),
        )) !== hash
      )
        throw Error("Invalid file checksum: " + file.path);
    files.set(file.path, new File([body], parts.at(-1)!));
  }
  if (offset !== blob.size) throw Error("Unexpected archive length.");
  for (const path of files.keys())
    if (!files.has(path.split("/").slice(0, 2).join("/") + "/project.json"))
      throw Error("Missing project manifest: " + path);
  await validateRecoveryRecords(m.browser, files);
  return {
    browser: m.browser,
    files,
    created: m.created,
    covered: m.covered,
    excluded: m.excluded,
  };
}
