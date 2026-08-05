import { ProjectCard } from "./ProjectCard";
import type { ProjectManifest } from "@/types/project";

interface ProjectListProps {
  projects: ProjectManifest[];
  onSelectProject: (project: ProjectManifest) => void;
}

export function ProjectList({ projects, onSelectProject }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[var(--studio-text-muted)]">
        <p className="text-sm">No projects yet.</p>
        <p className="text-xs">Create your first project to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onClick={() => onSelectProject(project)}
        />
      ))}
    </div>
  );
}
