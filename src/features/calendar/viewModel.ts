import { calendarInstances,type DateRange } from "../../lib/calendarOccurrences";
import { z } from "zod";
import { listCalendar, type CalendarScope } from "../../lib/calendar";
import { listPlannerItems } from "../../lib/planner";

export const views = ["Day", "Week", "Month", "Agenda"] as const;
export type View = (typeof views)[number];
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const calendarPreferencesSchema = z
  .object({
    view: z.enum(views),
    weekStart: z.number().int().min(0).max(6),
    days: z.array(z.number().int().min(0).max(6)),
    duration: z.number().int().positive().default(60),
    start: clock,
    end: clock,
  })
  .refine((p) => p.start < p.end);
export type Preferences = z.infer<typeof calendarPreferencesSchema>;
export const defaults: Preferences = {
  duration: 60,
  view: "Month",
  weekStart: 0,
  days: [0, 1, 2, 3, 4],
  start: "09:00",
  end: "17:00",
};
export const preferenceKey = "qah:calendar-view-settings";
export function preferences(): Preferences {
  try {
    return calendarPreferencesSchema.parse(
      JSON.parse(localStorage.getItem(preferenceKey) ?? "null"),
    );
  } catch {
    return defaults;
  }
}

export function dayKey(d: Date) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
export function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
export function shift(d: Date, view: View, direction: number) {
  if (view === "Month")
    return new Date(d.getFullYear(), d.getMonth() + direction, 1);
  return addDays(
    d,
    direction * (view === "Week" ? 7 : view === "Agenda" ? 30 : 1),
  );
}
export function visibleDays(date: Date, view: View, weekStart: number) {
  let start = addDays(date, 0);
  let count = view === "Agenda" ? 30 : view === "Week" ? 7 : 1;
  if (view === "Month") start.setDate(1);
  if (view === "Month" || view === "Week") {
    const offset = (start.getDay() - weekStart + 7) % 7;
    if (view === "Month")
      count =
        7 *
        Math.ceil(
          (offset +
            new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()) /
            7,
        );
    start = addDays(start, -offset);
  }
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

export interface Item {
  id: string;
  title: string;
  source: string;
  kind: "Deadline" | "Session" | "Event";
  start: number;
  end: number;
  allDay: boolean;
  projectId?: string;
  taskId?: string;
  occurrenceSlot?: string;
  seriesEntryId?: string;
  entrySlot?: string;
  status?: string;
}
function civilDate(key: string) {
  const [y, m, d] = key.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function readItems(scope: CalendarScope, source: string, range?:DateRange): Item[] {
  const { entries, deadlines } = listCalendar(scope);
  const projectId = scope.kind === "project" ? scope.projectId : undefined;
  const tasks = new Map(
    listPlannerItems(
      scope.kind === "workspace" ? undefined : scope.projectId, true,
    ).map((t) => [t.id, t]),
  );
  const items: Item[] = deadlines.map((d) => {
    const timed = d.dueDate.includes("T");
    const start = timed ? new Date(d.dueDate) : civilDate(d.dueDate);
    return {
      id: "deadline-" + d.taskId,
      title: d.title,
      kind: "Deadline",
      source,
      start: +start,
      end: timed ? +start + 1 : +addDays(start, 1),
      allDay: !timed,
      projectId,
      taskId: d.taskId,
      occurrenceSlot: tasks.get(d.taskId)?.occurrence?.slot,
      status: d.status,
    };
  });
  for (const { id, entry } of entries) {
    for(const {ordinal,slot,start,end,allDay,cancelled} of calendarInstances(entry,entry.recurrence?range:undefined)){
    if(cancelled)continue;
    items.push({
      id: ordinal===0?id:id+"@"+slot,
      seriesEntryId:entry.recurrence?id:undefined,
      entrySlot:entry.recurrence?slot:undefined,
      projectId,
      taskId: entry.kind === "session" ? entry.taskId : undefined,
      status:
        entry.kind === "session" ? tasks.get(entry.taskId)?.status : undefined,
      source,
      kind: entry.kind === "event" ? "Event" : "Session",
      title:
        entry.kind === "event"
          ? entry.title
          : (tasks.get(entry.taskId)?.title ??
            "Work session (task unavailable)"),
      start,
      end,
      allDay,
    });
    }
  }
  return items;
}
export function onDay(item: Item, day: Date) {
  return item.start < +addDays(day, 1) && item.end > +addDays(day, 0);
}
