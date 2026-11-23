import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  changeDependency, listPlannerItems, prerequisiteDetails, referenceKey,
  type PlannerItem, type TaskReference,
} from "@/lib/planner";
import type { Project } from "../calendar/scheduling";

export function DependencyEditor({item, projectId, projects, refresh}: {
  item: PlannerItem; projectId?: string; projects: Project[]; refresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState(projectId ?? "");
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const parent = {taskId: item.id, projectId};
  const links = prerequisiteDetails(item, projects);
  const remaining = links.filter(link => link.status !== "done").length;
  const candidates = open ? listPlannerItems(scope || undefined).filter(candidate => {
    const key = referenceKey({taskId: candidate.id, projectId: scope || undefined});
    return key !== referenceKey(parent) && !links.some(link => referenceKey(link.ref) === key);
  }) : [];

  async function change(ref: TaskReference, action: "add" | "remove") {
    try {
      // Serialize graph edits across same-origin tabs before checking for cycles.
      await navigator.locks.request("qah:planner:dependencies", () => changeDependency(parent, ref, action, projects));
      setSelected("");
      setError("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update prerequisites.");
    }
  }
  return <details className="basis-full border-t border-qah-border pt-2 text-sm" onToggle={e => setOpen(e.currentTarget.open)}>
    <summary className="cursor-pointer">Prerequisites{links.length > 0 && (remaining ? ` · ${remaining} unresolved` : " · All done")}</summary>
    <ul>{links.map(link => <li key={referenceKey(link.ref)} className="my-2 flex flex-wrap items-center gap-2">
      <span>{link.label} · {link.status ?? "Unresolved"}</span>
      <Button size="sm" variant="ghost" aria-label={`Remove prerequisite ${link.label}`} onClick={() => change(link.ref, "remove")}>Remove</Button>
    </li>)}</ul>
    <form className="mt-2 flex flex-wrap items-center gap-2" onSubmit={e => {
      e.preventDefault();
      if (selected) void change({taskId: selected, projectId: scope || undefined}, "add");
    }}>
      <label>Prerequisite scope <select className="bg-qah-bg" value={scope} onChange={e => {setScope(e.target.value); setSelected("");}}>
        <option value="">Workspace</option>
        {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
      </select></label>
      <label>Prerequisite task <select className="bg-qah-bg" value={selected} onChange={e => setSelected(e.target.value)}>
        <option value="">Select a task</option>
        {candidates.map(task => <option key={task.id} value={task.id}>{task.title}{task.occurrence && " · " + task.dueDate}</option>)}
      </select></label>
      <Button size="sm" disabled={!selected}>Add prerequisite</Button>
    </form>
    {error && <p role="alert">{error}</p>}
  </details>;
}
