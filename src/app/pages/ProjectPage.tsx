import { ProjectDetailPage } from "@/features/projects/ProjectDetailPage";
import { Navigate, useNavigate } from "react-router-dom";
import { useProjectContext } from "@/app/providers/ProjectProvider";
import { deleteProject } from "@/lib/storage";

export function ProjectPage() {
  const { activeProject, clearProject } = useProjectContext();
  const navigate = useNavigate();

  if (!activeProject) {
    return <Navigate to="/" replace />;
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
