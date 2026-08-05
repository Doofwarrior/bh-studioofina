import { ProjectDetailPage } from "@/features/projects/ProjectDetailPage";
import { useProjectContext } from "@/app/providers/ProjectProvider";

interface ProjectPageProps {
  onBack: () => void;
  onDelete: () => void;
}

export function ProjectPage({ onBack, onDelete }: ProjectPageProps) {
  const { activeProject } = useProjectContext();

  if (!activeProject) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--studio-text-muted)]">
        <p>No project selected.</p>
      </div>
    );
  }

  return (
    <ProjectDetailPage
      project={activeProject}
      onBack={onBack}
      onDelete={onDelete}
    />
  );
}
