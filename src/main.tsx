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
import Bootloader from "@/components/Bootloader/Bootloader";
import { initialize, isWorkspaceConnected, selectWorkspaceDirectory } from "@/lib/storage";
import "@/styles/index.css";

// Router is created once at module level - never recreated on re-render
const router = createAppRouter();

function App() {
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function init() {
      const minimumBootDuration = new Promise<void>((resolve) => {
        setTimeout(resolve, 2000);
      });

      let ready = false;

      try {
        // Initialize storage and restore persisted workspace state before rendering the app.
        await initialize();
        ready = isWorkspaceConnected();
      } catch (err) {
        console.error("[App] Workspace init failed:", err);
      }

      await minimumBootDuration;

      setWorkspaceReady(ready);
      setIsChecking(false);
    }
    init();
  }, []);

  return (
    <Bootloader>
      {isChecking ? (
        <BootSequence />
      ) : !workspaceReady ? (
        <WorkspaceSetup onReady={() => setWorkspaceReady(true)} />
      ) : (
        <StrictMode>
          <WorkspaceProvider>
            <ProjectProvider>
              <RouterProvider router={router} />
            </ProjectProvider>
          </WorkspaceProvider>
        </StrictMode>
      )}
    </Bootloader>
  );
}

// ------------------------------------------------------------
// Boot Sequence
// ------------------------------------------------------------

function BootSequence() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 500);
    const t2 = setTimeout(() => setStep(2), 1000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const steps = [
    { id: 0, label: "SYSTEM BOOT", detail: "Core modules loaded" },
    { id: 1, label: "WORKSPACE CHECK", detail: "Verifying storage connection" },
    { id: 2, label: "READY", detail: "Startup sequence complete" },
  ];

  // Presentation-only mapping of the reference's five status rows onto the
  // existing three-state `step` value. No new timers/state are introduced.
  const statusRows = [
    { label: "WORKSPACE", value: "READY", activeAt: 0 },
    { label: "KNOWLEDGE", value: "SYNC", activeAt: 0 },
    { label: "AI BRIDGE", value: "ONLINE", activeAt: 1 },
    { label: "PROJECTS", value: "LOADED", activeAt: 1 },
    { label: "AI SKILLS", value: "READY", activeAt: 2 },
  ];

  const progressPct = ((step + 1) / steps.length) * 100;
  const progressPctRounded = Math.round(progressPct);
  const segmentCount = 32;
  const filledSegments = Math.round((progressPct / 100) * segmentCount);

  return (
    <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-[rgba(3,4,3,0.55)] font-mono-technical">
      {/* Corner / edge chrome */}
      <div className="pointer-events-none absolute inset-0 hidden sm:block">
        <div className="absolute left-6 top-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-qah-text-subtle">
          <span className="h-1.5 w-1.5 bg-qah-accent" />
          QALAT_SYSTEM_v1.0.0
        </div>
        <div
          className="absolute left-0 top-16 h-24 w-2 opacity-70"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, var(--qah-accent-dim) 0, var(--qah-accent-dim) 4px, transparent 4px, transparent 8px)",
          }}
        />
        <div className="absolute right-6 top-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-qah-text-subtle">
          <span className="h-1.5 w-1.5 bg-qah-accent" />
          STUDIO_BOOT_SEQUENCE
        </div>
        <div
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.2em] text-qah-text-dim"
          style={{ writingMode: "vertical-rl" }}
        >
          SYS_INIT_SEQUENCER / 01
        </div>
        <div
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.2em] text-qah-text-dim"
          style={{ writingMode: "vertical-rl" }}
        >
          BOOT_01
        </div>
        <div className="absolute right-6 top-24 w-48 border border-qah-border bg-qah-surface/60 px-3 py-2 text-[10px] uppercase tracking-wider text-qah-text-subtle">
          <div className="mb-1.5 flex items-center gap-1.5 text-qah-text-muted">
            <span className="h-1.5 w-1.5 bg-qah-accent" />
            GLYPH_STREAM_ACTIVE
          </div>
          <div className="flex justify-between py-0.5">
            <span>SOURCE</span>
            <span className="text-qah-text-muted">ARABIC_GLYPH_SET</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span>MODE</span>
            <span className="text-qah-text-muted">MATRIX_FALL</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span>DENSITY</span>
            <span className="text-qah-text-muted">MEDIUM</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span>SPEED</span>
            <span className="text-qah-text-muted">1.00x</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-xl px-6">
        {/* Bismillah frame */}
        <div className="relative mb-8 border border-qah-border-strong bg-qah-surface/70 px-6 py-5 text-center">
          <span className="absolute -left-px -top-px h-2 w-2 border-l border-t border-qah-accent-dim" />
          <span className="absolute -right-px -top-px h-2 w-2 border-r border-t border-qah-accent-dim" />
          <span className="absolute -bottom-px -left-px h-2 w-2 border-b border-l border-qah-accent-dim" />
          <span className="absolute -bottom-px -right-px h-2 w-2 border-b border-r border-qah-accent-dim" />
          <p
            className="font-arabic text-xl text-qah-text"
            dir="rtl"
            lang="ar"
          >
            بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
          </p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-qah-text-subtle">
            Bismillahir Rahmanir Rahim
          </p>
        </div>

        {/* Status rows */}
        <div className="space-y-1.5">
          {statusRows.map((row) => {
            const isActive = step >= row.activeAt;
            return (
              <div
                key={row.label}
                className={`flex items-center justify-between border-b px-1 py-1.5 text-xs uppercase tracking-wider transition-colors ${
                  isActive
                    ? "border-qah-border text-qah-text"
                    : "border-qah-border-mute text-qah-text-dim"
                }`}
              >
                <span>{row.label}</span>
                <span
                  className={
                    isActive ? "text-qah-accent" : "text-qah-text-dim"
                  }
                >
                  {isActive ? row.value : "..."}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress */}
        <div className="mt-6">
          <div className="mb-2 text-xs uppercase tracking-[0.2em] text-qah-text-muted">
            Accessing Studio_
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-1 gap-[2px]">
              {Array.from({ length: segmentCount }).map((_, i) => (
                <span
                  key={i}
                  className={`h-3 flex-1 transition-colors duration-300 ${
                    i < filledSegments ? "bg-qah-accent" : "bg-qah-border"
                  }`}
                />
              ))}
            </div>
            <span className="w-10 text-right text-sm font-bold text-qah-text">
              {progressPctRounded}%
            </span>
          </div>
        </div>

        {/* Technical footer */}
        <div className="mt-8 flex items-center justify-between text-[10px] uppercase tracking-wider text-qah-text-subtle">
          <span>Secure. Systematic. Purposeful.</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 bg-qah-accent" />
            QAL‘AT_AL_HAQQ_OS
          </span>
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
      const granted = await selectWorkspaceDirectory();
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
    <div className="flex h-screen w-screen items-center justify-center bg-[rgba(3,4,3,0.55)] font-mono-technical grid-texture">
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
