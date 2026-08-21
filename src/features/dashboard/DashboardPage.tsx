import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProjectList } from "@/components/project/ProjectList";
import { CreateProjectModal } from "@/features/projects/CreateProjectModal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { createProject, listProjects } from "@/lib/storage";
import type { ProjectManifest } from "@/types/project";
import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/app/providers/ProjectProvider";
import { Plus, Settings, FolderOpen } from "lucide-react";

interface DashboardPageProps {
  onOpenSettings: () => void;
}

export function DashboardPage({ onOpenSettings }: DashboardPageProps) {
  const [projects, setProjects] = useState<ProjectManifest[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { workspacePath, isConfigured } = useWorkspace();
  const { loadProject } = useProjectContext();
  const navigate = useNavigate();

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
      <div className="flex h-full items-center justify-center text-[var(--studio-text-muted)]">
        <p>Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--studio-text)]">
            QAL&apos;AT AL-HAQQ
          </h1>
          <p className="text-xs font-arabic text-[var(--studio-text-muted)]" dir="rtl" lang="ar">
            قَلْعَةُ الْحَقّ — Dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Workspace Status */}
      <div className="rounded-md border border-[var(--studio-border)] bg-[var(--studio-surface-elevated)] px-4 py-2">
        <p className="text-xs text-[var(--studio-text-muted)]">
          {isConfigured ? (
            <>
              <span className="font-mono">{workspacePath}</span>
            </>
          ) : (
            "Workspace not configured"
          )}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card title="Projects" subtitle="Active workspaces">
          <p className="text-3xl font-bold text-[var(--studio-accent)]">
            {projects.length}
          </p>
        </Card>
        <Card title="Recent Activity" subtitle="Last 7 days">
          <p className="text-3xl font-bold text-[var(--studio-text)]">—</p>
        </Card>
        <Card title="AI Skills Used" subtitle="This month">
          <p className="text-3xl font-bold text-[var(--studio-text)]">—</p>
        </Card>
      </div>

      {/* Projects */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--studio-text)]">
            Your Projects
          </h2>
        </div>
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-[var(--studio-text-muted)]">
            <FolderOpen size={32} className="mb-3 opacity-50" />
            <p className="text-sm">No projects yet.</p>
            <p className="text-xs">Create your first project to get started.</p>
            <Button
              className="mt-4"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus size={16} className="mr-2" />
              Create Project
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
      </div>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateProject}
      />
    </div>
  );
}
