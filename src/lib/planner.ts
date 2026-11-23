import {appendHistory} from "./workHistory";
import {dayNumber, matchesSlot, offsetDay, slots, validateSegment, type Occurrence, type RepeatRule, type SeriesSegment} from "./recurrence";
export type PlannerStatus = "todo" | "doing" | "done";

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface PlannerItem {
  reminders?: import("./taskReminders").TaskReminder[];
  series?: {segments: SeriesSegment[]; notes: string; subtasks?: Subtask[]; prerequisites?: TaskReference[]};
  occurrence?: Occurrence;
  referenceLinks?: string[];
  prerequisites?: TaskReference[];
  subtasks?: Subtask[];
  id: string;
  title: string;
  notes: string;
  dueDate?: string;
  status: PlannerStatus;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "qah:planner";

function plannerKey(projectId?: string): string {
  if (projectId === undefined) return STORAGE_KEY;
  if (!projectId.trim()) throw new Error("A project ID is required");
  return `${STORAGE_KEY}:project:${encodeURIComponent(projectId)}`;
}

function readAll(projectId?: string): PlannerItem[] {
  const raw = localStorage.getItem(plannerKey(projectId));
  if (raw === null) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every(isPlannerItem)) {
    throw new Error("Invalid Planner records");
  }
  return parsed;
}

export function isPlannerItem(item: unknown): item is PlannerItem {
  if (!item || typeof item !== "object") return false;
  const record = item as Record<string, unknown>;
  if (record.occurrence !== undefined || record.series !== undefined) {
    try {
      const task = record as unknown as PlannerItem;
      const ref = task.occurrence;
      if (!ref || typeof ref.seriesId !== "string" || !ref.seriesId) return false;
      dayNumber(ref.slot);
      if (task.referenceLinks !== undefined && (!Array.isArray(task.referenceLinks) ||
          task.referenceLinks.some(link => typeof link !== "string"))) return false;
      if ([ref.overridden,ref.removed,ref.retired].some(flag => flag !== undefined && typeof flag !== "boolean")) return false;
      if (task.series !== undefined) {
        const {segments} = task.series;
        if (!Array.isArray(segments) || !segments.length || task.id !== ref.seriesId || segments[0].from !== ref.slot) return false;
        for (const [i, segment] of segments.entries()) {
          validateSegment(segment);
          if (i && segment.from <= segments[i-1].from) return false;
        }
      }
    } catch {return false;}
  }
  return ["id", "title", "createdAt", "updatedAt"].every(key => typeof record[key] === "string")
    && (record.prerequisites === undefined || (Array.isArray(record.prerequisites)
      && record.prerequisites.every(ref => ref && typeof ref.taskId === "string"
        && (ref.projectId === undefined || typeof ref.projectId === "string"))))
    && (record.subtasks === undefined || (Array.isArray(record.subtasks)
      && record.subtasks.every(s => s && typeof s.id === "string" && typeof s.title === "string" && typeof s.done === "boolean")
      && new Set(record.subtasks.map(s => s.id)).size === record.subtasks.length))
    && ["todo", "doing", "done"].includes(String(record.status))
    && (record.dueDate == null || typeof record.dueDate === "string");
}

function writeAll(items: PlannerItem[], projectId?: string, id?:string, operation?:string, subject?:PlannerItem): void {
  const before=id?readAll(projectId).find(t=>t.id===id):undefined;
  localStorage.setItem(plannerKey(projectId),JSON.stringify(items));
  if(!id)return; // Materializing a view is not a user edit.
  const after=items.find(t=>t.id===id),task=subject??after??before;
  if(!task || (operation==="Task deleted" && before?.occurrence?.removed))return;
  const fields=["title","notes","status","dueDate","subtasks","prerequisites","referenceLinks","reminders","series"] as const;
  const changes=fields.filter(k=>JSON.stringify(before?.[k])!==JSON.stringify(after?.[k]));
  if(!operation&&!changes.length)return;
  const action=operation??(changes.includes("status")&&after?.status==="done"?"Completed":
    changes.includes("dueDate")?"Deadline changed":changes.includes("reminders")?"Reminders changed":
    changes.includes("referenceLinks")?"References changed":"Task edited");
  const detail=changes.map(k=>k+": "+JSON.stringify(before?.[k]??null)+" → "+JSON.stringify(after?.[k]??null)).join("\n");
  appendHistory({action,title:task.title,taskId:task.id,projectId,slot:task.occurrence?.slot,detail});
}

