import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProjectList } from "@/components/project/ProjectList";
import { CreateProjectModal } from "@/features/projects/CreateProjectModal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { createProject, listProjects } from "@/lib/storage";
import type { ProjectManifest } from "@/types/project";
import { Plus, Settings, FolderOpen } from "lucide-react";

interface DashboardPageProps {
  onOpenSettings: () => void;
}

export function DashboardPage({ onOpenSettings }: DashboardPageProps) {
  const [projects, setProjects] = useState<ProjectManifest[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { workspacePath, isConfigured } = useWorkspace();

  // Load projects
  useEffect(() => {
    async function load() {
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
  }, []);

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
            Dashboard
          </h1>
          <p className="text-sm text-[var(--studio-text-muted)]">
            {isConfigured
              ? `Workspace: ${workspacePath}`
              : "Workspace not configured"}
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
            onSelectProject={() => {}}
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
