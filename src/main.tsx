/**
 * QAL'AT AL-HAQQ v1.0 - Application Entry Point
 *
 * Slice 1: Global Visual Foundation + Boot Sequence
 * State machine preserved from BH Studio v1.0 baseline.
 */

import { RestorePage } from "@/features/settings/RestorePage";
import {pendingRestore,restoreLock} from "@/lib/storage/applicationRestore";
import { StrictMode, useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { WorkspaceProvider } from "@/app/providers/WorkspaceProvider";
import { ProjectProvider } from "@/app/providers/ProjectProvider";
import { createAppRouter } from "@/app/routes";
import Bootloader from "@/components/Bootloader/Bootloader";
import {
  initialize,
  isWorkspaceConnected,
  selectWorkspaceDirectory,
  getWorkspaceAccessIssue,
} from "@/lib/storage";
import "@/styles/index.css";

// Router is created once at module level - never recreated on re-render
const router = createAppRouter();

function App() {
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [localMode, setLocalMode] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const enter = useCallback(() => setIsChecking(false), []);
  const [checked, setChecked] = useState(false);
  const [startupError, setStartupError] = useState("");

  useEffect(() => {
    async function init() {
      let ready = false;

      try {
        // Initialize storage and restore persisted workspace state before rendering the app.
        await initialize();
        ready = isWorkspaceConnected();
      } catch (err) {
        setStartupError("Workspace initialization failed. Select the folder again or continue in local mode.");
        console.error("[App] Workspace init failed:", err);
      }

      const issue = getWorkspaceAccessIssue();
      if (issue === "storage-error") setStartupError("Workspace storage could not be opened. Select the folder again or continue in local mode.");
      if (issue === "restoration-failed") setStartupError("Your saved workspace needs authorization. Select the folder again or continue in local mode.");
      setWorkspaceReady(ready);
      setChecked(true);

    }
    init();
  }, []);

  return (
    <Bootloader>
      {isChecking ? (
        <BootSequence checked={checked} connected={workspaceReady} error={!!startupError} enter={enter} />
      ) : !workspaceReady && !localMode ? (
        <WorkspaceSetup
          initialError={startupError}
          onReady={() => setWorkspaceReady(true)}
          onContinueLocal={() => setLocalMode(true)}
        />
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

const staticLogo = "/boot/citadel-of-truth.png";
const revealLogo = "/boot/terminal-reveal.webp";

function BootSequence({ checked, connected, error, enter }: {
  checked: boolean; connected: boolean; error: boolean; enter: () => void;
}) {
  const [phase, setPhase] = useState<"reveal" | "identity" | "flanks" | "closing">(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches ? "closing" : "reveal"
  );
  const [revealFailed, setRevealFailed] = useState(false);
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const reduce = () => { if (preference.matches) setPhase("closing"); };
    preference.addEventListener("change", reduce);
    return () => preference.removeEventListener("change", reduce);
  }, []);
  useEffect(() => {
    if ((phase === "flanks" || phase === "closing") && !checked) return;
    if (error) { enter(); return; }
    const timer = window.setTimeout(() => {
      if (phase === "reveal") setPhase("identity");
      else if (phase === "identity") setPhase("flanks");
      else if (phase === "flanks") setPhase("closing");
      else enter();
    }, { reveal: 1600, identity: 960, flanks: 640, closing: 2600 }[phase]);
    return () => window.clearTimeout(timer);
  }, [phase, checked, error, enter]);
  const closing = phase === "closing" && checked;

  const statusRows = [
    { label: "WORKSPACE", value: !checked ? "CHECKING" : error ? "ATTENTION" : connected ? "READY" : "SETUP" },
    ...["KNOWLEDGE", "AI BRIDGE", "PROJECTS", "AI SKILLS"].map(label => ({ label, value: "ON DEMAND" })),
  ];
  const segmentCount = 32;
  const filledSegments = checked && !error ? segmentCount : 0;

  return (
    <div className="relative flex min-h-[100svh] w-full items-center justify-center py-14 bg-[rgba(3,4,3,0.55)] font-mono-technical">
      {/* Corner / edge chrome */}
      <div className="pointer-events-none absolute inset-0">
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
          QALAT_BOOT_SEQUENCE
        </div>
        <div
          className="absolute left-4 hidden md:block top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.2em] text-qah-text-dim"
          style={{ writingMode: "vertical-rl" }}
        >
          SYS_INIT_SEQUENCER / 01
        </div>
        <div
          className="absolute right-4 hidden md:block top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.2em] text-qah-text-dim"
          style={{ writingMode: "vertical-rl" }}
        >
          BOOT_01
        </div>
        <div className="absolute right-6 top-20 hidden xl:block w-48 border border-qah-border bg-qah-surface/60 px-3 py-2 text-[10px] uppercase tracking-wider text-qah-text-subtle">
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

      <div className="relative z-10 w-full max-w-3xl px-6 sm:px-12">
        {/* Bismillah frame */}
        <div className="relative mx-auto mb-5 max-w-md border border-qah-border-strong bg-qah-surface/70 px-6 py-5 text-center">
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

        <div className="mx-auto mb-4 h-[clamp(8rem,25svh,17rem)]">
          <img className="h-full w-full object-contain" src={
            closing ? "/boot/closing-calligraphy.png" :
            phase === "flanks" ? "/boot/citadel-calligraphy.png" :
            phase === "reveal" && !revealFailed ? revealLogo : staticLogo
          } onError={() => setRevealFailed(true)}
            alt={closing ? "Closing calligraphy" : "QAL’AT AL-HAQQ · قَلْعَةُ الْحَقّ"} />
        </div>

        {closing ? (
          <section className="text-center text-qah-text" aria-label="Boot complete">
            <span className="inline-block border border-qah-accent px-6 py-1 text-sm tracking-widest text-qah-accent">SYSTEM READY</span>
            <h1 className="mt-5 font-sans text-lg font-medium tracking-[0.16em] sm:text-2xl">HASBUNALLAHU WA NI’MAL WAKEEL</h1>
            <p className="mx-auto mt-3 max-w-md font-sans text-sm leading-relaxed sm:text-base">Allah is sufficient for us, and He is the best Disposer of affairs.</p>
          </section>
        ) : <>
        <div className="space-y-1.5">
          {statusRows.map((row) => {
            const isActive = checked && !error && row.label === "WORKSPACE";
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
                  {row.value}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress */}
        <div className="mt-6">
          <div className="mb-2 text-xs uppercase tracking-[0.2em] text-qah-text-muted">
            {error ? "Workspace check requires attention" : "Workspace initialization"}
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
              {error ? "!" : checked ? "100%" : "…"}
            </span>
          </div>
        </div>

        </>}

        {checked && <button type="button" className="qah-btn-secondary mx-auto mt-4 block" onClick={enter}>
          {connected ? "Enter workspace" : "Continue to workspace setup"}
        </button>}

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

function WorkspaceSetup({
  initialError,
  onReady,
  onContinueLocal,
}: {
  initialError: string;
  onReady: () => void;
  onContinueLocal: () => void;
}) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState(initialError);

  const handleRequestAccess = async () => {
    setIsRequesting(true);
    setError("");
    try {
      const granted = await selectWorkspaceDirectory();
      if (granted) {
        onReady();
      } else {
        const issue = getWorkspaceAccessIssue();
        setError(
          issue === "unsupported"
            ? "Filesystem workspace access is not supported here. You can continue in local mode."
            : issue === "restoration-failed"
              ? "The saved workspace needs authorization again. Select the folder or continue in local mode."
              : issue === "storage-error"
                ? "Workspace state could not be restored. Select a folder again or continue in local mode."
                : "Folder access was cancelled or denied. Select a folder again or continue in local mode."
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

          <button
            type="button"
            onClick={onContinueLocal}
            className="qah-btn-secondary w-full"
          >
            CONTINUE IN LOCAL MODE
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
  const root = createRoot(rootEl);
  const recovery = new URLSearchParams(location.search).has("recover");
  const open = async () => {
    const pending = await pendingRestore();
    if (pending && !recovery) { location.replace("/settings?recover"); return; }
    root.render(recovery ? <RestorePage/> : <App/>);
  };
  if (navigator.locks) {
    // Keep ordinary writers unmounted throughout recovery, including on reload.
    void navigator.locks.request(restoreLock, {mode:recovery?"exclusive":"shared",ifAvailable:true},async lock=>{
      if (!lock) {root.render(<p>Close other QAL’AT tabs and reload this page to continue.</p>);return;}
      await open();
      await new Promise<void>(resolve=>window.addEventListener("pagehide",()=>resolve(),{once:true}));
    }).catch(e=>root.render(<p>Cannot check recovery state: {String(e)}</p>));
    window.addEventListener("pageshow",e=>{if(e.persisted)location.reload();});
  } else if(recovery) root.render(<p>Restore requires browser lock support.</p>);
  else void open().catch(e=>root.render(<p>Cannot check recovery state: {String(e)}</p>));
}
