import { Badge } from "@/components/ui/Badge";
import {TodaysWork} from "./TodaysWork";
import "./dashboard-frames.css";
import "./dashboard-graphics.css";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ProjectList } from "@/components/project/ProjectList";
import { CreateProjectModal } from "@/features/projects/CreateProjectModal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { backupWorkspace, createProject, listProjects } from "@/lib/storage";
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
  ListTodo,
  Zap,
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
    <article className="hud-frame hud-frame--compact flex min-h-[112px] flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-qah-text-subtle">
            <span className="data-channel">{index}</span> {label}
          </p>
          <p className="data-value mt-3 text-2xl font-semibold tracking-[-0.04em] text-qah-text">
            {value}
          </p>
        </div>
        <Icon size={16} className="text-qah-accent" aria-hidden="true" />
      </div>
      <p className="hud-metric-divider mt-auto break-words border-t border-transparent pt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-qah-text-subtle">
        <svg className="hud-metric-trace" width="84" height="8" viewBox="0 0 84 8" aria-hidden="true" focusable="false">
          <path className="hud-divider-track" d="M2 6H24L28 2H53L57 6H84" />
          <path className="hud-divider-ticks" d="M8 3H19M32 5H44M65 2V4M70 2V4M75 2V4" />
          <path className="hud-divider-signal" pathLength="100" d="M84 6H57L53 2H28L24 6H2" />
          <circle className="hud-divider-node hud-divider-node--end" cx="2" cy="6" r="1.25" />
        </svg>
        {detail}
      </p>
    </article>
  );
}

