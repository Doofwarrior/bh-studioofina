import { ProjectDetailPage } from "@/features/projects/ProjectDetailPage";
import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/app/providers/ProjectProvider";
import { deleteProject } from "@/lib/storage";

export function ProjectPage() {
  const { activeProject, clearProject } = useProjectContext();
  const navigate = useNavigate();

  if (!activeProject) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--studio-text-muted)]">
        <p>No project selected.</p>
      </div>
    );
  }

  const handleBack = () => {
    navigate("/");
  };

  const handleDelete = async () => {
    try {
      await deleteProject(activeProject.slug);
      clearProject();
      navigate("/");
    } catch (err) {
      console.error("[Project] Failed to delete project:", err);
    }
  };

  return (
    <ProjectDetailPage
      project={activeProject}
      onBack={handleBack}
      onDelete={handleDelete}
    />
  );
}
