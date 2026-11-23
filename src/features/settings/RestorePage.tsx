import { Badge } from "@/components/ui/Badge";
import { useEffect, useState } from "react";
import {
  initialize,
  getWorkspaceName,
  selectWorkspaceDirectory,
} from "@/lib/storage";
import { parseArchive } from "@/lib/storage/restoreArchive";
import {
  archiveProjects,
  previewRestore,
  startRestore,
  finishRestore,
  pendingRestore,
  previousRestore,
  undoPreviousRestore,
  type Choice,
  type Plan,
} from "@/lib/storage/applicationRestore";
type Parsed = Awaited<ReturnType<typeof parseArchive>>;
export function RestorePage() {
  const [file, setFile] = useState<File>(),
    [archive, setArchive] = useState<Parsed>(),
    [projectList, setProjects] = useState<[string, string][]>([]),
    [choice, setChoice] = useState("full"),
    [plan, setPlan] = useState<Plan>(),
    [confirmed, confirm] = useState(false);
  const [busy, setBusy] = useState(true),
    [message, msg] = useState(""),
    [pending, setPending] = useState(false),
    [previous, setPrevious] = useState(false);
  const [tone, setTone] = useState<"default" | "success" | "danger">("default");
  function verified(message: string) {
    setTone("success");
    msg(message);
  }
  function reportError(error: unknown) {
    setTone("danger");
    msg(String(error));
  }
  async function refresh() {
    setPending(!!(await pendingRestore()));
    setPrevious(!!(await previousRestore()));
  }
  useEffect(() => {
    initialize()
      .then(refresh)
      .catch(reportError)
      .finally(() => setBusy(false));
  }, []);
  function clear() {
    setPlan(undefined);
    confirm(false);
  }
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setTone("default");
    msg("");
    try {
      await fn();
    } catch (e) {
      reportError(e);
    } finally {
      try {
        await refresh();
      } catch (e) {
        reportError(e);
      }
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6 text-qah-text">
      <h1 className="text-2xl">Application data recovery</h1>
      <fieldset
        disabled={busy}
        className="space-y-4 border border-qah-border p-4"
      >
        <p>Workspace · {getWorkspaceName() ?? "Disconnected"}</p>
        <button
          onClick={() =>
            run(async () => {
              clear();
              if (!(await selectWorkspaceDirectory()))
                throw Error("Workspace selection cancelled or denied.");
            })
          }
        >
          Connect workspace folder
        </button>
        {pending ? (
          <div>
            <p>
              Interrupted restore detected. Resume the recorded changes or
              recover the reviewed pre-restore values.
            </p>
            <button
              onClick={() =>
                run(async () => {
                  if (window.confirm("Resume the interrupted restore?")) {
                    await finishRestore(false);
                    clear();
                    verified("Restore verified.");
                  }
                })
              }
            >
              Resume restore
            </button>
            {" · "}
            <button
              onClick={() =>
                run(async () => {
                  if (window.confirm("Roll back this interrupted restore?")) {
                    await finishRestore(true);
                    clear();
                    verified("Rollback verified.");
                  }
                })
              }
            >
              Roll back restore
            </button>
          </div>
        ) : (
          <>
            <label className="block">
              Select backup{" "}
              <input
                type="file"
                accept=".qab"
                onChange={(e) => {
                  clear();
                  setFile(e.target.files?.[0]);
                  setArchive(undefined);
                  msg("");
                }}
              />
            </label>
            <button
              disabled={!file}
              onClick={() =>
                run(async () => {
                  clear();
                  setArchive(undefined);
                  const a = await parseArchive(file!);
                  setProjects(
                    [...(await archiveProjects(a))].map(([id, p]) => [
                      id,
                      p.name,
                    ]),
                  );
                  setArchive(a);
                  setChoice("full");
                  verified("Archive checksums and records validated.");
                })
              }
            >
              Validate backup
            </button>
            {archive && (
              <>
                <p>
                  Created {archive.created}. Included:{" "}
                  {archive.covered.join(", ")}. Excluded:{" "}
                  {archive.excluded.join(", ")}.
                </p>
                <label>
                  Restore scope{" "}
                  <select
                    value={choice}
                    className="bg-qah-bg"
                    onChange={(e) => {
                      clear();
                      setChoice(e.target.value);
                    }}
                  >
                    <option value="full">Full restore</option>
                    <option value="preferences">
                      Calendar preferences and saved views
                    </option>
                    {projectList.map(([id, name]) => (
                      <option key={id} value={id}>
                        {name} ({id})
                      </option>
                    ))}
                  </select>
                </label>{" "}
                <button
                  onClick={() =>
                    run(async () => {
                      clear();
                      const selection: Choice =
                        choice === "full" || choice === "preferences"
                          ? { kind: choice }
                          : { kind: "project", id: choice };
                      setPlan(await previewRestore(archive, selection));
                    })
                  }
                >
                  Preview restore
                </button>
              </>
            )}
            {plan && archive && (
              <div className="space-y-2">
                <h2>Restore preview</h2>
                <p>
                  {plan.projects.join(", ") || "Workspace preferences"} ·{" "}
                  {plan.recordCount} browser storage keys · {plan.fileCount}{" "}
                  files in scope. {plan.taskCount} tasks and occurrences,{" "}
                  {plan.calendarCount} Calendar entries, {plan.historyCount}{" "}
                  history entries.
                </p>
                <p>
                  Matching keys and files take their archived values. Other file
                  paths and browser keys are retained. Arrays within a replaced
                  key take the archived contents.
                </p>
                <details>
                  <summary>
                    {plan.rows.length} browser changes and {plan.files.length}{" "}
                    file changes
                  </summary>
                  <ul>
                    {[
                      ...plan.rows.map(
                        (r) =>
                          (r.before === null ? "Add " : "Replace ") + r.key,
                      ),
                      ...plan.files.map(
                        (f) =>
                          (f.before === null ? "Add " : "Replace ") + f.path,
                      ),
                    ].map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </details>
                <label>
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => confirm(e.target.checked)}
                  />{" "}
                  I confirm these changes to this workspace.
                </label>{" "}
                <button
                  disabled={!confirmed}
                  onClick={() =>
                    run(async () => {
                      await startRestore(archive, plan, confirmed);
                      clear();
                      verified(
                        "Restore verified. Reopen QAL’AT to use the recovered data.",
                      );
                    })
                  }
                >
                  Apply restore
                </button>{" "}
                <button
                  onClick={() => {
                    clear();
                    setTone("default");
                    msg("Preview cancelled.");
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
            {previous && (
              <button
                onClick={() =>
                  run(async () => {
                    if (
                      window.confirm(
                        "Recover the values saved before your last restore?",
                      )
                    ) {
                      await undoPreviousRestore();
                      clear();
                      verified("Rollback verified.");
                    }
                  })
                }
              >
                Undo last restore
              </button>
            )}
          </>
        )}
      </fieldset>
      <p role="status">{busy ? <Badge variant="processing">Working…</Badge> : message && <Badge variant={tone}>{message}</Badge>}</p>
      {!busy && !pending && <a href="/settings">Return to Settings</a>}
    </main>
  );
}
