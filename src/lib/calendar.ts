import {includesOriginalSlot} from "./calendarOccurrences";
import {appendHistory} from "./workHistory";
import { z } from "zod";
import { listPlannerItems } from "./planner";

// Calendar scope is explicit. Legacy Planner records belong to the workspace.
export type CalendarScope = { kind: "workspace" } | { kind: "project"; projectId: string };

function projectId(scope: CalendarScope): string | undefined {
  if (scope.kind === "workspace") return undefined;
  return z.string().min(1).refine(id => id.trim().length > 0).parse(scope.projectId);
}

function prefix(scope: CalendarScope): string {
  const id = projectId(scope);
  return id === undefined ? "qah:calendar:workspace:" : `qah:calendar:project:${encodeURIComponent(id)}:`;
}

const exception = z.union([
  z.object({cancelled: z.literal(true)}).strict(),
  z.object({startsAt:z.string().datetime({offset:true}), endsAt:z.string().datetime({offset:true}), allDay:z.boolean().optional()}).strict()
    .refine(e=>Date.parse(e.endsAt)>Date.parse(e.startsAt),"End must follow start"),
]);
const recurrence = z.object({
  exceptions: z.record(z.string().date(),exception).optional(),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  interval: z.number().int().positive(),
  until: z.string().date().optional(),
  count: z.number().int().positive().optional(),
}).strict();

const timing = {
  allDay: z.boolean().optional(),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  recurrence: recurrence.optional(),
};

const entrySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("session"), taskId: z.string().min(1), ...timing }).strict(),
  z.object({ kind: z.literal("event"), title: z.string().trim().min(1), ...timing }).strict(),
]).refine(entry => Date.parse(entry.endsAt) > Date.parse(entry.startsAt), "End must follow start");

export type CalendarEntry = z.infer<typeof entrySchema>;
const stored = z.object({ version: z.literal(1), id: z.string().uuid(), sequence:z.number().int().min(0).max(2147483647).optional(), entry: entrySchema }).strict();

export function readRecord(key: string, raw: string, base: string) {
  const record = stored.parse(JSON.parse(raw));
  if (key !== base + record.id) throw new Error("Calendar record ID mismatch");
  return record;
}

export function listCalendar(scope: CalendarScope) {
  const base = prefix(scope);
  const entries = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(base)) continue;
    const raw = localStorage.getItem(key);
    if (raw !== null) entries.push(readRecord(key, raw, base));
  }
  // Project deadlines directly from Planner. No copying or ownership inference during migration.
  const deadlines = listPlannerItems(projectId(scope)).flatMap(task =>
    task.dueDate ? [{ taskId: task.id, title: task.title, dueDate: task.dueDate, status: task.status }] : []
  );
  return { deadlines, entries };
}

export function saveCalendarEntry(scope: CalendarScope, entry: CalendarEntry, existingId?: string) {
  const base = prefix(scope);
  const record = stored.parse({ version: 1, id: existingId ?? crypto.randomUUID(), entry });
  const key = base + record.id;
  for (const slot of Object.keys(entry.recurrence?.exceptions ?? {}))
    if (!includesOriginalSlot(entry,slot)) throw Error("Exception does not reference an occurrence of this series.");
  let prior:typeof record|undefined;
  if (existingId !== undefined) {
    const previous = localStorage.getItem(key);
    if (previous === null) throw new Error("Calendar record missing in this scope");
    prior = readRecord(key, previous, base);
    if(JSON.stringify(prior.entry)===JSON.stringify(record.entry))return prior;
    record.sequence=(prior.sequence??0)+1;
    if(record.sequence>2147483647)throw Error("Calendar revision limit reached.");
  }
  if (entry.kind === "session" && !listPlannerItems(projectId(scope),true).some(task => task.id === entry.taskId)) {
    throw new Error("Task missing in this scope");
  }
  localStorage.setItem(key, JSON.stringify(record));
  const pid=projectId(scope),task=entry.kind==="session"?listPlannerItems(pid,true).find(t=>t.id===entry.taskId):undefined;
  const changes=Object.entries(entry.recurrence?.exceptions??{}).filter(([slot,value])=>
    JSON.stringify(prior?.entry.recurrence?.exceptions?.[slot])!==JSON.stringify(value));
  appendHistory({projectId:pid,taskId:task?.id,slot:changes.length===1?changes[0][0]:task?.occurrence?.slot,itemId:record.id,
    title:entry.kind==="event"?entry.title:task?.title??"Session",
    action:(entry.kind==="event"?"Event":"Session")+(changes.length&&changes.every(([,v])=>"cancelled" in v)?" occurrence cancelled":existingId?" rescheduled":" scheduled"),
    detail:changes.length?changes.map(([slot,v])=>slot+" → "+("cancelled" in v?"cancelled":v.startsAt+" – "+v.endsAt)).join("\n"):
      (prior?prior.entry.startsAt+" → ":"")+entry.startsAt+" – "+entry.endsAt});
  if(typeof window !== "undefined") window.dispatchEvent(new Event("qah:calendar-changed"));
  return record;
}

export function cancelCalendarOccurrence(scope:CalendarScope,id:string,slot:string){
 const current=listCalendar(scope).entries.find(row=>row.id===id)?.entry;
 if(!current?.recurrence)throw Error("Recurring Calendar entry is unavailable.");
 return saveCalendarEntry(scope,{...current,recurrence:{...current.recurrence,exceptions:{...current.recurrence.exceptions,[slot]:{cancelled:true}}}},id);
}
