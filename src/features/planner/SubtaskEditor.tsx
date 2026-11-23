import { Badge } from "@/components/ui/Badge";
import { ProgressTrack } from "@/components/ui/ProgressTrack";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { changeSubtask, subtaskPercent, type PlannerItem, type SubtaskChange } from "@/lib/planner";

export function SubtaskEditor({ item, projectId, refresh }: {
  item: PlannerItem; projectId?: string; refresh: () => void;
}) {
  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null);
  const [error, setError] = useState("");
  const percent = subtaskPercent(item);
  function apply(change: SubtaskChange) {
    try {
      changeSubtask(item.id, change, projectId);
      refresh();
      setError("");
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save subtask.");
      return false;
    }
  }
  const input = "rounded-sm border border-qah-border bg-qah-bg px-2 py-1";
  return <details className="basis-full border-t border-qah-border pt-2 text-sm">
    <summary className="cursor-pointer">Subtasks{percent !== undefined && ` · ${percent}% complete`}{percent !== undefined && <span className="ml-2 inline-block w-16 align-middle"><ProgressTrack value={percent} label="Subtask completion" /></span>}</summary>
    <ul>{item.subtasks?.map(child => <li key={child.id} className="my-2 flex flex-wrap items-center gap-2">
      <label><input type="checkbox" checked={child.done} onChange={e => apply({kind:"check", id:child.id, done:e.target.checked})}/> <span className={child.done ? "line-through text-qah-text-muted" : undefined}>{child.title}</span></label>
      {editing?.id === child.id ? <form className="flex flex-wrap gap-2" onSubmit={e => {
        e.preventDefault();
        if (apply({kind:"rename", ...editing})) setEditing(null);
      }}>
        <input autoFocus aria-label="Edit subtask title" className={input} value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})}/>
        <Button size="sm" disabled={!editing.title.trim()}>Save</Button>
        <Button size="sm" variant="ghost" type="button" onClick={()=>setEditing(null)}>Cancel</Button>
      </form> : <Button size="sm" variant="ghost" onClick={()=>setEditing({id:child.id,title:child.title})}>Edit</Button>}
      <Button size="sm" variant="ghost" aria-label={`Remove ${child.title}`} onClick={()=>apply({kind:"remove",id:child.id})}>Remove</Button>
    </li>)}</ul>
    <form className="mt-2 flex flex-wrap gap-2" onSubmit={e=>{
      e.preventDefault();
      if (apply({kind:"add",title})) setTitle("");
    }}>
      <input className={input} aria-label="New subtask title" value={title} onChange={e=>setTitle(e.target.value)}/>
      <Button size="sm" variant="secondary" disabled={!title.trim()}>Add subtask</Button>
    </form>
    {error && <p role="alert"><Badge variant="danger">{error}</Badge></p>}
  </details>;
}
