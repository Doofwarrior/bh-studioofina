import { ProjectCard } from "./ProjectCard";
import type { ProjectManifest } from "@/types/project";

interface ProjectListProps {
  projects: ProjectManifest[];
  onSelectProject: (project: ProjectManifest) => void;
}

export function ProjectList({ projects, onSelectProject }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="border border-dashed border-qah-border-strong py-12 text-center text-qah-text-muted">
        <p className="text-sm">No projects yet.</p>
        <p className="mt-1 text-xs text-qah-text-subtle">Create the first project record to initialize the index.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
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
