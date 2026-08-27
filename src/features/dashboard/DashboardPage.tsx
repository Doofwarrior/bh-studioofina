import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ProjectList } from "@/components/project/ProjectList";
import { CreateProjectModal } from "@/features/projects/CreateProjectModal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { createProject, listProjects } from "@/lib/storage";
import type { ProjectManifest } from "@/types/project";
import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/app/providers/ProjectProvider";
import {
  Plus,
  Settings,
  FolderOpen,
  Database,
  FolderKanban,
  Target,
  ArrowUpRight,
  Activity,
} from "lucide-react";

interface DashboardPageProps {
  onOpenSettings: () => void;
}

function MetricModule({
  index,
  label,
  detail,
  value,
  icon: Icon,
}: {
  index: string;
  label: string;
  detail: string;
  value: string;
  icon: typeof FolderKanban;
}) {
  return (
    <article className="relative min-h-[112px] border border-qah-border-strong bg-[rgba(7,10,7,0.94)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-qah-text-subtle">
            {index} / {label}
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-qah-text">
            {value}
          </p>
        </div>
        <Icon size={16} className="text-qah-accent" aria-hidden="true" />
      </div>
      <p className="absolute bottom-3 left-4 right-4 border-t border-qah-border pt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-qah-text-subtle">
        {detail}
      </p>
    </article>
  );
}

export function DashboardPage({ onOpenSettings }: DashboardPageProps) {
  const [projects, setProjects] = useState<ProjectManifest[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { workspacePath, isConfigured } = useWorkspace();
  const { activeProject, loadProject } = useProjectContext();
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const loaded = await listProjects();
        setProjects(loaded);
      } catch (err) {
        console.error("[Dashboard] Failed to load projects:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [isConfigured, workspacePath]);

  const handleCreateProject = async (manifest: ProjectManifest) => {
    try {
      await createProject(manifest);
      const updated = await listProjects();
      setProjects(updated);
    } catch (err) {
      console.error("[Dashboard] Failed to create project:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="w-full max-w-md border border-qah-border-strong bg-qah-surface p-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-qah-text-subtle">
            00 / workspace index
          </span>
          <p className="mt-3 text-sm text-qah-text-muted">Loading project records...</p>
        </div>
      </div>
    );
  }

  const workspaceState = isConfigured ? "ONLINE" : "REQUIRED";
  const contextState = activeProject ? "SELECTED" : "NONE";
  const indexState = projects.length > 0 ? "READY" : "EMPTY";

  return (
    <div className="relative mx-auto w-full max-w-[1480px] overflow-hidden border border-qah-border-strong bg-[#060806]">
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(180,201,107,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(180,201,107,0.035)_1px,transparent_1px)] [background-size:56px_56px]" />

      <div className="relative z-10 border-b border-qah-border-strong px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-qah-text-subtle">
              01 / DASHBOARD
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-[clamp(1.8rem,4vw,3.2rem)] font-semibold leading-none tracking-[-0.055em] text-qah-text">
                Workspace Overview
              </h1>
              <span className="font-arabic-kufic text-sm text-qah-accent" lang="ar" dir="rtl">
                لوحة القيادة
              </span>
            </div>
            <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.12em] text-qah-text-subtle">
              <span className="flex items-center gap-2">
                <i className={`h-1.5 w-1.5 ${isConfigured ? "bg-qah-accent" : "bg-qah-warning"}`} aria-hidden="true" />
                {isConfigured ? "WORKSPACE LINKED" : "WORKSPACE REQUIRED"}
              </span>
              <span className="max-w-[38rem] truncate text-qah-text-muted">
                {isConfigured ? workspacePath : "NO LOCAL WORKSPACE SELECTED"}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 border border-qah-border bg-[rgba(3,5,3,0.72)] p-1.5">
            <span className="hidden px-2 font-mono text-[9px] uppercase tracking-[0.16em] text-qah-text-subtle sm:inline">
              QUICK ACTIONS
            </span>
            <Button variant="secondary" onClick={onOpenSettings}>
              <Settings size={15} className="mr-2" />
              Settings
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus size={15} className="mr-2" />
              New Project
            </Button>
          </div>
        </div>
      </div>

      <section aria-label="Workspace metrics" className="relative z-10 grid grid-cols-1 gap-px border-b border-qah-border-strong bg-qah-border sm:grid-cols-2 xl:grid-cols-4">
        <MetricModule
          index="M01"
          label="Project Index"
          detail="Records available in workspace"
          value={projects.length.toString().padStart(2, "0")}
          icon={FolderKanban}
        />
        <MetricModule
          index="M02"
          label="Workspace"
          detail="Current storage connection"
          value={workspaceState}
          icon={Database}
        />
        <MetricModule
          index="M03"
          label="Active Context"
          detail={activeProject ? activeProject.name : "No project currently selected"}
          value={contextState}
          icon={Target}
        />
        <MetricModule
          index="M04"
          label="Index State"
          detail="Project discovery status"
          value={indexState}
          icon={Activity}
        />
      </section>

      <section className="relative z-10 p-3 sm:p-4">
        <div className="mb-3 flex items-end justify-between border-b border-qah-border pb-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-qah-text-subtle">
              02 / PROJECT INDEX
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-qah-text">
              Recent Projects
            </h2>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-qah-text-subtle">
            {projects.length.toString().padStart(2, "0")} records
          </span>
        </div>

        {projects.length === 0 ? (
          <div className="grid min-h-[300px] place-items-center border border-dashed border-qah-border-strong bg-[rgba(7,10,7,0.72)] px-6 py-12 text-center">
            <div className="max-w-md">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-qah-text-subtle">
                INDEX / 00
              </span>
              <div className="mx-auto mt-5 grid h-12 w-12 place-items-center border border-qah-border-strong text-qah-accent">
                <FolderOpen size={20} />
              </div>
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.12em] text-qah-text">
                No project records
              </p>
              <p className="mt-2 text-sm leading-6 text-qah-text-muted">
                Initialize the workspace index by creating the first project record.
              </p>
              <Button className="mt-5" onClick={() => setIsCreateModalOpen(true)}>
                <Plus size={15} className="mr-2" />
                Create Project
                <ArrowUpRight size={13} className="ml-2" />
              </Button>
            </div>
          </div>
        ) : (
          <ProjectList
            projects={projects}
            onSelectProject={(project) => {
              loadProject(project);
              navigate("/project");
            }}
          />
        )}
      </section>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateProject}
      />
    </div>
  );
}
