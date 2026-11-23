import { Badge } from "@/components/ui/Badge";
import {TaskDetails} from "./TaskDetails";
import {openWorkTimer} from "../timer/catalog";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import { RecurrenceEditor } from "./RecurrenceEditor";
import { dayKey } from "../calendar/viewModel";
import { offsetDay } from "@/lib/recurrence";
import { DependencyEditor } from "./DependencyEditor";
import { SubtaskEditor } from "./SubtaskEditor";
import { Button } from "@/components/ui/Button";
import {
  ensureOccurrences,
  confirmPrerequisites,
  createPlannerItem,
  deletePlannerItem,
  listPlannerItems,
  updatePlannerItem,
  type PlannerItem,
  type PlannerStatus,
} from "@/lib/planner";

import {listProjects} from "@/lib/storage";
import type {Project} from "@/features/calendar/scheduling";
export function PlannerPage() {
  const [editing,setEditing]=useState<string | undefined>(()=>new URLSearchParams(location.search).get("task")??undefined);
  const [projects,setProjects]=useState<Project[]>([]);
  const [project,setProject]=useState(()=>new URLSearchParams(location.search).get("project")??"");
  const pid=project||undefined;
  useEffect(()=>{listProjects().then(setProjects)},[]);
  useEffect(()=>{const reload=()=>{
    try {
      const today = dayKey(new Date());
      ensureOccurrences(pid,offsetDay(today,-30),offsetDay(today,30));
      setItems(listPlannerItems(pid));
    } catch {setStatusError("Planner records could not be loaded.");}
  }; reload();window.addEventListener("storage",reload);return ()=>window.removeEventListener("storage",reload)},[pid]);
  const [items, setItems] = useState<PlannerItem[]>(() => listPlannerItems());
  const [title, setTitle] = useState("");
  const [statusError, setStatusError] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");

  const refresh = () => setItems(listPlannerItems(pid));
  const counts = useMemo(
    () => ({
      open: items.filter((item) => item.status !== "done").length,
      due: items.filter((item) => item.dueDate && item.status !== "done").length,
      done: items.filter((item) => item.status === "done").length,
    }),
    [items]
  );

  const handleCreate = () => {
    if (!title.trim()) return;
    createPlannerItem({ title, notes, dueDate },pid);
    setTitle("");
    setNotes("");
    setDueDate("");
    refresh();
  };

  const cycleStatus = (item: PlannerItem) => {
    const next: PlannerStatus = item.status === "todo" ? "doing" : item.status === "doing" ? "done" : "todo";
    try {
      setStatusError("");
      if (next !== "todo" && !confirmPrerequisites({taskId: item.id, projectId: pid}, projects,
        next === "doing" ? "Start task" : "Complete task")) return;
      updatePlannerItem(item.id, {status: next}, pid);
      refresh();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Could not update task.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-4">
      <header className="border border-qah-border-strong bg-qah-bg p-4 sm:p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-qah-text-subtle">03 / PLAN</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.04em] text-qah-text">PLANNER</h1>
            <p className="mt-1 text-sm text-qah-text-muted">To-do and dated work queue.</p>
          </div>
          <div className="flex gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-qah-text-subtle">
            <span className="border border-qah-border px-2 py-1">OPEN {counts.open}</span>
            <span className="border border-qah-border px-2 py-1">DATED {counts.due}</span>
            <span className="border border-qah-border px-2 py-1">DONE {counts.done}</span>
          </div>
        </div>
      </header>

      <label>Planner scope <select className="border border-qah-border bg-qah-bg p-1" value={project} onChange={e=>setProject(e.target.value)}><option value="">Workspace</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <section className="grid gap-3 border border-qah-border-strong bg-qah-surface p-4 md:grid-cols-[1fr_180px_auto]">
        <div className="space-y-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task or next action" className="w-full border border-qah-border-strong bg-qah-bg px-3 py-2 text-sm text-qah-text outline-none focus:border-qah-accent" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="w-full resize-y border border-qah-border-strong bg-qah-bg px-3 py-2 text-sm text-qah-text outline-none focus:border-qah-accent" />
        </div>
        <label className="font-mono text-[9px] uppercase tracking-[0.12em] text-qah-text-subtle">
          Due date
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-2 w-full border border-qah-border-strong bg-qah-bg px-3 py-2 text-sm text-qah-text outline-none focus:border-qah-accent" />
        </label>
        <Button onClick={handleCreate} disabled={!title.trim()} className="self-end"><Plus size={14} className="mr-2" />Add</Button>
      </section>

      {statusError && <p role="alert"><Badge variant="danger">{statusError}</Badge></p>}
      <section className="space-y-2">
        {items.length === 0 ? (
          <div className="border border-dashed border-qah-border-strong bg-qah-surface/75 p-10 text-center text-sm text-qah-text-muted">No planned work yet.</div>
        ) : items.map((item) => (
          <article key={JSON.stringify([pid, item.id])} className="flex flex-col gap-3 border border-qah-border-strong bg-qah-surface p-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button type="button" aria-label={`Mark ${item.title} ${item.status === "todo" ? "doing" : item.status === "doing" ? "done" : "to do"}`} onClick={() => cycleStatus(item)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
              {item.status === "done" ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#75C3A1]" /> : <Circle size={17} className="mt-0.5 shrink-0 text-qah-text-subtle" />}
              <span className="min-w-0">
                <span className={`block text-sm font-medium ${item.status === "done" ? "text-qah-text-subtle line-through" : "text-qah-text"}`}>{item.title}</span>
                {item.notes && <span className="mt-1 block text-xs leading-5 text-qah-text-muted">{item.notes}</span>}
                <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.12em] text-qah-text-subtle"><Badge variant={item.status === "done" ? "success" : "default"}>{item.status === "done" ? "Completed" : item.status === "doing" ? "In progress" : "Open"}</Badge>{item.dueDate ? ` / DUE ${item.dueDate}` : ""}</span>
              </span>
            </button>
            {item.dueDate && <span className="data-meta flex items-center gap-1"><CalendarDays size={12} />{item.dueDate}</span>}
            <button type="button" onClick={() => { deletePlannerItem(item.id,pid); refresh(); }} className="self-end p-2 text-qah-text-subtle hover:text-qah-danger sm:self-auto" aria-label={`Delete ${item.title}`}><Trash2 size={14} /></button>
            <Button size="sm" variant="secondary" onClick={()=>openWorkTimer({taskId:item.id,projectId:pid})}>Work timer</Button>
            <Button size="sm" onClick={()=>setEditing(item.id)}>Task details</Button>
            {editing===item.id && <TaskDetails item={item} projectId={pid} projects={projects} refresh={refresh} close={()=>setEditing(undefined)}/>}
            <RecurrenceEditor projects={projects} item={item} projectId={pid} refresh={refresh} />
            <DependencyEditor item={item} projectId={pid} projects={projects} refresh={refresh} />
            <SubtaskEditor item={item} projectId={pid} refresh={refresh} />
          </article>
        ))}
      </section>
    </div>
  );
}
