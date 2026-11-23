import { Badge } from "@/components/ui/Badge";
import {BackupSettings} from "./BackupSettings";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useWorkspace } from "@/hooks/useWorkspace";
import { aiBridge } from "@/ai/aiBridge";
import type { OllamaModel } from "@/types/ollama";
import {
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OLLAMA_MODEL,
} from "@/lib/constants";
import { FolderOpen, Server, RefreshCw } from "lucide-react";

export function SettingsPage() {
  const { workspacePath, isConfigured, connectWorkspace } = useWorkspace();
  const [wsStatus, setWsStatus] = useState<
    "idle" | "connecting" | "connected" | "cancelled" | "error"
  >("idle");
  const [wsError, setWsError] = useState("");

  const [ollamaUrl, setOllamaUrl] = useState(
    localStorage.getItem("qah:ollama-base-url") || DEFAULT_OLLAMA_BASE_URL
  );
  const [ollamaModel, setOllamaModel] = useState(
    localStorage.getItem("qah:ollama-model") || DEFAULT_OLLAMA_MODEL
  );
  const [availableModels, setAvailableModels] = useState<OllamaModel[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "checking" | "connected" | "error"
  >("idle");
  const [connectionError, setConnectionError] = useState("");

  useEffect(() => {
    checkOllama();
  }, []);

  const checkOllama = async () => {
    setConnectionStatus("checking");
    setConnectionError("");

    const result = await aiBridge.checkConnection();

    if (result.ok && result.models) {
      setConnectionStatus("connected");
      setAvailableModels(result.models);
    } else {
      setConnectionStatus("error");
      setConnectionError(result.error || "Unknown error");
    }
  };

  const handleConnectWorkspace = async () => {
    setWsStatus("connecting");
    setWsError("");
    try {
      const ok = await connectWorkspace();
      setWsStatus(ok ? "connected" : "cancelled");
    } catch (err) {
      setWsStatus("error");
      setWsError(
        err instanceof Error ? err.message : "Workspace access failed"
      );
    }
  };

  const handleSaveOllama = () => {
    localStorage.setItem("qah:ollama-base-url", ollamaUrl);
    localStorage.setItem("qah:ollama-model", ollamaModel);
    checkOllama();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--studio-text)]">Settings</h1>

      <Card title="Workspace" subtitle="Where your projects are stored">
        <div className="space-y-4">
          <p className="text-sm text-[var(--studio-text-muted)]">
            {isConfigured
              ? `Connected: ${workspacePath || "workspace folder"}`
              : "No workspace connected. Connect a folder to enable filesystem storage for your projects."}
          </p>
          <Button onClick={handleConnectWorkspace} disabled={wsStatus === "connecting"}>
            <FolderOpen size={16} className="mr-2" />
            {isConfigured ? "Reconnect Workspace Folder" : "Connect Workspace Folder"}
          </Button>
          {wsStatus === "connecting" && (
            <p role="status"><Badge variant="processing">Requesting folder access…</Badge></p>
          )}
          {wsStatus === "cancelled" && (
            <p role="status"><Badge variant="warning">Workspace selection was cancelled or denied.</Badge></p>
          )}
          {wsStatus === "error" && (
            <p role="alert"><Badge variant="danger">{wsError}</Badge></p>
          )}
        </div>
      </Card>

      <BackupSettings/>
      <Card title="Ollama Configuration" subtitle="Local LLM settings">
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-md border bg-[var(--studio-surface-elevated)] p-3">
            <div role="status" className="min-w-0">
              {connectionStatus === "idle" && <Badge>Not checked yet</Badge>}
              {connectionStatus === "checking" && <Badge variant="processing">Checking connection…</Badge>}
              {connectionStatus === "connected" && <Badge variant="success">Connected — {availableModels.length} model{availableModels.length !== 1 ? "s" : ""} available</Badge>}
              {connectionStatus === "error" && <Badge variant="danger">Connection unavailable · {connectionError}</Badge>}
            </div>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Check connection"
              onClick={checkOllama}
              disabled={connectionStatus === "checking"}
            >
              <RefreshCw size={14} />
            </Button>
          </div>

          <Input
            label="Ollama Base URL"
            value={ollamaUrl}
            onChange={(e) => setOllamaUrl(e.target.value)}
            placeholder="http://localhost:11434"
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--studio-text-muted)]">
              Model
            </label>
            <div className="flex gap-2">
              <select
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                className="flex-1 rounded-md border border-qah-border-pale bg-[var(--studio-surface)] px-3 py-2 text-sm text-[var(--studio-text)] focus:outline-none focus:ring-1 focus:ring-[var(--studio-accent)]"
              >
                {availableModels.length > 0 ? (
                  availableModels.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name} ({m.details.parameter_size})
                    </option>
                  ))
                ) : (
                  <option value={ollamaModel}>{ollamaModel}</option>
                )}
              </select>
              <Input
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                placeholder="Or type model name..."
                className="flex-1"
              />
            </div>
            {availableModels.length > 0 && (
              <p className="text-xs text-[var(--studio-text-subtle)]">
                {availableModels.length} model{availableModels.length !== 1 ? "s" : ""}{" "}
                detected. Select from dropdown or type manually.
              </p>
            )}
          </div>

          <Button onClick={handleSaveOllama}>
            <Server size={16} className="mr-2" />
            Save Ollama Settings
          </Button>

          <div className="rounded-md border border-qah-warning/30 bg-qah-warning/10 p-3">
            <p className="text-xs text-qah-warning">
              <strong>Note:</strong> Make sure Ollama is running locally before
              using AI skills. Install from{" "}
              <a
                href="https://ollama.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                ollama.com
              </a>{" "}
              and pull your desired model with{" "}
              <code className="rounded bg-[var(--studio-surface-elevated)] px-1 py-0.5">
                ollama pull llama3.1
              </code>
            </p>
          </div>
        </div>
      </Card>

      <Card title="About" subtitle="QAL'AT AL-HAQQ information">
        <div className="space-y-2 text-sm text-[var(--studio-text-muted)]">
          <p>Version: 1.0.0</p>
          <p>Architecture: Three-layer (Application → AI Skills → Workspace)</p>
          <p>AI Provider: Ollama (local)</p>
          <p>License: MIT</p>
        </div>
      </Card>
    </div>
  );
}
