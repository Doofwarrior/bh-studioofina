import { z } from "zod";
import { ProjectManifestSchema } from "../../types/project";
import { isPlannerItem, type PlannerItem } from "../planner";
import { readRecord } from "../calendar";
import { timerSchema, timerKey } from "../workTimer";
import {
  calendarPreferencesSchema,
  preferenceKey,
} from "../../features/calendar/viewModel";
import { decodeDecisionLog, reconcileDecisions } from "./index";

export type BrowserRows = Record<string, string>;
export type ProjectFiles = Map<string, File>;
const text = z.string();
const filters = z.object({
  from: text,
  to: text,
  project: text,
  action: text,
  status: text,
});
const reminder = z.object({
  id: text,
  minutes: z.number().nonnegative(),
  enabled: z.boolean(),
  desktop: z.boolean(),
  sessionId: text.optional(),
});
function requireValid(condition: unknown, message: string): asserts condition {
  if (!condition) throw Error(message);
}
export async function validateSnapshot(rows: BrowserRows, files: ProjectFiles) {
  const projects = new Map<string, string>(),
    slugs = new Map<string, string>();
  function register(value: unknown) {
    const p = ProjectManifestSchema.parse(value);
    requireValid(
      (!projects.has(p.id) || projects.get(p.id) === p.slug) &&
        (!slugs.has(p.slug) || slugs.get(p.slug) === p.id),
      "Conflicting project identities: " + p.slug,
    );
    projects.set(p.id, p.slug);
    slugs.set(p.slug, p.id);
    return p;
  }
  const index = ProjectManifestSchema.array().parse(
    JSON.parse(rows["qah:projects"] ?? "[]"),
  );
  for (const p of index) {
    requireValid(!projects.has(p.id), "Duplicate project ID");
    register(p);
  }
  for (const [path, file] of files) {
    const match = /^projects\/([^/]+)\/project\.json$/.exec(path);
    if (match)
      requireValid(
        register(JSON.parse(await file.text())).slug === match[1],
        "Project folder and manifest slug differ: " + path,
      );
  }
  const scopes = new Map<string, Map<string, PlannerItem>>();
  for (const [key, raw] of Object.entries(rows)) {
    const match = /^qah:planner(?::project:(.+))?$/.exec(key);
    if (!match) continue;
    const scope = decodeURIComponent(match[1] ?? "");
    requireValid(
      !scope || projects.has(scope),
      "Missing Planner project: " + scope,
    );
    const tasks: unknown = JSON.parse(raw);
    requireValid(
      Array.isArray(tasks) && tasks.every(isPlannerItem),
      "Invalid Planner records: " + key,
    );
    const byId = new Map(tasks.map((t) => [t.id, t]));
    requireValid(byId.size === tasks.length, "Duplicate Planner IDs: " + key);
    scopes.set(scope, byId);
  }
  const sessions = new Map<string, string>();
  for (const [key, raw] of Object.entries(rows)) {
    if (key.startsWith("qah:calendar:")) {
      const match = /^(qah:calendar:(?:workspace|project:([^:]+)):)[^:]+$/.exec(
        key,
      );
      requireValid(match, "Invalid Calendar key");
      const scope = decodeURIComponent(match[2] ?? "");
      requireValid(
        !scope || projects.has(scope),
        "Missing Calendar project: " + scope,
      );
      const { id, entry } = readRecord(key, raw, match[1]);
      if (entry.kind === "session") {
        requireValid(
          scopes.get(scope)?.has(entry.taskId),
          "Missing scheduled task: " + entry.taskId,
        );
        sessions.set(JSON.stringify([scope, id]), entry.taskId);
      }
    } else if (key === timerKey) {
      const state = timerSchema.parse(JSON.parse(raw));
      const ids = new Set(state.open.map((r) => r.id));
      requireValid(
        ids.size === state.open.length &&
          [state.active?.id, state.selected, state.pending?.id].every(
            (id) => id === undefined || ids.has(id),
          ),
        "Invalid timer run reference",
      );
      const entries = [...state.entries].sort((a, b) => a.from - b.from);
      requireValid(
        new Set(entries.map((e) => e.id)).size === entries.length &&
          entries.every(
            (e, i) =>
              e.to >= e.from &&
              (!i || e.from >= entries[i - 1].to) &&
              (!e.correction || e.correction.to >= e.correction.from),
          ),
        "Invalid or overlapping timer intervals",
      );
    } else if (key.startsWith("qah:work-history:")) {
      const h = z
        .object({
          id: text,
          at: z.number().finite(),
          action: text,
          title: text,
          detail: text,
          projectId: text.optional(),
          taskId: text.optional(),
        })
        .parse(JSON.parse(raw));
      requireValid(
        key === "qah:work-history:" + h.id,
        "History identity mismatch",
      );
    } else if (key === preferenceKey)
      calendarPreferencesSchema.parse(JSON.parse(raw));
    else if (key === "qah:work-timer:display")
      z.object({
        mode: z.enum(["always", "active", "minimized"]),
        remind: z.boolean(),
      }).parse(JSON.parse(raw));
    else if (key.startsWith("qah:work-view:"))
      (key.startsWith("qah:work-view:search:")
        ? z.object({ filters, query: text })
        : filters
      ).parse(JSON.parse(raw));
    else if (key.startsWith("qah:reminder-delivery:")) {
      z.tuple([text.nullable(), text, text]).parse(
        JSON.parse(key.slice("qah:reminder-delivery:".length)),
      );
      z.tuple([text.nullable(), text, z.number()]).parse(JSON.parse(raw));
    }
  }
  for (const [scope, tasks] of scopes)
    for (const t of tasks.values()) {
      if (t.occurrence)
        requireValid(
          tasks.get(t.occurrence.seriesId)?.series,
          "Missing recurrence root: " + t.id,
        );
      for (const ref of t.prerequisites ?? [])
        requireValid(
          scopes.get(ref.projectId ?? "")?.has(ref.taskId),
          "Unavailable prerequisite: " + ref.taskId,
        );
      for (const r of reminder.array().parse(t.reminders ?? []))
        if (r.sessionId)
          requireValid(
            sessions.get(JSON.stringify([scope, r.sessionId])) === t.id,
            "Missing reminder session: " + r.id,
          );
      const links = [
        ...text.array().parse(t.referenceLinks ?? []),
        ...(t.series?.segments.flatMap((s) => s.links) ?? []),
      ];
      for (const link of links)
        if (link.startsWith("workspace-copy:")) {
          const parts = link.slice(15).split("/").map(decodeURIComponent);
          requireValid(
            parts.length === 2 &&
              parts[0] === scope &&
              !parts[1].includes("/") &&
              files.has(
                "projects/" + projects.get(scope) + "/references/" + parts[1],
              ),
            "Missing copied attachment: " + link,
          );
        }
    }
  const decisionSlugs = new Set([
    ...slugs.keys(),
    ...Object.keys(rows).flatMap(
      (k) =>
        /^qah:project:([^:]+):decisions:decisions\.json$/.exec(k)?.[1] ?? [],
    ),
  ]);
  for (const slug of decisionSlugs) {
    const file = files.get("projects/" + slug + "/decisions/decisions.json"),
      raw = rows["qah:project:" + slug + ":decisions:decisions.json"];
    reconcileDecisions(
      file ? decodeDecisionLog(await file.text(), slug) : [],
      raw === undefined ? [] : decodeDecisionLog(raw, slug),
    );
  }
}
