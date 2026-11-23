import { listPlannerItems } from "../../lib/planner";
import { readTimer } from "../../lib/workTimer";
import { listHistory } from "../../lib/workHistory";
import { sources, scope, type Project } from "./scheduling";
import { readItems, dayKey } from "./viewModel";

export type Filters = {
  project: string;
  from: string;
  to: string;
  status: string;
  action: string;
};
export const initial: Filters = {
  project: "all",
  from: "",
  to: "",
  status: "",
  action: "",
};
export function bounds(f: Filters) {
  const from = f.from ? new Date(f.from + "T00:00").getTime() : -Infinity;
  const next = new Date(f.to + "T00:00");
  next.setDate(next.getDate() + 1);
  return [from, f.to ? +next : Infinity];
}
function taskDay(d: string) {
  return d.includes("T") ? dayKey(new Date(d)) : d;
}
function member(day: string, f: Filters) {
  return (!f.from || day >= f.from) && (!f.to || day <= f.to);
}
function overdue(d: string, now: Date) {
  return d.includes("T") ? Date.parse(d) < +now : d < dayKey(now);
}
export function analytics(projects: Project[], f: Filters, now = new Date()) {
  const [start, end] = bounds(f);
  const clip = (a: number, b: number) =>
    Math.max(0, Math.min(end, b) - Math.max(start, a));
  const entries = readTimer().entries;
  return sources(projects, f.project).map((s) => {
    const tasks = listPlannerItems(s.projectId),
      statuses = new Map(
        listPlannerItems(s.projectId, true).map((t) => [t.id, t.status]),
      );
    const cohort = tasks.filter((t) =>
      member(taskDay(t.dueDate || t.createdAt), f),
    );
    const planned = readItems(scope(s), s.name, f.from && f.to ? {from:f.from,through:f.to} : undefined).reduce(
      (v, i) => v + (i.kind === "Session" ? clip(i.start, i.end) : 0),
      0,
    );
    let completedTime = 0,
      activeTime = 0,
      unavailableTime = 0;
    for (const e of entries) {
      if (e.target.projectId !== s.projectId || e.kind === "break") continue;
      const duration = clip(e.from, e.to),
        status = statuses.get(e.target.taskId);
      if (status === "done") completedTime += duration;
      else if (status) activeTime += duration;
      else unavailableTime += duration;
    }
    return {
      project: s.name,
      projectId: s.projectId,
      count: cohort.length,
      done: cohort.filter((t) => t.status === "done").length,
      overdue: cohort.filter(
        (t) => t.status !== "done" && t.dueDate && overdue(t.dueDate, now),
      ).length,
      planned,
      actual: completedTime + activeTime + unavailableTime,
      completedTime,
      activeTime,
      unavailableTime,
    };
  });
}
export interface WorkResult {
  id: string;
  kind: "planner" | "calendar" | "activity";
  title: string;
  detail: string;
  url: string;
}
export function workResults(projects: Project[], f: Filters, query: string) {
  const rows: WorkResult[] = [],
    needle = query.trim().toLowerCase();
  const push = (row: WorkResult) => {
    if ((row.title + " " + row.detail).toLowerCase().includes(needle))
      rows.push(row);
  };
  const allowed = sources(projects, f.project);
  for (const s of allowed) {
    const project = s.projectId ?? "",
      params = new URLSearchParams({ project });
    for (const t of listPlannerItems(s.projectId)) {
      const day = taskDay(t.dueDate || t.createdAt);
      if (!member(day, f) || (f.status && f.status !== t.status)) continue;
      params.set("task", t.id);
      push({
        id: JSON.stringify([project, t.id]),
        kind: "planner",
        title: t.title,
        detail: [s.name, t.notes, t.status, t.dueDate, t.occurrence?.slot]
          .filter(Boolean)
          .join(" · "),
        url: "/planner?" + params,
      });
    }
    const [start, end] = bounds(f);
    for (const i of readItems(scope(s), s.name, f.from && f.to ? {from:f.from,through:f.to} : undefined)) {
      if (
        i.kind === "Deadline" ||
        i.end <= start ||
        i.start >= end ||
        (f.status && f.status !== (i.status ?? "scheduled"))
      )
        continue;
      const day = dayKey(new Date(Math.max(i.start, start)));
      push({
        id: JSON.stringify([project, i.id]),
        kind: "calendar",
        title: i.title,
        detail: [s.name, i.kind, i.status ?? "scheduled", day].join(" · "),
        url: "/calendar?" + new URLSearchParams({ project, day, item: i.id }),
      });
    }
  }
  if (!f.status)
    for (const h of filteredHistory(projects, f)) {
      push({
        id: h.id,
        kind: "activity",
        title: h.title,
        detail: [
          h.action,
          projects.find((p) => p.id === h.projectId)?.name ??
            h.projectId ??
            "Workspace",
          h.slot,
          new Date(h.at).toLocaleString(),
          h.detail,
        ]
          .filter(Boolean)
          .join(" · "),
        url: "/calendar?" + new URLSearchParams({ history: h.id }),
      });
    }
  return rows.sort(
    (a, b) =>
      a.title.localeCompare(b.title) ||
      a.kind.localeCompare(b.kind) ||
      a.id.localeCompare(b.id),
  );
}
export function filteredHistory(_projects: Project[], f: Filters) {
  const [start, end] = bounds(f);
  return listHistory().filter(
    (h) =>
      h.at >= start &&
      h.at < end &&
      (!f.action || h.action === f.action) &&
      (f.project === "all" ||
        f.project === (h.projectId ? "project:" + h.projectId : "workspace")),
  );
}
