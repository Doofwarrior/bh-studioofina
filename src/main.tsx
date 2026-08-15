/**
 * QAL'AT AL-HAQQ v1.0 - Application Entry Point
 *
 * Slice 1: Global Visual Foundation + Boot Sequence
 * State machine preserved from BH Studio v1.0 baseline.
 */

import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { WorkspaceProvider } from "@/app/providers/WorkspaceProvider";
import { ProjectProvider } from "@/app/providers/ProjectProvider";
import { createAppRouter } from "@/app/routes";
import { requestWorkspaceAccess } from "@/lib/storage";
import "@/styles/index.css";

// Router is created once at module level - never recreated on re-render
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
    return <BootSequence />;
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

// ------------------------------------------------------------
// Boot Sequence
// ------------------------------------------------------------

function BootSequence() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 300);
    return () => clearTimeout(t1);
  }, []);

  const steps = [
    { id: 0, label: "SYSTEM BOOT", detail: "Core modules loaded" },
    { id: 1, label: "WORKSPACE CHECK", detail: "Verifying storage connection" },
  ];

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-qah-bg font-mono-technical">
      <div className="w-full max-w-lg px-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-2xl font-bold tracking-[0.25em] text-qah-text">
            QAL&apos;AT AL-HAQQ
          </h1>
          <p
            className="font-arabic text-sm text-qah-text-muted"
            dir="rtl"
            lang="ar"
          >
            بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.3em] text-qah-text-subtle">
            System Initialization
          </p>
        </div>

        {/* Progress steps */}
        <div className="space-y-2">
          {steps.map((s) => {
            const isActive = step >= s.id;
            const isCurrent = step === s.id;
            return (
              <div
                key={s.id}
                className={`flex items-center gap-3 border px-3 py-2.5 transition-colors ${
                  isActive
                    ? "border-qah-border-strong bg-qah-surface"
                    : "border-qah-border bg-transparent opacity-40"
                }`}
              >
                <div
                  className={`flex h-5 w-5 items-center justify-center border text-[10px] font-bold ${
                    isActive
                      ? "border-qah-accent text-qah-accent"
                      : "border-qah-text-subtle text-qah-text-subtle"
                  }`}
                >
                  {s.id + 1}
                </div>
                <div className="flex-1">
                  <div
                    className={`text-xs uppercase tracking-wider ${
                      isActive ? "text-qah-text" : "text-qah-text-subtle"
                    }`}
                  >
                    {s.label}
                  </div>
                  {isCurrent && (
                    <div className="mt-0.5 text-[10px] text-qah-text-muted">
                      {s.detail}
                    </div>
                  )}
                </div>
                {isCurrent && (
                  <div className="h-1.5 w-1.5 animate-pulse bg-qah-accent" />
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-px w-full bg-qah-border">
          <div
            className="h-full bg-qah-accent transition-all duration-700 ease-out"
            style={{ width: step >= 1 ? "100%" : "50%" }}
          />
        </div>

        {/* Technical footer */}
        <div className="mt-6 flex justify-between text-[10px] text-qah-text-subtle uppercase tracking-wider">
          <span>Build: 1.0.0</span>
          <span>Arch: Browser</span>
          <span>Mode: Workspace</span>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Workspace Setup Overlay
// ------------------------------------------------------------

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
        setError(
          "Folder access was denied or is not supported in this browser."
        );
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
    <div className="flex h-screen w-screen items-center justify-center bg-qah-bg font-mono-technical grid-texture">
      <div className="w-full max-w-md border border-qah-border-strong bg-qah-surface p-6">
        {/* Header */}
        <div className="mb-6 border-b border-qah-border pb-4">
          <h2 className="text-lg font-bold tracking-[0.15em] text-qah-text">
            QAL&apos;AT AL-HAQQ
          </h2>
          <p className="mt-1 text-xs uppercase tracking-widest text-qah-text-subtle">
            Workspace Configuration
          </p>
        </div>

        <p className="mb-6 text-sm text-qah-text-muted leading-relaxed">
          Select a folder on your computer where QAL&apos;AT AL-HAQQ will store
          your projects. This folder will contain all your work.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleRequestAccess}
            disabled={isRequesting}
            className="qah-btn-primary w-full disabled:opacity-50"
          >
            {isRequesting ? "REQUESTING..." : "SELECT WORKSPACE FOLDER"}
          </button>

          {error && (
            <div className="border border-qah-danger bg-qah-surface-raised px-3 py-2">
              <p className="text-xs text-qah-danger">{error}</p>
            </div>
          )}

          <p className="text-[10px] text-qah-text-subtle leading-relaxed">
            You can change this later in Settings. If your browser doesn&apos;t
            support folder selection, projects will be stored in browser
            storage.
          </p>
        </div>

        {/* Footer metadata */}
        <div className="mt-6 flex justify-between border-t border-qah-border pt-3 text-[10px] text-qah-text-subtle uppercase tracking-wider">
          <span>ID: workspace-init</span>
          <span>REQ: 001</span>
        </div>
      </div>
    </div>
  );
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<App />);
}