export function listPlannerItems(projectId?: string, includeRetired = false): PlannerItem[] {
  let items: PlannerItem[];
  try {
    items = readAll(projectId);
  } catch {
    // Preserve the legacy empty-state fallback. Mutations use the strict reader.
    return [];
  }
  return items.filter(item => !item.occurrence?.removed && (includeRetired || !item.occurrence?.retired)).sort((a, b) => {
    if (a.status === "done" && b.status !== "done") return 1;
    if (a.status !== "done" && b.status === "done") return -1;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function createPlannerItem(input: { title: string; notes?: string; dueDate?: string }, projectId?: string): PlannerItem {
  const now = new Date().toISOString();
  const item: PlannerItem = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    notes: input.notes?.trim() ?? "",
    dueDate: input.dueDate || undefined,
    status: "todo",
    createdAt: now,
    updatedAt: now,
  };
  writeAll([item, ...readAll(projectId)], projectId,item.id,"Task created");
  return item;
}

export function updatePlannerItem(id: string, patch: Partial<Pick<PlannerItem, "title" | "notes" | "dueDate" | "status">>, projectId?: string): PlannerItem | null {
  const items = readAll(projectId);
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return null;
  const next: PlannerItem = {
    ...items[index],
    ...patch,
    title: patch.title !== undefined ? patch.title.trim() : items[index].title,
    notes: patch.notes !== undefined ? patch.notes.trim() : items[index].notes,
    dueDate: patch.dueDate !== undefined ? patch.dueDate || undefined : items[index].dueDate,
    updatedAt: new Date().toISOString(),
  };
  markOverride(next);
  items[index] = next;
  writeAll(items, projectId,id);
  return next;
}

export function deletePlannerItem(id: string, projectId?: string): void {
  const tasks = readAll(projectId);
  const task = tasks.find(item => item.id === id);
  if (task?.occurrence) {
    task.occurrence.removed = true;
    writeAll(tasks, projectId,id,"Task deleted");
  } else writeAll(tasks.filter(item => item.id !== id), projectId,id,"Task deleted");
}

export type SubtaskChange =
  | { kind: "add"; title: string }
  | { kind: "rename"; id: string; title: string }
  | { kind: "check"; id: string; done: boolean }
  | { kind: "remove"; id: string };

export function subtaskPercent(item: PlannerItem): number | undefined {
  const children = item.subtasks;
  if (!children?.length) return undefined;
  return Math.round(100 * children.filter(child => child.done).length / children.length);
}

export function changeSubtask(parentId: string, change: SubtaskChange, projectId?: string): void {
  const items = readAll(projectId);
  const parent = items.find(item => item.id === parentId);
  if (!parent) throw new Error("Parent task no longer exists in this scope.");
  const children = parent.subtasks ?? [];
  if ("title" in change && !change.title.trim()) throw new Error("Enter a subtask title.");
  if (change.kind === "add") {
    children.push({ id: crypto.randomUUID(), title: change.title.trim(), done: false });
  } else {
    const index = children.findIndex(child => child.id === change.id);
    if (index < 0) throw new Error("Subtask no longer exists.");
    if (change.kind === "remove") children.splice(index, 1);
    else if (change.kind === "rename") children[index].title = change.title.trim();
    else children[index].done = change.done;
  }
  if (children.length) parent.subtasks = children;
  else delete parent.subtasks;
  markOverride(parent);
  parent.updatedAt = new Date().toISOString();
  writeAll(items, projectId,parentId,"Subtasks changed");
}

export interface TaskReference {
  taskId: string;
  projectId?: string;
}
type ProjectList = ReadonlyArray<{id: string; name: string}>;

export function referenceKey(ref: TaskReference) {
  return JSON.stringify([ref.projectId ?? null, ref.taskId]);
}

// Read each reachable scope once per operation. Identical IDs in different scopes are independent.
function dependencyReader(projects: ProjectList) {
  const scopes = new Map<string | undefined, PlannerItem[]>();
  return (ref: TaskReference) => {
    if (ref.projectId !== undefined && !projects.some(project => project.id === ref.projectId)) {
      throw new Error("Prerequisite project unavailable.");
    }
    let items = scopes.get(ref.projectId);
    if (!items) {
      items = readAll(ref.projectId);
      scopes.set(ref.projectId, items);
    }
    const matches = items.filter(item => item.id === ref.taskId && !item.occurrence?.removed);
    if (matches.length > 1) throw new Error("Ambiguous task ID in this scope.");
    return {items, task: matches[0]};
  };
}

export function changeDependency(parent: TaskReference, prerequisite: TaskReference, action: "add" | "remove", projects: ProjectList) {
  const resolve = dependencyReader(projects);
  const {items, task} = resolve(parent);
  if (!task) throw new Error("Parent task is missing.");
  const links = task.prerequisites ?? [];
  const parentKey = referenceKey(parent);
  const key = referenceKey(prerequisite);
  const linked = links.some(link => referenceKey(link) === key);

  if (action === "add") {
    if (key === parentKey) throw new Error("A task cannot depend on itself.");
    if (linked) throw new Error("Prerequisite already linked.");
    const pending = [prerequisite];
    const visited = new Set<string>();
    while (pending.length) {
      const ref = pending.pop()!;
      const current = referenceKey(ref);
      if (current === parentKey) throw new Error("This link would create a dependency cycle.");
      if (visited.has(current)) continue;
      visited.add(current);
      const target = resolve(ref).task;
      if (!target) {
        if (current === key) throw new Error("Prerequisite task is missing.");
        continue; // A deleted task has no outgoing edges.
      }
      for (const link of target.prerequisites ?? []) pending.push(link);
    }
    task.prerequisites = [...links, prerequisite];
  } else {
    if (!linked) return;
    task.prerequisites = links.filter(link => referenceKey(link) !== key);
    if (!task.prerequisites.length) delete task.prerequisites;
  }
  markOverride(task);
  task.updatedAt = new Date().toISOString();
  writeAll(items, parent.projectId,parent.taskId,"Dependencies changed");
}

export function prerequisiteDetails(task: PlannerItem, projects: ProjectList) {
  const resolve = dependencyReader(projects);
  return (task.prerequisites ?? []).map(ref => {
    const scope = ref.projectId === undefined ? "Workspace"
      : projects.find(project => project.id === ref.projectId)?.name ?? ref.projectId;
    try {
      const target = resolve(ref).task;
      const title = target?.title ?? "Missing task " + ref.taskId;
      return {ref, label: title + (target?.occurrence ? " · " + target.dueDate : "") + " · " + scope, status: target?.status};
    } catch {
      return {ref, label: "Unavailable task " + ref.taskId + " · " + scope, status: undefined};
    }
  });
}

export function confirmPrerequisites(parent: TaskReference, projects: ProjectList, action: string,
  confirm: (message: string) => boolean = message => window.confirm(message)) {
  const {task} = dependencyReader(projects)(parent);
  if (!task) throw new Error("Task is missing.");
  const unresolved = prerequisiteDetails(task, projects).filter(link => link.status !== "done");
  return !unresolved.length || confirm(
    "Unfinished or unavailable prerequisites:\n" + unresolved.map(link => link.label).join("\n") +
    "\n\n" + action + " anyway?"
  );
}

function markOverride(task: PlannerItem) {
  if (task.occurrence) {
    task.occurrence.overridden = true;
    delete task.occurrence.retired;
  }
}

function activeSegment(segments: SeriesSegment[], slot: string) {
  return segments.filter((segment) => segment.from <= slot).at(-1);
}
function deadline(day: string, time: string) {
  return time ? day + "T" + time : day;
}
function occurrenceId(seriesId: string, slot: string) {
  return "occurrence:" + JSON.stringify([seriesId, slot]);
}

// Each series and all its occurrences share the original Planner storage key.
// The first occurrence keeps the existing task ID for sessions and dependency links.
function materialize(
  items: PlannerItem[],
  root: PlannerItem,
  from: string,
  to: string,
) {
  const series = root.series!;
  const existing = new Map(items.map((item) => [item.id, item]));
  let changed = false;
  for (const segment of series.segments) {
    const shift = segment.deadlineOffset ?? 0;
    for (const slot of slots(
      segment.anchor ?? segment.from,
      segment.rule,
      offsetDay(from, -shift),
      offsetDay(to, -shift),
    )) {
      if (
        slot === root.occurrence!.slot ||
        activeSegment(series.segments, slot) !== segment
      )
        continue;
      const id = occurrenceId(root.id, slot);
      const saved = existing.get(id);
      if (saved) {
        if (
          saved.occurrence?.seriesId !== root.id ||
          saved.occurrence.slot !== slot
        )
          throw new Error("Occurrence ID conflicts with an existing task.");
        continue;
      }
      const now = new Date().toISOString();
      const task: PlannerItem = {
        id,
        title: segment.title,
        notes: series.notes,
        dueDate: deadline(offsetDay(slot, shift), segment.time),
        status: "todo",
        createdAt: now,
        updatedAt: now,
        occurrence: { seriesId: root.id, slot },
        referenceLinks: [...segment.links],
        subtasks: series.subtasks?.map((child) => ({ ...child, done: false })),
        prerequisites: series.prerequisites?.map((link) => ({ ...link })),
      };
      items.push(task);
      existing.set(id, task);
      changed = true;
    }
  }
  return changed;
}

// Expand only this export window on a detached read. Include tombstones so a
// recipient can identify a cancelled occurrence by its original task ID.
export function plannerExportWindow(projectId: string | undefined, from: string, to: string) {
  const items = readAll(projectId);
  for (const root of items.filter(item => item.series)) materialize(items, root, from, to);
  return items;
}

export function ensureOccurrences(
  projectId: string | undefined,
  from: string,
  to: string,
) {
  const items = readAll(projectId);
  let changed = false;
  for (const root of items.filter((item) => item.series)) {
    if (materialize(items, root, from, to)) changed = true;
  }
  if (changed) writeAll(items, projectId);
}

export function startSeries(
  id: string,
  projectId: string | undefined,
  start: string,
  rule: RepeatRule,
  links: string[],
) {
  const items = readAll(projectId);
  const root = items.find((item) => item.id === id);
  if (!root || root.occurrence) throw new Error("Choose a non-recurring task.");
  const [from, time = ""] = start.split("T");
  const segment = { from, time, title: root.title, rule, links };
  validateSegment(segment);
  if (root.status === "done" && root.dueDate !== start)
    throw new Error("Reopen the task before changing its completed deadline.");
  root.series = {
    segments: [segment],
    notes: root.notes,
    subtasks: root.subtasks,
    prerequisites: root.prerequisites,
  };
  root.occurrence = { seriesId: id, slot: from };
  root.referenceLinks = [...links];
  root.dueDate = deadline(from, time);
  materialize(items, root, from, offsetDay(from, 30));
  writeAll(items, projectId,id,"Series started");
}

export function seriesDefaults(
  task: PlannerItem,
  projectId: string | undefined,
  entire: boolean,
) {
  const ref = task.occurrence;
  const root = ref && readAll(projectId).find((row) => row.id === ref.seriesId);
  if (!root?.series || !ref)
    throw new Error("Recurring series is unavailable.");
  const segments = root.series.segments;
  return entire ? segments[0] : activeSegment(segments, ref.slot)!;
}

export function editSeries(
  id: string,
  projectId: string | undefined,
  scope: "future" | "entire",
  defaults: Pick<
    SeriesSegment,
    "title" | "time" | "rule" | "links" | "deadlineOffset"
  >,
  projects: ProjectList = [],
) {
  const items = readAll(projectId);
  const selected = items.find(
    (task) => task.id === id && !task.occurrence?.removed,
  );
  const ref = selected?.occurrence;
  const root = ref && items.find((task) => task.id === ref.seriesId);
  if (!ref || !root?.series)
    throw new Error("Recurring series is unavailable.");
  const segments = root.series.segments;
  const from = scope === "entire" ? segments[0].from : ref.slot;
  const previous = activeSegment(segments, from)!;
  const rule = defaults.rule;
  const sameCadence =
    previous.rule.frequency === rule.frequency &&
    previous.rule.interval === rule.interval &&
    JSON.stringify(previous.rule.weekdays ?? []) ===
      JSON.stringify(rule.weekdays ?? []);
  const segment = {
    ...defaults,
    from,
    anchor: sameCadence ? (previous.anchor ?? previous.from) : from,
  };
  validateSegment(segment);
  // Keep referenced prerequisites actionable if their slots leave the schedule.
  // Read only the accessible scopes and never change another project's records.
  const referenced = new Set<string>();
  for (const owner of new Set([
    undefined,
    projectId,
    ...projects.map((project) => project.id),
  ])) {
    for (const task of owner === projectId ? items : listPlannerItems(owner)) {
      for (const link of task.prerequisites ?? []) {
        if (link.projectId === projectId) referenced.add(link.taskId);
      }
    }
  }
  root.series.segments = [
    ...segments.filter((part) => part.from < from),
    segment,
  ];
  for (const task of items) {
    const occurrence = task.occurrence;
    if (
      occurrence?.seriesId !== root.id ||
      occurrence.slot < from ||
      occurrence.removed ||
      occurrence.overridden ||
      task.status !== "todo"
    )
      continue;
    if (!matchesSlot(segment.anchor, rule, occurrence.slot)) {
      occurrence.retired = !referenced.has(task.id);
      continue;
    }
    delete occurrence.retired;
    task.title = segment.title;
    task.dueDate = deadline(
      offsetDay(occurrence.slot, segment.deadlineOffset ?? 0),
      segment.time,
    );
    // Reference links belong to the occurrence snapshot, even after a rule change.
  }
  const firstDue = offsetDay(from, segment.deadlineOffset ?? 0);
  materialize(items, root, firstDue, offsetDay(firstDue, 30));
  writeAll(items, projectId,root.id,"Series edited ("+scope+")",selected);
}

export function editOccurrence(
  id: string,
  projectId: string | undefined,
  title: string,
  due: string,
) {
  const items = readAll(projectId);
  const task = items.find((item) => item.id === id);
  if (!task?.occurrence || task.occurrence.removed || task.status === "done")
    throw new Error("Reopen the occurrence before editing it.");
  const [from, time = ""] = due.split("T");
  validateSegment({
    from,
    time,
    title,
    links: [],
    rule: { frequency: "daily", interval: 1 },
  });
  task.title = title.trim();
  task.dueDate = deadline(from, time);
  task.updatedAt = new Date().toISOString();
  markOverride(task);
  writeAll(items, projectId,id,"Occurrence edited");
}

export function saveTaskDetails(
  base: PlannerItem,
  patch: Pick<
    PlannerItem,
    "title" | "notes" | "dueDate" | "status" | "referenceLinks" | "reminders"
  >,
  projectId?: string,
) {
  const items = readAll(projectId);
  const task = items.find((t) => t.id === base.id && !t.occurrence?.removed);
  if (!task || JSON.stringify(task) !== JSON.stringify(base))
    throw Error("Task changed. Reopen details to review the latest version.");
  if (!patch.title.trim()) throw Error("Enter a task title.");
  if (
    base.occurrence &&
    base.status === "done" &&
    (patch.title !== base.title ||
      patch.dueDate !== base.dueDate ||
      patch.notes !== base.notes)
  )
    throw Error("Reopen the completed occurrence before editing its history.");
  if (
    patch.dueDate !== base.dueDate &&
    patch.dueDate &&
    !/^\d{4}-\d\d-\d\d(T([01]\d|2[0-3]):[0-5]\d)?$/.test(patch.dueDate)
  )
    throw Error("Invalid deadline.");
  if (patch.dueDate !== base.dueDate && patch.dueDate)
    dayNumber(patch.dueDate.slice(0, 10));
  if (
    patch.reminders?.some(
      (r) => !Number.isSafeInteger(r.minutes) || r.minutes < 0,
    )
  )
    throw Error("Reminder offset must be a nonnegative whole number.");
  if (
    Object.entries(patch).every(
      ([k, v]) =>
        JSON.stringify(task[k as keyof PlannerItem]) === JSON.stringify(v),
    )
  )
    return;
  Object.assign(task, patch, {
    title: patch.title.trim(),
    updatedAt: new Date().toISOString(),
  });
  markOverride(task);
  writeAll(items, projectId,base.id);
}
