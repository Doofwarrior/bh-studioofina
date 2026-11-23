import {cancelCalendarOccurrence} from "@/lib/calendar";
import { exportCalendar } from "./icalendar";
import {WorkReport} from "./WorkReport";
import {openWorkTimer} from "../timer/catalog";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { listProjects } from "@/lib/storage";
import {
  addDays,
  dayKey,
  onDay,
  preferenceKey,
  preferences,
  readItems,
  shift,
  views,
  visibleDays,
  type Item,
  type Preferences,
} from "./viewModel";

import { sources, scope, unscheduled, type Task } from "./scheduling";
import {
  QuickAdd,
  ScheduleDialog,
  type Selection,
} from "./ScheduleControls";
import { ensureOccurrences, listPlannerItems } from "@/lib/planner";
function initialSelection(
  target: Task,
  day: Date,
  editing?: Item,
): Selection {
  return { target, date: dayKey(day), editing };
}

const dragType = "application/x-qalat-task";
const taskKey = (t: Task) => JSON.stringify([t.projectId ?? null, t.task.id]);

const weekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const longDate = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});
const time = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});
const control = "border border-qah-border bg-qah-surface p-1 text-sm";
type Source = { id: string; name: string };

function ItemCard({
  item,
  day,
  cancel,
  edit,
}: {
  item: Item;
  day: Date;
  edit: () => void;
  cancel: () => void;
}) {
  const previous = item.start < +day;
  const following = item.end > +addDays(day, 1);
  const timing = item.allDay
    ? "All day"
    : [
        previous ? "Continues" : time.format(item.start),
        following ? "next day" : time.format(item.end),
      ].join(" – ");
  return (
    <li id={"work-item-"+item.id} className="my-1 break-words border-l-2 border-qah-accent bg-qah-bg px-2 py-1">
      <span className="data-meta block">
        {item.kind} ·{" "}
        {item.kind === "Deadline" && !item.allDay
          ? time.format(item.start)
          : timing}
      </span>
      <strong className="block text-sm">{item.title}</strong>
      <span className="text-xs text-qah-text-muted">{item.source}</span>
      {item.kind==="Session" && item.taskId && item.status && <Button size="sm" onClick={()=>openWorkTimer({taskId:item.taskId!,projectId:item.projectId,sessionId:item.seriesEntryId??item.id})}>Work timer</Button>}
      {item.entrySlot && <Button size="sm" variant="secondary" onClick={cancel}>Cancel occurrence</Button>}
      {(item.kind === "Session" || item.occurrenceSlot) && item.status && (
        <Button size="sm" variant="secondary" onClick={edit}>
          {item.kind === "Session" ? "Reschedule" : "Schedule occurrence"}
        </Button>
      )}
    </li>
  );
}

