import {
  listCalendar,
  saveCalendarEntry,
  type CalendarScope,
} from "../../lib/calendar";
import {
  listPlannerItems,
  updatePlannerItem,
  type PlannerItem,
} from "../../lib/planner";
import { dayKey, onDay, readItems, type Item } from "./viewModel";

export type Project = { id: string; name: string };
export type Source = { projectId?: string; name: string };
export type Task = Source & { task: PlannerItem };
export function sources(projects: Project[], filter = "all"): Source[] {
  const all: Source[] = [
    { name: "Workspace" },
    ...projects.map((p) => ({ projectId: p.id, name: p.name })),
  ];
  return all.filter(
    (s) =>
      filter === "all" ||
      filter === (s.projectId ? "project:" + s.projectId : "workspace"),
  );
}
export function scope(s: Source): CalendarScope {
  return s.projectId
    ? { kind: "project", projectId: s.projectId }
    : { kind: "workspace" };
}
export function unscheduled(s: Source): Task[] {
  const scheduled = new Set(
    listCalendar(scope(s)).entries.flatMap(({ entry }) =>
      entry.kind === "session" ? [entry.taskId] : [],
    ),
  );
  return listPlannerItems(s.projectId)
    .filter((t) => t.status !== "done" && !t.dueDate && !scheduled.has(t.id))
    .map((task) => ({ ...s, task }));
}
export function setDeadline(target: Task, date: string, time: string) {
  if (
    !updatePlannerItem(
      target.task.id,
      { dueDate: date + (time ? "T" + time : "") },
      target.projectId,
    )
  )
    throw Error("Task no longer exists.");
}
export function saveSession(
  target: Task,
  start: number,
  minutes: number,
  id?: string,
  slot?: string,
) {
  if (!Number.isInteger(minutes) || minutes < 1)
    throw Error("Enter a positive duration in minutes.");
  const previous = id
    ? listCalendar(scope(target)).entries.find((r) => r.id === id)?.entry
    : undefined;
  if (
    id &&
    (previous?.kind !== "session" || previous.taskId !== target.task.id)
  )
    throw Error("Session no longer matches this task.");
  if(slot && id && previous?.kind==="session" && previous.recurrence){
    return saveCalendarEntry(scope(target),{...previous,recurrence:{...previous.recurrence,exceptions:{...previous.recurrence.exceptions,[slot]:{
      startsAt:new Date(start).toISOString(),endsAt:new Date(start+minutes*60000).toISOString(),allDay:false
    }}}},id);
  }
  return saveCalendarEntry(
    scope(target),
    {
      ...previous,
      kind: "session",
      allDay: false,
      taskId: target.task.id,
      startsAt: new Date(start).toISOString(),
      endsAt: new Date(start + minutes * 60000).toISOString(),
    },
    id,
  );
}
export function conflicts(
  items: Item[],
  start: number,
  minutes: number,
  editing?: Item,
) {
  return items.filter(
    (i) =>
      i.kind !== "Deadline" &&
      !(editing && i.id === editing.id && i.projectId === editing.projectId) &&
      i.start < start + minutes * 60000 &&
      i.end > start,
  );
}
export function todaysWork(projects: Project[], now: Date) {
  const today = dayKey(now);
  return sources(projects)
    .flatMap((s) => readItems(scope(s), s.name,{from:today,through:today}))
    .filter((i) =>
      i.kind === "Session"
        ? onDay(i, now)
        : i.kind === "Deadline" &&
          (onDay(i, now) ||
            (dayKey(new Date(i.start)) < today && i.status !== "done")),
    )
    .sort((a, b) => a.start - b.start);
}
