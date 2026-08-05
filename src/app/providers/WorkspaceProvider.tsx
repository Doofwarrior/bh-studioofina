/**
 * BH Studio v1.0 — Workspace Provider
 *
 * Provides workspace configuration to the entire app.
 */

import { createContext, useContext, type ReactNode } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";

interface WorkspaceContextValue {
  workspacePath: string;
  isConfigured: boolean;
  configureWorkspace: (path: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const workspace = useWorkspace();

  return (
    <WorkspaceContext.Provider value={workspace}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error(
      "useWorkspaceContext must be used within WorkspaceProvider"
    );
  }
  return context;
}
