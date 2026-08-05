/**
 * BH Studio v1.0 — Application Entry Point
 */

import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { WorkspaceProvider } from "@/app/providers/WorkspaceProvider";
import { ProjectProvider } from "@/app/providers/ProjectProvider";
import { createAppRouter } from "@/app/routes";
import { requestWorkspaceAccess } from "@/lib/storage";
import "@/styles/index.css";

// Router is created once at module level — never recreated on re-render
const router = createAppRouter();

function App() {
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const hasAccess = await requestWorkspaceAccess();
        setWorkspaceReady(hasAccess);
      } catch (err) {
        console.error("[App] Workspace init failed:", err);
        setWorkspaceReady(false);
      } finally {
        setIsChecking(false);
      }
    }
    init();
  }, []);

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--studio-bg)] text-[var(--studio-text)]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[var(--studio-accent)] border-t-transparent" />
          <p className="text-sm text-[var(--studio-text-muted)]">
            Loading BH Studio...
          </p>
        </div>
      </div>
    );
  }

  if (!workspaceReady) {
    return <WorkspaceSetup onReady={() => setWorkspaceReady(true)} />;
  }

  return (
    <StrictMode>
      <WorkspaceProvider>
        <ProjectProvider>
          <RouterProvider router={router} />
        </ProjectProvider>
      </WorkspaceProvider>
    </StrictMode>
  );
}

// ─── Workspace Setup Overlay ───

function WorkspaceSetup({ onReady }: { onReady: () => void }) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState("");

  const handleRequestAccess = async () => {
    setIsRequesting(true);
    setError("");
    try {
      const granted = await requestWorkspaceAccess();
      if (granted) {
        onReady();
      } else {
        setError("Folder access was denied or is not supported in this browser.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not access workspace. Try a different folder."
      );
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--studio-bg)] text-[var(--studio-text)]">
      <div className="w-full max-w-md rounded-lg border bg-[var(--studio-surface)] p-6 shadow-xl">
        <h2 className="mb-2 text-xl font-bold">Welcome to BH Studio</h2>
        <p className="mb-6 text-sm text-[var(--studio-text-muted)]">
          Choose a folder on your computer where BH Studio will store your
          projects. This folder will contain all your work.
        </p>

        <div className="space-y-4">
          <button
            onClick={handleRequestAccess}
            disabled={isRequesting}
            className="w-full rounded-md bg-[var(--studio-accent)] px-4 py-3 text-sm font-medium text-black transition-colors hover:bg-[var(--studio-accent-hover)] disabled:opacity-50"
          >
            {isRequesting ? "Requesting..." : "Select Workspace Folder"}
          </button>

          {error && (
            <p className="text-sm text-[var(--studio-danger)]">{error}</p>
          )}

          <p className="text-xs text-[var(--studio-text-subtle)]">
            You can change this later in Settings. If your browser doesn't
            support folder selection, projects will be stored in browser
            storage.
          </p>
        </div>
      </div>
    </div>
  );
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<App />);
}
