import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { confirmPrerequisites, createPlannerItem } from "@/lib/planner";
import {
  conflicts,
  saveSession,
  setDeadline,
  type Task,
  type Project,
} from "./scheduling";
import { type Item } from "./viewModel";
const inputStyle =
  "border border-qah-border bg-qah-bg px-2 py-1 text-sm";
export function QuickAdd({
  projects,
  initial,
  onSave,
}: {
  projects: Project[];
  initial: string;
  onSave: () => void;
}) {
  const [error, setError] = useState("");
  return (
    <details>
      <summary>Quick Add</summary>
      <form
        className="flex flex-wrap items-end gap-2 p-2"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = new FormData(form);
          const title = String(data.get("title")).trim();
          if (!title) return;
          try {
            createPlannerItem(
              { title, dueDate: String(data.get("date")) },
              String(data.get("project")) || undefined,
            );
            form.reset();
            setError("");
            onSave();
          } catch {
            setError("Task could not be saved.");
          }
        }}
      >
        <label>
          Task title <input className={inputStyle} name="title" required />
        </label>
        <label>
          Optional deadline{" "}
          <input className={inputStyle} name="date" type="date" />
        </label>
        <label>
          Assign to{" "}
          <select className={inputStyle} name="project" defaultValue={initial}>
            <option value="">Workspace</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <Button>Add task</Button>
        {error && <span role="alert">{error}</span>}
      </form>
    </details>
  );
}
export interface Selection {
  target: Task;
  date: string;
  editing?: Item;
}
export function ScheduleDialog({
  selection,
  projects,
  items,
  defaultTime,
  duration,
  onClose,
  onSave,
}: {
  selection: Selection;
  projects: Project[];
  items: Item[];
  defaultTime: string;
  duration: number;
  onClose: () => void;
  onSave: () => void;
}) {
  const { target, editing } = selection;
  const [date, setDate] = useState(selection.date);
  const [time, setTime] = useState(
    editing ? new Date(editing.start).toTimeString().slice(0, 5) : defaultTime,
  );
  const [minutes, setMinutes] = useState(
    editing ? Math.round((editing.end - editing.start) / 60000) : duration,
  );
  const [mode, setMode] = useState<"deadline" | "session" | null>(
    editing ? "session" : null,
  );
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialog.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  const start = new Date(date + "T" + time).getTime();
  const overlaps =
    mode === "session" ? conflicts(items, start, minutes, editing) : [];
  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      aria-label="Schedule task"
      className="m-auto max-w-full border border-qah-border bg-qah-surface p-5 text-qah-text backdrop:bg-black/70"
    >
      <h2>
        {target.task.title} · {target.name}
      </h2>
      {!editing && (
        <div className="flex gap-2 my-3">
          {(["deadline", "session"] as const).map((m) => (
            <Button
              key={m}
              variant={mode === m ? "primary" : "secondary"}
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
            >
              {m === "deadline" ? "Set Deadline" : "Schedule Work Session"}
            </Button>
          ))}
        </div>
      )}
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!mode) return;
          try {
            if (!confirmPrerequisites({taskId: target.task.id, projectId: target.projectId}, projects,
              mode === "deadline" ? "Set deadline" : "Schedule work session")) return;
            if (mode === "deadline") setDeadline(target, date, time);
            else saveSession(target, start, minutes, editing?.seriesEntryId??editing?.id,editing?.entrySlot);
            onSave();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to save.");
          }
        }}
      >
        <label>
          Date{" "}
          <input
            required
            type="date"
            className={inputStyle}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          Time{" "}
          <input
            required={mode === "session"}
            type="time"
            className={inputStyle}
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>
        {mode === "session" && (
          <label>
            Duration (minutes){" "}
            <input
              required
              type="number"
              min="1"
              className={inputStyle}
              value={minutes || ""}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />
          </label>
        )}
        {overlaps.length > 0 && (
          <p role="status">
            Overlaps{" "}
            {overlaps.map((i) => i.title + " (" + i.source + ")").join(", ")}.
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        <div className="flex gap-2">
          <Button disabled={!mode}>
            {overlaps.length ? "Save despite overlap" : "Save"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </dialog>
  );
}
