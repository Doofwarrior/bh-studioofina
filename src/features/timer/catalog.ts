import { listProjects } from "@/lib/storage";
import { listCalendar } from "@/lib/calendar";
import { listPlannerItems } from "@/lib/planner";
import { scope, sources } from "../calendar/scheduling";
import type { WorkTarget } from "@/lib/workTimer";

export interface Choice {
  target: WorkTarget;
  start?: number;
  end?: number;
}
export async function timerChoices() {
  const projects = await listProjects();
  const choices: Choice[] = [];
  for (const source of sources(projects)) {
    const tasks = listPlannerItems(source.projectId, true);
    const byId = new Map(
      tasks.map((task) => [
        task.id,
        {
          project: source.name,
          projectId: source.projectId,
          taskId: task.id,
          title: task.title,
          slot: task.occurrence?.slot,
        },
      ]),
    );
    for (const task of tasks)
      if (!task.occurrence?.retired)
        choices.push({ target: byId.get(task.id)! });
    for (const { id, entry } of listCalendar(scope(source)).entries) {
      if (entry.kind !== "session") continue;
      const task = byId.get(entry.taskId);
      if (task)
        choices.push({
          target: { ...task, sessionId: id },
          start: Date.parse(entry.startsAt),
          end: Date.parse(entry.endsAt),
        });
    }
  }
  return { projects, choices };
}
export function validateTarget(target: WorkTarget, projects: { id: string }[]) {
  if (
    target.projectId !== undefined &&
    !projects.some((p) => p.id === target.projectId)
  )
    throw Error("The selected project is unavailable.");
  const task = listPlannerItems(target.projectId, true).find(
    (item) => item.id === target.taskId,
  );
  if (!task) throw Error("The selected task is unavailable.");
  if (target.sessionId) {
    const source = { name: target.project, projectId: target.projectId };
    const session = listCalendar(scope(source)).entries.find(
      (row) => row.id === target.sessionId,
    )?.entry;
    if (session?.kind !== "session" || session.taskId !== target.taskId)
      throw Error(
        "The scheduled session is unavailable or belongs to another task.",
      );
  }
}
export function openWorkTimer(
  target?: Pick<WorkTarget, "projectId" | "taskId" | "sessionId">,
) {
  window.dispatchEvent(
    new CustomEvent("qah:timer-details", { detail: target }),
  );
}
