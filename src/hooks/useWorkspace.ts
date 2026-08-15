/**
 * BH Studio v1.0 — useWorkspace Hook
 *
 * Reactive authority over the storage-layer workspace connection.
 * The actual filesystem access is established by `requestWorkspaceAccess()`
 * (File System Access API, handle persisted in IndexedDB). This hook only
 * reflects/triggers that mechanism; it does not invent a competing workspace.
 */

import { useState, useEffect, useCallback } from "react";
import {
  requestWorkspaceAccess,
  isWorkspaceConnected,
  getWorkspaceName,
} from "@/lib/storage";
import { DEFAULT_WORKSPACE_PATH } from "@/lib/constants";

export function useWorkspace() {
  const [workspacePath, setWorkspacePath] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);

  // Reflect the real storage-layer connection without a user gesture.
  useEffect(() => {
    const connected = isWorkspaceConnected();
    setIsConfigured(connected);
    setWorkspacePath(
      getWorkspaceName() ?? (connected ? DEFAULT_WORKSPACE_PATH : "")
    );
  }, []);

  const connectWorkspace = useCallback(async (): Promise<boolean> => {
    const ok = await requestWorkspaceAccess();
    setIsConfigured(ok);
    setWorkspacePath(getWorkspaceName() ?? (ok ? DEFAULT_WORKSPACE_PATH : ""));
    return ok;
  }, []);

  return {
    workspacePath,
    isConfigured,
    connectWorkspace,
  };
}
