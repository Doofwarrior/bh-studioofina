/**
 * BH Studio v1.0 — useProject Hook
 *
 * Manages the currently active project state.
 */

import { useState, useCallback } from "react";
import type { ProjectManifest } from "@/types/project";

export function useProject() {
  const [activeProject, setActiveProject] = useState<ProjectManifest | null>(
    null
  );

  const loadProject = useCallback((manifest: ProjectManifest) => {
    setActiveProject(manifest);
  }, []);

  const clearProject = useCallback(() => {
    setActiveProject(null);
  }, []);

  return {
    activeProject,
    loadProject,
    clearProject,
    isProjectOpen: activeProject !== null,
  };
}
