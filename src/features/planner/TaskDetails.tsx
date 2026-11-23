import { useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";
import {
  confirmPrerequisites,
  saveTaskDetails,
  type PlannerItem,
  type PlannerStatus,
} from "@/lib/planner";
import {
  copyTaskFile,
  isWorkspaceConnected,
  readTaskCopy,
} from "@/lib/storage";
import { desktopPermission, requestDesktop } from "@/lib/taskReminders";
import { readItems, preferences, dayKey } from "../calendar/viewModel";
import { scope, sources, type Project } from "../calendar/scheduling";
import { ScheduleDialog, type Selection } from "../calendar/ScheduleControls";
import { RecurrenceEditor } from "./RecurrenceEditor";
import { SubtaskEditor } from "./SubtaskEditor";
import { DependencyEditor } from "./DependencyEditor";

const field = "max-w-full border border-qah-border bg-qah-bg p-1";
function download(file: File) {
  const url = URL.createObjectURL(file),
    a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function localRef(file: File) {
  return (
    "local-file:" + JSON.stringify([file.name, file.size, file.lastModified])
  );
}
function referenceName(link: string) {
  try {
    if (link.startsWith("local-file:"))
      return "Local reference · " + JSON.parse(link.slice(11))[0];
    if (link.startsWith("workspace-copy:"))
      return "Workspace copy · " + decodeURIComponent(link.split("/").at(-1)!);
  } catch {
    /* Preserve unknown legacy references. */
  }
  return link;
}
export function TaskDetails({
  item,
  projectId,
  projects,
  refresh,
  close,
}: {
  item: PlannerItem;
  projectId?: string;
  projects: Project[];
  refresh: () => void;
  close: () => void;
}) {
  const [base, setBase] = useState(item);
  const [draft, set] = useState(() => ({
    title: item.title,
    notes: item.notes,
    status: item.status,
    dueDate: item.dueDate,
    referenceLinks: item.referenceLinks,
    reminders: item.reminders,
  }));
  const [dirty, mark] = useState(false),
    [error, fail] = useState(""),
    [url, setUrl] = useState(""),
    [permission, setPermission] = useState(desktopPermission);
  const [busy, setBusy] = useState(false),
    [selection, select] = useState<Selection | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const guarded = dirty || busy || !!url;
  useEffect(() => {
    if (!guarded && base !== item) {
      setBase(item);
      set({
        title: item.title,
        notes: item.notes,
        status: item.status,
        dueDate: item.dueDate,
        referenceLinks: item.referenceLinks,
        reminders: item.reminders,
      });
    }
  }, [guarded, base, item]);
  const blocker = useBlocker(guarded);
  useEffect(() => {
    if (blocker.state === "blocked") {
      if (!busy && window.confirm("Discard unsaved task changes?"))
        blocker.proceed();
      else blocker.reset();
    }
  }, [blocker, busy]);
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  useEffect(() => {
    if (!guarded) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [guarded]);
  function cancel() {
    if (!busy && (!guarded || window.confirm("Discard unsaved task changes?")))
      close();
  }
  function change(p: Partial<typeof draft>) {
    set((v) => ({ ...v, ...p }));
    mark(true);
  }
  function message(err: unknown) {
    fail(err instanceof Error ? err.message : "Operation failed.");
  }
  const source = {
    projectId,
    name: projects.find((p) => p.id === projectId)?.name ?? "Workspace",
  };
  const [rows, setRows] = useState(() => readItems(scope(source), source.name));
  const sessions = rows.filter(
    (r) => r.kind === "Session" && r.taskId === item.id,
  );
  const links = draft.referenceLinks ?? [],
    reminders = draft.reminders ?? [];
  function addLink(value: string) {
    set((v) => ({
      ...v,
      referenceLinks: [...new Set([...(v.referenceLinks ?? []), value])],
    }));
    mark(true);
  }
  async function save() {
    try {
      if (url.trim())
        throw Error("Add or clear the pending URL before saving.");
      if (
        draft.status !== base.status &&
        draft.status !== "todo" &&
        !confirmPrerequisites(
          { taskId: item.id, projectId },
          projects,
          "Change status",
        )
      )
        return;
      setBusy(true);
      await navigator.locks.request("qah:task-details", () =>
        saveTaskDetails(base, draft, projectId),
      );
      refresh();
      window.dispatchEvent(new Event("qah:reminders-changed"));
      close();
    } catch (e) {
      message(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      aria-label="Task details"
      onCancel={(e) => {
        e.preventDefault();
        cancel();
      }}
      className="m-auto max-h-[90vh] w-[min(42rem,95vw)] overflow-auto bg-qah-surface p-4 text-qah-text"
    >
      <h2 className="text-xl">Task details · {source.name}</h2>
      <div className="grid gap-3">
        <label>
          Title{" "}
          <input
            className={field}
            value={draft.title}
            onChange={(e) => change({ title: e.target.value })}
          />
        </label>
        <label>
          Description{" "}
          <textarea
            className={field}
            value={draft.notes}
            onChange={(e) => change({ notes: e.target.value })}
          />
        </label>
        <label>
          Status{" "}
          <select
            className={field}
            value={draft.status}
            onChange={(e) =>
              change({ status: e.target.value as PlannerStatus })
            }
          >
            {["todo", "doing", "done"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Deadline date{" "}
          <input
            type="date"
            className={field}
            value={draft.dueDate?.slice(0, 10) ?? ""}
            onChange={(e) =>
              change({
                dueDate: e.target.value
                  ? e.target.value + (draft.dueDate?.slice(10) ?? "")
                  : undefined,
              })
            }
          />
        </label>
        <label>
          Deadline time{" "}
          <input
            type="time"
            className={field}
            disabled={!draft.dueDate}
            value={draft.dueDate?.slice(11) ?? ""}
            onChange={(e) =>
              change({
                dueDate:
                  draft.dueDate!.slice(0, 10) +
                  (e.target.value ? "T" + e.target.value : ""),
              })
            }
          />
        </label>
        <h3>Reminders</h3>
        {reminders.map((r) => {
          const edit = (p: Partial<typeof r>) =>
            change({
              reminders: reminders.map((v) =>
                v.id === r.id ? { ...v, ...p } : v,
              ),
            });
          return (
            <fieldset className="flex flex-wrap gap-2" key={r.id}>
              <label>
                <input
                  type="checkbox"
                  checked={r.enabled}
                  onChange={(e) => edit({ enabled: e.target.checked })}
                />{" "}
                Enabled
              </label>
              <label>
                Minutes before{" "}
                <input
                  type="number"
                  min="0"
                  className={field + " w-20"}
                  value={r.minutes}
                  onChange={(e) => edit({ minutes: Number(e.target.value) })}
                />
              </label>
              <select
                aria-label="Reminder anchor"
                className={field}
                value={r.sessionId ?? ""}
                onChange={(e) =>
                  edit({ sessionId: e.target.value || undefined })
                }
              >
                <option value="">Deadline</option>
                {sessions.map((v) => (
                  <option key={v.id} value={v.id}>
                    Session · {new Date(v.start).toLocaleString()}
                  </option>
                ))}
              </select>
              <label>
                <input
                  type="checkbox"
                  checked={r.desktop}
                  onChange={(e) => edit({ desktop: e.target.checked })}
                />{" "}
                Also notify on desktop
              </label>
              <button
                onClick={() =>
                  change({ reminders: reminders.filter((v) => v.id !== r.id) })
                }
              >
                Remove reminder
              </button>
            </fieldset>
          );
        })}
        <button
          onClick={() =>
            change({
              reminders: [
                ...reminders,
                {
                  id: crypto.randomUUID(),
                  enabled: true,
                  minutes: 15,
                  desktop: false,
                },
              ],
            })
          }
        >
          Add reminder
        </button>
        <p>
          In-app reminders appear while QAL’AT is open. Missed reminders appear
          on reopening. Desktop permission: {permission}.
        </p>
        {permission === "default" && (
          <button
            onClick={() => requestDesktop().then(setPermission).catch(message)}
          >
            Allow desktop notifications
          </button>
        )}
        <h3>References</h3>
        {links.map((link, i) => (
          <div key={i} className="break-words">
            {/^https?:\/\//i.test(link) ? (
              <a href={link} target="_blank" rel="noopener noreferrer">
                {link}
              </a>
            ) : (
              referenceName(link)
            )}
            {link.startsWith("workspace-copy:") && (
              <button
                onClick={() =>
                  readTaskCopy(projectId ?? "", link)
                    .then(download)
                    .catch(message)
                }
              >
                Download copy
              </button>
            )}
            {link.startsWith("local-file:") && (
              <label>
                Locate file{" "}
                <input
                  type="file"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      if (localRef(f) === link) download(f);
                      else
                        fail(
                          "Selected file does not match the saved metadata.",
                        );
                    }
                  }}
                />
              </label>
            )}
            <button
              onClick={() =>
                change({ referenceLinks: links.filter((_, n) => i !== n) })
              }
            >
              Remove reference
            </button>
          </div>
        ))}
        <label>
          Web URL{" "}
          <input
            className={field}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <button
          onClick={() => {
            try {
              const u = new URL(url);
              if (!["https:", "http:"].includes(u.protocol))
                throw Error("Use HTTP or HTTPS.");
              addLink(u.href);
              setUrl("");
              fail("");
            } catch (e) {
              message(e);
            }
          }}
        >
          Add URL
        </button>
        <label>
          Local file reference (metadata only){" "}
          <input
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) addLink(localRef(f));
            }}
          />
        </label>
        <label>
          Copy into project references (stored immediately){" "}
          <input
            type="file"
            disabled={busy || !projectId || !isWorkspaceConnected()}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f || !projectId) return;
              setBusy(true);
              try {
                addLink(await copyTaskFile(projectId, f));
              } catch (err) {
                message(err);
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <div>
          <button disabled={busy} onClick={save}>
            Save details
          </button>{" "}
          ·{" "}
          <button disabled={busy} onClick={cancel}>
            Close
          </button>
        </div>
        <p>
          Scheduling, subtasks, dependencies and recurrence save separately.
        </p>
        <fieldset disabled={guarded} className="grid gap-2">
          <button
            onClick={() =>
              select({
                target: { ...source, task: item },
                date: dayKey(new Date()),
              })
            }
          >
            Schedule task
          </button>
          {sessions.map((v) => (
            <button
              key={v.id}
              onClick={() =>
                select({
                  target: { ...source, task: item },
                  editing: v,
                  date: dayKey(new Date(v.start)),
                })
              }
            >
              Reschedule {new Date(v.start).toLocaleString()}
            </button>
          ))}
          <SubtaskEditor item={item} projectId={projectId} refresh={refresh} />
          <DependencyEditor
            item={item}
            projectId={projectId}
            projects={projects}
            refresh={refresh}
          />
          <RecurrenceEditor
            item={item}
            projectId={projectId}
            projects={projects}
            refresh={refresh}
          />
        </fieldset>
      </div>
      {selection && (
        <ScheduleDialog
          selection={selection}
          projects={projects}
          items={sources(projects).flatMap((s) => readItems(scope(s), s.name))}
          defaultTime={preferences().start}
          duration={preferences().duration}
          onClose={() => select(null)}
          onSave={() => {
            setRows(readItems(scope(source), source.name));
            select(null);
            refresh();
          }}
        />
      )}
    </dialog>
  );
}
