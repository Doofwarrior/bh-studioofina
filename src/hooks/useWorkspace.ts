/**
 * BH Studio v1.0 — useWorkspace Hook
 *
 * Manages workspace path and configuration.
 */

import { useState, useEffect, useCallback } from "react";
import { DEFAULT_WORKSPACE_PATH } from "@/lib/constants";

export function useWorkspace() {
  const [workspacePath, setWorkspacePath] = useState<string>(
    DEFAULT_WORKSPACE_PATH
  );
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("bh-studio:workspace-path");
    if (saved) {
      setWorkspacePath(saved);
      setIsConfigured(true);
    }
  }, []);

  const configureWorkspace = useCallback((path: string) => {
    localStorage.setItem("bh-studio:workspace-path", path);
    setWorkspacePath(path);
    setIsConfigured(true);
  }, []);

  return {
    workspacePath,
    isConfigured,
    configureWorkspace,
  };
}
