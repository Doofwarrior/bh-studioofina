/**
 * BH Studio v1.0 — Project Provider
 *
 * Provides the currently active project to the entire app.
 */

import { createContext, useContext, type ReactNode } from "react";
import { useProject } from "@/hooks/useProject";
import type { ProjectManifest } from "@/types/project";

interface ProjectContextValue {
  activeProject: ProjectManifest | null;
  loadProject: (manifest: ProjectManifest) => void;
  clearProject: () => void;
  isProjectOpen: boolean;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const project = useProject();

  return (
    <ProjectContext.Provider value={project}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjectContext must be used within ProjectProvider");
  }
  return context;
}
