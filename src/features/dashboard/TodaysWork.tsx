import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { todaysWork, type Project } from "../calendar/scheduling";
import { dayKey } from "../calendar/viewModel";
import { offsetDay } from "@/lib/recurrence";
import { ensureOccurrences, confirmPrerequisites, updatePlannerItem } from "@/lib/planner";
export function TodaysWork({ projects }: { projects: Project[] }) {
  const [, refresh] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    const reload = () => {
      try {
        const today = dayKey(new Date());
        for (const id of [undefined, ...projects.map(project => project.id)]) {
          ensureOccurrences(id,offsetDay(today,-30),today);
        }
        refresh(n => n + 1);
      } catch {setError("Recurring tasks could not be loaded.");}
    };
    reload();
    window.addEventListener("storage", reload);
    return () => window.removeEventListener("storage", reload);
  }, [projects]);
  const now = new Date();
  let rows;
  try {
    rows = todaysWork(projects, now);
  } catch {
    return <p role="alert">Today's Work could not be loaded.</p>;
  }
  return (
    <section
      aria-label="Today's Work"
      className="hud-frame break-words p-4"
    >
      <h2 className="text-lg font-semibold">Today's Work</h2>
      {!rows.length && (
        <p className="text-sm text-qah-text-muted">
          No deadlines or work sessions for today.
        </p>
      )}
      <ul>
        {rows.map((i) => (
          <li
            key={JSON.stringify([i.projectId, i.id])}
            className="flex flex-wrap items-center gap-2 border-t border-qah-border py-2 text-sm"
          >
            <strong>{i.title}</strong>
            <span>
              {i.kind === "Session"
                ? "Work session"
                : dayKey(new Date(i.start)) < dayKey(now)
                  ? "Overdue"
                  : "Due today"}{" "}
              · {i.source} · {i.status ?? "Task unavailable"}
            </span>
            <time className="data-meta">
              {dayKey(new Date(i.start))}
              {!i.allDay &&
                " " +
                  new Date(i.start).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
            </time>
            {i.taskId && i.status && i.status !== "done" && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  try {
                    if (!confirmPrerequisites({taskId: i.taskId!, projectId: i.projectId}, projects, "Complete task")) return;
                    updatePlannerItem(
                      i.taskId!,
                      { status: "done" },
                      i.projectId,
                    );
                    refresh((n) => n + 1);
                    setError("");
                  } catch {
                    setError("Could not update task status.");
                  }
                }}
              >
                Mark done
              </Button>
            )}
          </li>
        ))}
      </ul>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
