/**
 * QAL'AT AL-HAQQ v1.0 — useProject Hook
 *
 * Manages the currently active project state and preserves the last
 * validated active project across browser refreshes.
 */

import { useState, useCallback } from "react";
import {
  ProjectManifestSchema,
  type ProjectManifest,
} from "@/types/project";

const ACTIVE_PROJECT_KEY = "qah:activeProject";

function restoreActiveProject(): ProjectManifest | null {
  try {
    const raw = localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (!raw) return null;

    const parsed = ProjectManifestSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;

    localStorage.removeItem(ACTIVE_PROJECT_KEY);
    return null;
  } catch {
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
    return null;
  }
}

export function useProject() {
  const [activeProject, setActiveProject] = useState<ProjectManifest | null>(
    restoreActiveProject
  );

  const loadProject = useCallback((manifest: ProjectManifest) => {
    const validated = ProjectManifestSchema.parse(manifest);
    setActiveProject(validated);
    localStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify(validated));
  }, []);

  const clearProject = useCallback(() => {
    setActiveProject(null);
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
  }, []);

  return {
    activeProject,
    loadProject,
    clearProject,
    isProjectOpen: activeProject !== null,
  };
}
