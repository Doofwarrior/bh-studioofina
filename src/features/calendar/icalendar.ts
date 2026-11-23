import { calendarInstances } from "../../lib/calendarOccurrences";
import { listCalendar } from "../../lib/calendar";
import { plannerExportWindow } from "../../lib/planner";
import { dayNumber } from "../../lib/recurrence";
import { sources, scope, type Project } from "./scheduling";
import { dayKey } from "./viewModel";

const utf8 = new TextEncoder();
function escapeText(value: string) {
  return Array.from(value)
    .filter(
      (c) =>
        c === "\r" ||
        c === "\n" ||
        c === "\t" ||
        (c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127),
    )
    .join("")
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|[\r\n]/g, "\\n")
    .replace(/[,;]/g, (c) => "\\" + c);
}
function fold(line: string) {
  let result = "",
    width = 0;
  for (const char of line) {
    const size = utf8.encode(char).length;
    if (width + size > 75) {
      result += "\r\n ";
      width = 1;
    }
    result += char;
    width += size;
  }
  return result;
}
function utc(ms: number) {
  return new Date(ms)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}
const dateValue = (day: string) => day.replace(/-/g, "");
interface Times {
  start: string;
  end?: string;
  allDay: boolean;
}
export function exportCalendar(
  projects: Project[],
  filter: string,
  from: string,
  through: string,
  now = new Date(),
) {
  const length = dayNumber(through) - dayNumber(from) + 1;
  if (length < 1 || length > 62)
    throw Error("Select a Calendar view spanning 1–62 days.");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Qalat//Work Calendar//EN",
    "CALSCALE:GREGORIAN",
  ];
  const seen = new Set<string>(),
    stamp = utc(+now);
  for (const src of sources(projects, filter)) {
    function append(
      key: (string | number)[],
      title: string,
      kind: string,
      times: Times,
      cancelled = false,
      sequence?: number,
    ) {
      const uid =
        encodeURIComponent(JSON.stringify([src.projectId ?? null, ...key])) +
        "@qalat.local";
      if (seen.has(uid))
        throw Error("Duplicate Calendar identity. Export stopped.");
      seen.add(uid);
      const field = times.allDay ? ";VALUE=DATE:" : ":";
      lines.push(
        "BEGIN:VEVENT",
        "UID:" + uid,
        "DTSTAMP:" + stamp,
        "DTSTART" + field + times.start,
      );
      if (sequence !== undefined) lines.push("SEQUENCE:" + sequence);
      if (times.end) lines.push("DTEND" + field + times.end);
      lines.push(
        "SUMMARY:" + escapeText(title),
        "CATEGORIES:" + kind,
        "X-QALAT-PROJECT:" + escapeText(src.name),
      );
      if (kind === "Deadline") lines.push("TRANSP:TRANSPARENT");
      if (cancelled) lines.push("STATUS:CANCELLED");
      lines.push("END:VEVENT");
    }
    const tasks = new Map(
      plannerExportWindow(src.projectId, from, through).map((t) => [t.id, t]),
    );
    for (const t of tasks.values()) {
      if (!t.dueDate) continue;
      const timed = t.dueDate.includes("T"),
        day = timed ? dayKey(new Date(t.dueDate)) : t.dueDate;
      if (day < from || day > through) continue;
      const times = timed
        ? { allDay: false, start: utc(Date.parse(t.dueDate)) }
        : { allDay: true, start: dateValue(day) };
      append(
        ["deadline", t.id],
        t.title,
        "Deadline",
        times,
        !!(t.occurrence?.removed || t.occurrence?.retired),
      );
    }
    for (const { id, entry, sequence } of listCalendar(scope(src)).entries) {
      const title =
        entry.kind === "event"
          ? entry.title
          : (tasks.get(entry.taskId)?.title ??
            "Work session (task unavailable)");
      for (const {
        start,
        end,
        allDay,
        ordinal,
        cancelled,
      } of calendarInstances(entry, { from, through }))
        append(
          ["entry", id, ordinal],
          title,
          entry.kind === "event" ? "Event" : "Session",
          allDay
            ? {
                allDay,
                start: dateValue(dayKey(new Date(start))),
                end: dateValue(dayKey(new Date(end))),
              }
            : {
                allDay,
                start: utc(start),
                end: utc(Math.max(end, Math.floor(start / 1000) * 1000 + 1000)),
              },
          cancelled,
          sequence ?? 0,
        );
    }
  }
  if (!seen.size)
    throw Error("No Calendar items in the selected dates and projects.");
  lines.push("END:VCALENDAR");
  return { text: lines.map(fold).join("\r\n") + "\r\n", count: seen.size };
}
