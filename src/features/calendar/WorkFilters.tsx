import { useState } from "react";
import type { Project } from "./scheduling";
import type { Filters } from "./workInsights";
const field = "max-w-full border border-qah-border bg-qah-bg p-1";
export function WorkFilters({
  projects,
  f,
  set,
  children,
}: {
  projects: Project[];
  f: Filters;
  set: (f: Filters) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2 text-sm">
      <label>
        Work project{" "}
        <select
          className={field}
          value={f.project}
          onChange={(e) => set({ ...f, project: e.target.value })}
        >
          <option value="all">All projects</option>
          <option value="workspace">Workspace</option>
          {projects.map((p) => (
            <option key={p.id} value={"project:" + p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        From{" "}
        <input
          type="date"
          className={field}
          value={f.from}
          max={f.to || undefined}
          onChange={(e) => set({ ...f, from: e.target.value })}
        />
      </label>
      <label>
        Through{" "}
        <input
          type="date"
          className={field}
          value={f.to}
          min={f.from || undefined}
          onChange={(e) => set({ ...f, to: e.target.value })}
        />
      </label>
      {children}
    </div>
  );
}
export function SavedView<T>({
  section,
  value,
  apply,
}: {
  section: string;
  value: T;
  apply: (v: T) => void;
}) {
  const prefix = "qah:work-view:" + section + ":";
  const [name, setName] = useState(""),
    [error, setError] = useState("");
  const names = Object.keys(localStorage)
    .filter((k) => k.startsWith(prefix))
    .map((k) => k.slice(prefix.length))
    .sort();
  return (
    <div className="my-2 flex flex-wrap gap-2 text-sm">
      <label>
        View name{" "}
        <input
          className={field}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <button
        disabled={!name.trim()}
        onClick={() => {
          try {
            if (
              localStorage.getItem(prefix + name.trim()) &&
              !confirm("Replace this saved view?")
            )
              return;
            localStorage.setItem(prefix + name.trim(), JSON.stringify(value));
            setName("");
            setError("");
          } catch {
            setError("Could not save view.");
          }
        }}
      >
        Save view
      </button>
      <select
        className={field}
        aria-label="Load saved view"
        value=""
        onChange={(e) => {
          try {
            apply(JSON.parse(localStorage.getItem(prefix + e.target.value)!));
            setError("");
          } catch {
            setError("Could not load view.");
          }
        }}
      >
        <option value="">Load saved view</option>
        {names.map((n) => (
          <option key={n}>{n}</option>
        ))}
      </select>
      {error && <span role="alert">{error}</span>}
    </div>
  );
}
