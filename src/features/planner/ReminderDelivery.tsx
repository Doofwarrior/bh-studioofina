import { useEffect, useState } from "react";
import { listProjects } from "@/lib/storage";
import { listPlannerItems } from "@/lib/planner";
import { listCalendar } from "@/lib/calendar";
import { dueReminder, notifyDesktop } from "@/lib/taskReminders";
import { sources, scope } from "../calendar/scheduling";

export function ReminderDelivery() {
  const [problem, setProblem] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  useEffect(() => {
    let live = true,
      busy = false;
    async function scan() {
      if (busy) return;
      busy = true;
      try {
        const projects = await listProjects();
        await navigator.locks.request("qah:reminder-delivery", () => {
          if (!live) return;
          for (const source of sources(projects)) {
            const tasks = listPlannerItems(source.projectId).filter(
              (t) => t.status !== "done" && t.reminders?.some((r) => r.enabled),
            );
            if (!tasks.length) continue;
            const sessions = listCalendar(scope(source)).entries;
            for (const task of tasks)
              for (const r of task.reminders ?? []) {
                const session =
                  r.sessionId &&
                  sessions.find((s) => s.id === r.sessionId)?.entry;
                const anchor = r.sessionId
                  ? session &&
                    session.kind === "session" &&
                    session.taskId === task.id
                    ? session.startsAt
                    : undefined
                  : task.dueDate;
                if (
                  anchor &&
                  dueReminder(source.projectId, task.id, r, anchor, Date.now())
                ) {
                  const msg =
                    task.title +
                    " · " +
                    source.name +
                    " · " +
                    (r.sessionId ? "Session " : "Deadline ") +
                    new Date(
                      anchor.includes("T") ? anchor : anchor + "T00:00",
                    ).toLocaleString();
                  setMessages((old) => [...old, msg]);
                  if (r.desktop)
                    try {
                      notifyDesktop(msg);
                    } catch {
                      /* In-app delivery remains available. */
                    }
                }
              }
          }
        });
        if (live) setProblem("");
      } catch {
        if (live) setProblem("Reminder check unavailable. QAL’AT will retry.");
      } finally {
        busy = false;
      }
    }
    void scan();
    const timer = setInterval(scan, 15000);
    window.addEventListener("qah:reminders-changed", scan);
    window.addEventListener("focus", scan);
    return () => {
      live = false;
      clearInterval(timer);
      window.removeEventListener("qah:reminders-changed", scan);
      window.removeEventListener("focus", scan);
    };
  }, []);
  if (!messages.length && problem) return <span role="status">{problem}</span>;
  return messages.length ? (
    <aside
      role="status"
      className="fixed left-2 top-14 z-50 max-w-sm border border-qah-border bg-qah-surface p-3"
    >
      Reminder · {messages[0]}{" "}
      <button onClick={() => setMessages((m) => m.slice(1))}>
        Dismiss ({messages.length})
      </button>
    </aside>
  ) : null;
}