export function DashboardPage({ onOpenSettings }: DashboardPageProps) {
  const [projects, setProjects] = useState<ProjectManifest[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { workspacePath, isConfigured, accessIssue } = useWorkspace();
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

  const handle = isConfigured ? backupWorkspace() : null;
  const [permission, setPermission] = useState<PermissionState | null>(null);
  useEffect(() => {
    let revision = 0;
    async function check() {
      const current = ++revision;
      try {
        const state = await handle?.queryPermission({ mode: "readwrite" });
        if (current === revision) setPermission(state ?? null);
      } catch {
        if (current === revision) setPermission(null);
      }
    }
    void check();
    window.addEventListener("focus", check);
    return () => {
      revision++;
      window.removeEventListener("focus", check);
    };
  }, [handle]);

  const handleCreateProject = async (manifest: ProjectManifest) => {
    await createProject(manifest);
    setProjects(await listProjects());
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="w-full max-w-md border border-qah-border-strong bg-qah-surface p-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-qah-text-subtle">
            00 / workspace index
          </span>
          <p role="status" className="mt-3"><Badge variant="processing">Loading project records…</Badge></p>
        </div>
      </div>
    );
  }

  const workspaceState = isConfigured ? "ONLINE" : "REQUIRED";
  const isLocalMode = !isConfigured && workspacePath === "LOCAL BROWSER STORAGE";
  const linked = Boolean(handle && permission === "granted");
  const local = isLocalMode && !accessIssue;
  const pending = permission === "prompt" || accessIssue === "restoration-failed";
  const denied = permission === "denied" || accessIssue === "denied";
  const access = linked ? "AUTHORIZED" : denied ? "DENIED" : pending ? "PERMISSION REQUIRED"
    : local ? "BROWSER ONLY" : handle ? "UNCONFIRMED" : "UNAVAILABLE";
  const contextState = activeProject ? "SELECTED" : "NONE";
  const indexState = projects.length > 0 ? "READY" : "EMPTY";

  return (
    <div className="hud-dashboard relative mx-auto grid w-full max-w-[1480px] grid-cols-1 gap-2">
      <div aria-hidden="true" className="hud-frame hud-perimeter">
        <svg className="hud-trace hud-trace--top" width="78" height="10" viewBox="0 0 78 10">
          <path d="M3 3H69L75 8" /><circle cx="3" cy="3" r="2" /><circle cx="75" cy="8" r="1.5" />
        </svg>
        <svg className="hud-trace hud-trace--left" width="10" height="54" viewBox="0 0 10 54">
          <path d="M8 3L3 8V51" /><circle cx="8" cy="3" r="1.5" /><circle cx="3" cy="51" r="2" />
        </svg>
        <svg className="hud-trace hud-trace--bottom" width="96" height="10" viewBox="0 0 96 10">
          <path d="M3 2L8 7H93" /><circle cx="3" cy="2" r="1.5" /><circle cx="93" cy="7" r="2" />
        </svg>
      </div>
      <svg className="hud-margin-scale" width="8" height="42" viewBox="0 0 8 42" aria-hidden="true" focusable="false">
        <path d="M0.5 1V41M1 4H7M1 12H4M1 21H6M1 30H4M1 38H7" />
      </svg>

      <div className="hud-frame hud-command px-4 py-4 sm:px-5">
        <svg className="hud-header-detail" width="104" height="12" viewBox="0 0 104 12" aria-hidden="true" focusable="false">
          <path d="M3 9H34L41 2H79M84 2H90M94 2H102M56 3V6M63 3V6M70 3V6" />
          <path className="hud-divider-signal" pathLength="100" d="M3 9H34L41 2H79" />
          <circle cx="3" cy="9" r="1.5" />
          <circle className="hud-divider-node--end" cx="79" cy="2" r="1.5" />
        </svg>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="qah-terminal min-w-0 flex-1">
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-qah-text-subtle">
              01 / COMMAND CENTER
              <i aria-hidden="true" className="terminal-dot" data-linked={linked} />
            </p>
            <div className="terminal-heading">
              <h1 className="qah-dashboard-title" data-title="DASHBOARD">DASHBOARD</h1>
              <span className="font-arabic-kufic text-sm text-qah-accent" lang="ar" dir="rtl">لوحة القيادة</span>
              <i className="terminal-cursor" aria-hidden="true" />
            </div>
            <dl className="terminal-lines">
              <dt>WORKSPACE LINK</dt><dd>{linked ? "LINK ESTABLISHED" : local ? "LOCAL MODE" : "NOT LINKED"}</dd>
              <dt>ACCESS STATE</dt><dd>{access}</dd>
              <dt>QAL’AT AL-HAQQ — <span lang="ar" dir="rtl">قَلْعَةُ الْحَقّ</span></dt>
              <dd>{linked ? "READY" : local ? "LOCAL SESSION" : pending ? "AWAITING ACCESS" : "STANDBY"}</dd>
            </dl>
            <div className="terminal-sweep" aria-hidden="true" />
          </div>

          <div className="hud-frame hud-frame--compact hud-actions flex max-w-full flex-wrap items-center gap-2 p-2.5">
            <span className="hidden px-2 font-mono text-[9px] uppercase tracking-[0.16em] text-qah-text-subtle sm:inline">
              QUICK ACTIONS
            </span>
            <Button variant="secondary" onClick={() => navigate("/capture")}>
              <Zap size={15} className="mr-2" />
              Capture
            </Button>
            <Button variant="secondary" onClick={() => navigate("/planner")}>
              <ListTodo size={15} className="mr-2" />
              Planner
            </Button>
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

      <section aria-label="Workspace metrics" className="relative grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
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
          value={isLocalMode ? "LOCAL" : workspaceState}
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

      <TodaysWork projects={projects}/>
      <section className="hud-frame hud-projects p-4">
        <div className="hud-project-divider mb-3 flex items-end justify-between border-b border-transparent pb-3">
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
          <svg className="hud-divider-detail" width="146" height="10" viewBox="0 0 146 10" aria-hidden="true" focusable="false">
            <path className="hud-divider-track" d="M3 7.5H44L50 2.5H104L110 7.5H143" />
            <path className="hud-divider-ticks" d="M55 4V7M61 4V7M67 4V7M73 4V7M79 4V7M85 4V7M91 4V7M97 4V7" />
            <path className="hud-divider-signal" pathLength="100" d="M3 7.5H44L50 2.5H104L110 7.5H143" />
            <circle className="hud-divider-node" cx="3" cy="7.5" r="1.5" />
            <circle className="hud-divider-node hud-divider-node--end" cx="143" cy="7.5" r="1.5" />
          </svg>
        </div>

        {projects.length === 0 ? (
          <div className="grid min-h-[240px] place-items-center border border-dashed border-qah-border-strong bg-qah-surface/75 px-6 py-9 text-center">
            <div className="max-w-md">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-qah-text-subtle">
                INDEX / 00
              </span>
              <div className="mx-auto mt-4 grid h-11 w-11 place-items-center border border-qah-border-strong text-qah-accent">
                <FolderOpen size={20} />
              </div>
              <p className="mt-3 text-sm font-semibold uppercase tracking-[0.12em] text-qah-text">
                No project records
              </p>
              <p className="mt-2 text-sm leading-6 text-qah-text-muted">
                Initialize the workspace index by creating the first project record.
              </p>
              <Button className="mt-4" onClick={() => setIsCreateModalOpen(true)}>
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
