import { useEffect, useState } from "react";
import { historyWarning, listHistory } from "../../lib/workHistory";
import { analytics, filteredHistory, initial } from "./workInsights";
import { Button } from "@/components/ui/Button";
import { WorkFilters, SavedView } from "./WorkFilters";
import { duration } from "../timer/display";
import type { Project } from "./scheduling";

export function WorkReport({
  projects,
  historyId,
}: {
  projects: Project[];
  historyId: string | null;
}) {
  const [mode, tab] = useState(historyId ? "Activity history" : ""),
    [f, set] = useState(initial),
    [limit, more] = useState(40),
    [, refresh] = useState(0);
  useEffect(() => {
    const update = () => refresh((n) => n + 1);
    window.addEventListener("storage", update);
    window.addEventListener("qah:history", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("qah:history", update);
    };
  }, []);
  const history = mode === "Activity history" ? listHistory() : [];
  const events =
    mode === "Activity history" ? filteredHistory(projects, f) : [];
  const selected = events.find((h) => h.id === historyId);
  const metrics =
    mode === "Analytics"
      ? analytics(projects, f).filter((r) => r.count || r.planned || r.actual)
      : [];
  const show = (h: (typeof history)[number]) => (
    <details
      key={h.id}
      open={h.id === historyId || undefined}
      className="border-t border-qah-border py-1"
    >
      <summary className="data-history">
        <time className="data-meta">{new Date(h.at).toLocaleString()}</time> ·{" "}
        {projects.find((p) => p.id === h.projectId)?.name ??
          h.projectId ??
          "Workspace"}{" "}
        · <span className="data-action">{h.action}</span> · <strong>{h.title}</strong>
      </summary>
      <p className="data-meta">{h.slot}</p>
      <pre className="whitespace-pre-wrap break-all">{h.detail}</pre>
    </details>
  );
  return (
    <section className="my-2 border border-qah-border p-2">
      <div className="qah-view-switch">
        {["Analytics", "Activity history"].map((m) => (
          <Button
            size="sm"
            variant="secondary"
            key={m}
            aria-expanded={mode === m}
            onClick={() => tab(mode === m ? "" : m)}
          >
            {m}
          </Button>
        ))}
      </div>
      {historyWarning && <p role="alert">{historyWarning}</p>}
      {mode && (
        <>
          <WorkFilters projects={projects} f={f} set={set}>
            {mode === "Activity history" && (
              <label>
                Action{" "}
                <select
                  aria-label="Action"
                  className="bg-qah-bg"
                  value={f.action}
                  onChange={(e) => set({ ...f, action: e.target.value })}
                >
                  <option value="">All actions</option>
                  {[...new Set(history.map((h) => h.action))]
                    .sort()
                    .map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                </select>
              </label>
            )}
          </WorkFilters>
          <SavedView section={mode} value={f} apply={set} />
          {mode === "Analytics" ? (
            <>
              <p className="text-xs">
                Dates include both local days. Tasks use their deadline, or
                creation day when undated. Completion is currently done / all
                matching stored tasks and occurrences. Overdue means unfinished
                past the deadline (after the day for all-day tasks). Time is
                clipped to the range; actual is recorded work classified by
                current task status.
              </p>
              {!metrics.length ? (
                <p className="data-empty">No matching work.</p>
              ) : (
                metrics.map((r) => (
                  <div
                    key={r.projectId ?? "workspace"}
                    className="data-report my-2"
                  >
                    <strong className="block break-words">{r.project}</strong>
                    <div className="data-summary">
                      <span><b>{r.done}/{r.count}</b> complete ({r.count ? Math.round((100 * r.done) / r.count) + "%" : "—"})</span>
                      <span><b>{r.overdue}</b> overdue</span>
                    </div>
                    <dl className="data-durations">
                      {([
                        ["Planned", r.planned],
                        ["Actual", r.actual],
                        ["Completed", r.completedTime],
                        ["Active", r.activeTime],
                        ["Unavailable task", r.unavailableTime],
                      ] as const).map(([label, value]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{duration(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))
              )}
            </>
          ) : (
            <>
              <p className="text-xs">
                Recording begins with Slice 08.{" "}
                {history.length
                  ? "First recorded action: " +
                    new Date(history.at(-1)!.at).toLocaleString()
                  : "No actions recorded yet."}{" "}
                History stays in this browser until site data is cleared or
                storage fills.
              </p>
              {selected && show(selected)}
              {events
                .filter((h) => h.id !== historyId)
                .slice(0, limit)
                .map(show)}
              {!events.length && <p className="data-empty">No matching activity.</p>}
              {events.length > limit && (
                <button onClick={() => more((n) => n + 40)}>
                  Show more activity
                </button>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
