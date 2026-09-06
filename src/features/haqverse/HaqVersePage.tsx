import { Navigate } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useProjectContext } from "@/app/providers/ProjectProvider";
import { VisualAssetRegistry } from "./registry/VisualAssetRegistry";
import { RuleRegistry } from "./rules/RuleRegistry";

const plannedModules = [
  "Visual Continuity",
  "Motion",
  "Shot Builder",
  "References",
  "Production",
  "Validation",
];

export function HaqVersePage() {
  const { activeProject, isProjectReady } = useProjectContext();

  if (!isProjectReady) {
    return null;
  }

  if (!activeProject) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="border border-qah-border-strong bg-qah-surface p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-qah-text-subtle">
          PROJECT MODULE / HAQVERSE
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-qah-text">
          THE HAQVERSE
        </h1>
        <p className="mt-2 text-sm text-qah-text-muted">
          Production workspace for {activeProject.name}.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-qah-text-subtle">
            Project
          </span>
          <Badge>{activeProject.name}</Badge>
        </div>
      </div>

      <Card title="Production Workspace" subtitle="Project-scoped HaqVerse boundary">
        <p className="text-sm leading-6 text-qah-text-muted">
          HaqVerse will organize future production systems inside the active
          QAL&apos;AT project. No production records or assets are connected yet.
        </p>
      </Card>

      <VisualAssetRegistry projectId={activeProject.id} />

      <RuleRegistry projectId={activeProject.id} />

      <section aria-labelledby="haqverse-planned-modules">
        <div className="mb-3 flex items-center justify-between border-b border-qah-border pb-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-qah-text-subtle">
              MODULE MAP / 00
            </p>
            <h2 id="haqverse-planned-modules" className="mt-1 text-lg font-semibold text-qah-text">
              Planned Production Modules
            </h2>
          </div>
          <Badge variant="warning">PLANNED</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plannedModules.map((module) => (
            <Card key={module} className="opacity-70">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-qah-text-muted">{module}</span>
                <Badge>LOCKED</Badge>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
