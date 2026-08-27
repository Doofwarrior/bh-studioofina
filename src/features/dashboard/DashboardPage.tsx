import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProjectList } from "@/components/project/ProjectList";
import { CreateProjectModal } from "@/features/projects/CreateProjectModal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { createProject, listProjects } from "@/lib/storage";
import { listSkills } from "@/ai/skills";
import type { ProjectManifest } from "@/types/project";
import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/app/providers/ProjectProvider";
import { Plus, Settings, FolderOpen, Boxes, Database, FolderKanban, Target, ArrowUpRight } from "lucide-react";

interface DashboardPageProps {
  onOpenSettings: () => void;
}

export function DashboardPage({ onOpenSettings }: DashboardPageProps) {
  const [projects, setProjects] = useState<ProjectManifest[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { workspacePath, isConfigured } = useWorkspace();
  const { activeProject, loadProject } = useProjectContext();
  const navigate = useNavigate();
  const registeredSkillCount = listSkills().length;

  // Load projects. Re-run discovery whenever the workspace connection state
  // changes so filesystem reconciliation runs against a usable handle.
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
      <div className="dashboard-loading flex h-full items-center justify-center">
        <div className="dashboard-loading__frame qah-frame">
          <span className="dashboard-eyebrow">00 / workspace index</span>
          <p className="text-sm text-[var(--studio-text-muted)]">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-command-center">
      <header className="dashboard-command-header">
        <div className="dashboard-command-header__identity">
          <p className="dashboard-eyebrow">01 / COMMAND CENTER</p>
          <div className="dashboard-command-header__title-row">
            <h1 className="dashboard-command-header__title">DASHBOARD</h1>
            <span className="dashboard-command-header__arabic font-arabic-kufic" lang="ar" dir="rtl">لوحة القيادة</span>
          </div>
          <p className="dashboard-command-header__description">
            Workspace Overview
          </p>
          <div className="dashboard-command-header__trace">
            <span><i aria-hidden="true" />{isConfigured ? "LOCAL STORAGE LINKED" : "LOCAL STORAGE REQUIRED"}</span>
            <span>{isConfigured ? workspacePath : "NO WORKSPACE SELECTED"}</span>
          </div>
        </div>
        <div className="dashboard-command-header__actions">
          <div className="dashboard-action-frame" aria-label="Quick actions">
            <span className="dashboard-action-frame__label">QUICK ACTIONS</span>
            <Button variant="secondary" onClick={onOpenSettings}>
              <Settings size={16} className="mr-2" />
              Settings
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus size={16} className="mr-2" />
              New Project
            </Button>
          </div>
        </div>
      </header>

      <section aria-label="Workspace status" className="dashboard-metrics">
        <Card className="dashboard-metric-card" title="Project index" subtitle="Workspace records">
          <FolderKanban size={16} className="dashboard-metric-card__icon" aria-hidden="true" />
          <p className="dashboard-metric-card__value">{projects.length}</p>
        </Card>
        <Card className="dashboard-metric-card" title="Workspace link" subtitle="Storage connection">
          <Database size={16} className="dashboard-metric-card__icon" aria-hidden="true" />
          <p className="dashboard-metric-card__state">{isConfigured ? "Connected" : "Unconfigured"}</p>
        </Card>
        <Card className="dashboard-metric-card" title="Skill registry" subtitle="Available capabilities">
          <Boxes size={16} className="dashboard-metric-card__icon" aria-hidden="true" />
          <p className="dashboard-metric-card__value">{registeredSkillCount}</p>
        </Card>
        <Card className="dashboard-metric-card" title="Active context" subtitle="Project selection state">
          <Target size={16} className="dashboard-metric-card__icon" aria-hidden="true" />
          <p className="dashboard-metric-card__state">{activeProject ? "Selected" : "None"}</p>
        </Card>
      </section>

      <section className="dashboard-projects-section">
        <div className="dashboard-projects-section__header">
          <div>
            <p className="dashboard-eyebrow">02 / PROJECT INDEX</p>
            <h2 className="dashboard-projects-section__title">YOUR PROJECTS</h2>
          </div>
          <span className="dashboard-projects-section__count">{projects.length.toString().padStart(2, "0")} records</span>
        </div>
        {projects.length === 0 ? (
          <div className="dashboard-empty-state">
            <span className="dashboard-empty-state__serial">INDEX / 00</span>
            <div className="dashboard-empty-state__glyph" aria-hidden="true"><FolderOpen size={22} /></div>
            <p className="dashboard-empty-state__title">NO PROJECT RECORDS</p>
            <p className="dashboard-empty-state__description">No local project records exist in this workspace. Create the first record to initialize the index.</p>
            <Button
              className="mt-5"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus size={16} className="mr-2" />
              Create Project
              <ArrowUpRight size={14} className="ml-2" />
            </Button>
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