export function CalendarPage() {
  const params=new URLSearchParams(location.search);
  const linked=params.get("item"), linkedDay=params.get("day");
  const [date,setDate]=useState(()=>linkedDay && Number.isFinite(Date.parse(linkedDay+"T00:00"))?new Date(linkedDay+"T00:00"):new Date());
  const [prefs, setPrefs] = useState(()=>linked?{...preferences(),view:"Day" as const}:preferences());
  const [filter, setFilter] = useState(()=>linked?(params.get("project")?"project:"+params.get("project"):"workspace"):"all");
  const [projects, setProjects] = useState<Source[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [selection, select] = useState<Selection | null>(null);
  const [error, setError] = useState("");
  const [exportStatus, setExportStatus] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision((n) => n + 1);
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);
  useEffect(() => {
    let active = true;
    async function load() {
      const sourcesList = await listProjects();
      if (!active) return;
      setProjects(sourcesList);
      const selected = sources(sourcesList, filter);
      const days = visibleDays(date, prefs.view, prefs.weekStart);
      for (const source of selected) ensureOccurrences(source.projectId, dayKey(days[0]), dayKey(days[days.length-1]));
      const all = sources(sourcesList).flatMap((s) =>
        readItems(scope(s), s.name, {from:dayKey(days[0]),through:dayKey(days[days.length-1])}),
      );
      setAllItems(all);
      setTasks(selected.flatMap(unscheduled));
      const records = all.filter((i) =>
        selected.some((s) => s.projectId === i.projectId),
      );
      records.sort(
        (a, b) => a.start - b.start || a.title.localeCompare(b.title),
      );
      setItems(records);
      setError("");
    }
    load().catch(() => {
      if (active) {
        setItems([]);
        setTasks([]);
        setAllItems([]);
        setError("Calendar records could not be loaded.");
      }
    });
    return () => {
      active = false;
    };
  }, [filter, revision, date, prefs.view, prefs.weekStart]);

  useEffect(()=>{if(linked){const el=document.getElementById("work-item-"+linked);if(el){el.scrollIntoView({block:"center"});el.classList.add("outline","outline-qah-accent")}}},[linked,items]);
  function update(patch: Partial<Preferences>) {
    const next = { ...prefs, ...patch };
    if (!next.start || !next.end || next.start >= next.end) {
      setSettingsError("Working hours must end after they start.");
      return;
    }
    setPrefs(next);
    try {
      localStorage.setItem(preferenceKey, JSON.stringify(next));
      setSettingsError("");
    } catch {
      setSettingsError("These preferences could not be saved.");
    }
  }
  const { view } = prefs;
  const days = visibleDays(date, view, prefs.weekStart);
  const title =
    view === "Month"
      ? date.toLocaleDateString(undefined, { month: "long", year: "numeric" })
      : days.length === 1
        ? longDate.format(days[0])
        : longDate.format(days[0]) +
          " – " +
          longDate.format(days[days.length - 1]);
  const groups = days
    .map((day) => ({ day, rows: items.filter((item) => onDay(item, day)) }))
    .filter((group) => view !== "Agenda" || group.rows.length);
  return (
    <section aria-label="Calendar" className="space-y-4 text-qah-text">
      <WorkReport projects={projects} historyId={params.get("history")} />
      <h1 className="text-2xl font-semibold">Calendar</h1>
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Calendar view" className="qah-view-switch">
          {views.map((v) => (
            <Button
              key={v}
              size="sm"
              variant={view === v ? "primary" : "secondary"}
              aria-pressed={view === v}
              onClick={() => update({ view: v })}
            >
              {v}
            </Button>
          ))}
        </div>
        <label>
          Project{" "}
          <select
            className={control}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All projects and workspace</option>
            <option value="workspace">Workspace only</option>
            {projects.map((p) => (
              <option key={p.id} value={"project:" + p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <Button size="sm" variant="secondary" onClick={async () => {
          try {
            const from = dayKey(days[0]), through = dayKey(days[days.length - 1]);
            const result = exportCalendar(await listProjects(), filter, from, through);
            const url = URL.createObjectURL(new Blob([result.text], {type:"text/calendar;charset=utf-8"}));
            const link = document.createElement("a");
            link.href = url;
            link.download = `qalat-calendar-${from}-${through}.ics`;
            link.click();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
            setExportStatus(`Exported ${result.count} Calendar items for ${from} through ${through}.`);
          } catch (err) {
            setExportStatus(err instanceof Error ? err.message : "Calendar export failed.");
          }
        }}>Export view (.ics)</Button>
      </div>
      <p role="status" className="text-sm">{exportStatus}</p>
      <details className="border border-qah-border p-3 text-sm">
        <summary className="cursor-pointer">Calendar settings</summary>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label>
            Week starts on{" "}
            <select
              className={control}
              value={prefs.weekStart}
              onChange={(e) => update({ weekStart: Number(e.target.value) })}
            >
              {weekdays.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label>
            Default session (minutes){" "}
            <input
              type="number"
              min="1"
              className={control}
              value={prefs.duration}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isInteger(n) && n > 0) update({ duration: n });
              }}
            />
          </label>
          <label>
            Work starts{" "}
            <input
              className={control}
              type="time"
              value={prefs.start}
              onChange={(e) => update({ start: e.target.value })}
            />
          </label>
          <label>
            Work ends{" "}
            <input
              className={control}
              type="time"
              value={prefs.end}
              onChange={(e) => update({ end: e.target.value })}
            />
          </label>
        </div>
        <fieldset className="mt-3 flex flex-wrap gap-3">
          <legend>Working days</legend>
          {weekdays.map((d, i) => (
            <label key={d}>
              <input
                type="checkbox"
                checked={prefs.days.includes(i)}
                onChange={(e) =>
                  update({
                    days: e.target.checked
                      ? [...prefs.days, i]
                      : prefs.days.filter((n) => n !== i),
                  })
                }
              />{" "}
              {d.slice(0, 3)}
            </label>
          ))}
        </fieldset>
      </details>
      {settingsError && <p role="alert">{settingsError}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-lg">{title}</h2>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setDate(shift(date, view, -1))}
        >
          Previous
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setDate(new Date())}
        >
          Today
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setDate(shift(date, view, 1))}
        >
          Next
        </Button>
      </div>
      <QuickAdd
        key={filter}
        projects={projects}
        initial={filter.startsWith("project:") ? filter.slice(8) : ""}
        onSave={() => setRevision((n) => n + 1)}
      />
      <div className="grid items-start gap-3 lg:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)]">
        <details open className="border border-qah-border bg-qah-surface p-3">
          <summary>Unscheduled Tasks ({tasks.length})</summary>
          {tasks.map((t) => (
            <div
              key={taskKey(t)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(dragType, taskKey(t));
                e.dataTransfer.effectAllowed = "move";
              }}
              className="my-2 border-t border-qah-border pt-2"
            >
              <p>{t.task.title}</p>
              <small>{t.name}</small>{" "}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => select(initialSelection(t, date))}
              >
                Schedule
              </Button>
            </div>
          ))}
        </details>
        {error ? (
          <p role="alert">{error}</p>
        ) : (
          <div
            aria-label={view + " view"}
            className={
              "grid gap-px bg-qah-border " +
              (view === "Month" || view === "Week" ? "sm:grid-cols-7" : "")
            }
          >
            {groups.map(({ day, rows }) => (
              <article
                key={dayKey(day)}
                onDragOver={(e) => {
                  if (e.dataTransfer.types.includes(dragType))
                    e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const t = tasks.find(
                    (t) => taskKey(t) === e.dataTransfer.getData(dragType),
                  );
                  if (t) select(initialSelection(t, day));
                }}
                className={
                  "min-w-0 p-2 " +
                  (prefs.days.includes(day.getDay())
                    ? "bg-qah-surface"
                    : "bg-qah-bg")
                }
              >
                <h3
                  className={
                    dayKey(day) === dayKey(new Date())
                      ? "font-bold text-qah-accent"
                      : "font-medium"
                  }
                >
                  {longDate.format(day)}
                </h3>
                {view !== "Month" && (
                  <small className="text-qah-text-muted">
                    {prefs.days.includes(day.getDay())
                      ? prefs.start + " – " + prefs.end
                      : "Non-working day"}
                  </small>
                )}
                <ul>
                  {rows.map((item, i) => (
                    <ItemCard
                      key={item.id + "-" + i}
                      item={item}
                      day={day}
                      cancel={() => {
                        if (!item.entrySlot || !item.seriesEntryId || !confirm("Cancel this Calendar occurrence?")) return;
                        try {
                          cancelCalendarOccurrence(scope({projectId:item.projectId,name:item.source}),item.seriesEntryId,item.entrySlot);
                          setRevision(n=>n+1);
                        } catch(err) {setSettingsError(err instanceof Error?err.message:"Cancellation failed.");}
                      }}
                      edit={() => {
                        const task = listPlannerItems(item.projectId,true).find(
                          (t) => t.id === item.taskId,
                        );
                        if (task)
                          select(
                            initialSelection(
                              {
                                task,
                                projectId: item.projectId,
                                name: item.source,
                              },
                              new Date(item.start),
                              item.kind === "Session" ? item : undefined,
                            ),
                          );
                      }}
                    />
                  ))}
                </ul>
                {!rows.length && view === "Day" && (
                  <p className="py-3 text-sm">No scheduled items.</p>
                )}
              </article>
            ))}
            {!groups.length && (
              <p className="bg-qah-surface p-4">
                No scheduled items in this period.
              </p>
            )}
          </div>
        )}
      </div>
      {selection && (
        <ScheduleDialog
          projects={projects}
          selection={selection}
          items={allItems}
          duration={prefs.duration}
          defaultTime={prefs.start}
          onClose={() => select(null)}
          onSave={() => {
            select(null);
            setRevision((n) => n + 1);
          }}
        />
      )}
    </section>
  );
}
