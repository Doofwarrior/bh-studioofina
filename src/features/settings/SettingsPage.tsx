import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useWorkspace } from "@/hooks/useWorkspace";
import { aiBridge } from "@/ai/aiBridge";
import type { OllamaModel } from "@/types/ollama";
import {
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OLLAMA_MODEL,
} from "@/lib/constants";
import { FolderOpen, Server, RefreshCw, CheckCircle, XCircle } from "lucide-react";

export function SettingsPage() {
  const { workspacePath, configureWorkspace } = useWorkspace();
  const [newWorkspacePath, setNewWorkspacePath] = useState(workspacePath);

  const [ollamaUrl, setOllamaUrl] = useState(
    localStorage.getItem("bh-studio:ollama-base-url") || DEFAULT_OLLAMA_BASE_URL
  );
  const [ollamaModel, setOllamaModel] = useState(
    localStorage.getItem("bh-studio:ollama-model") || DEFAULT_OLLAMA_MODEL
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

  const handleSaveWorkspace = () => {
    configureWorkspace(newWorkspacePath);
  };

  const handleSaveOllama = () => {
    localStorage.setItem("bh-studio:ollama-base-url", ollamaUrl);
    localStorage.setItem("bh-studio:ollama-model", ollamaModel);
    checkOllama();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--studio-text)]">Settings</h1>

      <Card title="Workspace" subtitle="Where your projects are stored">
        <div className="space-y-4">
          <Input
            label="Workspace Path"
            value={newWorkspacePath}
            onChange={(e) => setNewWorkspacePath(e.target.value)}
            placeholder="~/BH-Studio-Workspace"
          />
          <Button onClick={handleSaveWorkspace}>
            <FolderOpen size={16} className="mr-2" />
            Save Workspace Path
          </Button>
        </div>
      </Card>

      <Card title="Ollama Configuration" subtitle="Local LLM settings">
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-md border bg-[var(--studio-surface-elevated)] p-3">
            {connectionStatus === "idle" && (
              <>
                <Server size={18} className="text-[var(--studio-text-subtle)]" />
                <span className="text-sm text-[var(--studio-text-muted)]">
                  Not checked yet
                </span>
              </>
            )}
            {connectionStatus === "checking" && (
              <>
                <RefreshCw
                  size={18}
                  className="animate-spin text-[var(--studio-accent)]"
                />
                <span className="text-sm text-[var(--studio-text-muted)]">
                  Checking connection...
                </span>
              </>
            )}
            {connectionStatus === "connected" && (
              <>
                <CheckCircle size={18} className="text-green-400" />
                <span className="text-sm text-green-400">
                  Connected — {availableModels.length} model
                  {availableModels.length !== 1 ? "s" : ""} available
                </span>
              </>
            )}
            {connectionStatus === "error" && (
              <>
                <XCircle size={18} className="text-red-400" />
                <span className="text-sm text-red-400">
                  {connectionError}
                </span>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
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
                className="flex-1 rounded-md border bg-[var(--studio-surface)] px-3 py-2 text-sm text-[var(--studio-text)] focus:outline-none focus:ring-1 focus:ring-[var(--studio-accent)]"
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

          <div className="rounded-md border border-amber-800/30 bg-amber-900/10 p-3">
            <p className="text-xs text-amber-400">
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

      <Card title="About" subtitle="BH Studio information">
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
