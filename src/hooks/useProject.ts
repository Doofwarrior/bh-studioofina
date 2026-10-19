/**
 * QAL'AT AL-HAQQ v1.0 — useProject Hook
 *
 * Manages the currently active project state and preserves the last
 * validated active project across browser refreshes.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import {
  ProjectManifestSchema,
  type ProjectManifest,
} from "@/types/project";
import { listProjects } from "@/lib/storage";

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
  const [activeProject, setActiveProject] = useState<ProjectManifest | null>(null);
  const [isProjectReady, setIsProjectReady] = useState(false);
  const hasUserSelectedProject = useRef(false);

  useEffect(() => {
    let isCurrent = true;

    async function validateRestoredProject() {
      try {
        const projects = await listProjects();
        const restored = restoreActiveProject();
        if (!restored || hasUserSelectedProject.current) return;

        const current = projects.find((project) => project.id === restored.id);

        if (!isCurrent) return;

        if (current) {
          setActiveProject(current);
        } else {
          localStorage.removeItem(ACTIVE_PROJECT_KEY);
        }
      } catch {
        // Do not fabricate project context when the authoritative index cannot be read.
        // Preserve the persisted reference so a transient storage failure does not
        // become a destructive selection change.
      } finally {
        if (isCurrent) setIsProjectReady(true);
      }
    }

    void validateRestoredProject();

    return () => {
      isCurrent = false;
    };
  }, []);

  const loadProject = useCallback((manifest: ProjectManifest) => {
    const validated = ProjectManifestSchema.parse(manifest);
    hasUserSelectedProject.current = true;
    setActiveProject(validated);
    localStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify(validated));
  }, []);

  const clearProject = useCallback(() => {
    setActiveProject(null);
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
  }, []);

  return {
    activeProject,
    isProjectReady,
    loadProject,
    clearProject,
    isProjectOpen: activeProject !== null,
  };
}
