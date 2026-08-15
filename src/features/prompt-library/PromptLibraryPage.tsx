import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PromptEditor } from "@/components/editor/PromptEditor";
import type { PromptAsset } from "@/types/project";
import { PromptAssetSchema } from "@/types/project";
import { useProjectContext } from "@/app/providers/ProjectProvider";
import { savePrompt, listFiles, readFile } from "@/lib/storage";
import { Plus, Tag } from "lucide-react";

export function PromptLibraryPage() {
  const { activeProject } = useProjectContext();
  const [prompts, setPrompts] = useState<PromptAsset[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load persisted prompts from the active project's storage whenever the
  // active project changes. Reuses the existing generic storage API
  // (listFiles/readFile); no new storage function required.
  useEffect(() => {
    let cancelled = false;
    if (!activeProject) {
      setPrompts([]);
      setLoadError(null);
      return;
    }
    (async () => {
      try {
        const files = await listFiles(activeProject.slug, "prompts");
        const loaded: PromptAsset[] = [];
        for (const file of files) {
          try {
            const text = await readFile(activeProject.slug, "prompts", file);
            if (!text) continue;
            const parsed = PromptAssetSchema.safeParse(JSON.parse(text));
            if (parsed.success) loaded.push(parsed.data);
          } catch {
            // Skip malformed prompt file; do not fail the whole load.
          }
        }
        if (!cancelled) {
          setPrompts(loaded);
          setLoadError(null);
        }
      } catch {
        if (!cancelled) {
          setLoadError("Failed to load prompts from project storage.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeProject?.slug]);

  const handleSavePrompt = async (content: string, name: string) => {
    if (!activeProject) return;
    setSaveError(null);
    const now = new Date().toISOString();
    const newPrompt: PromptAsset = {
      id: crypto.randomUUID(),
      name,
      version: 1,
      content,
      tags: [],
      projectId: activeProject.id,
      metadata: {
        model: "gpt-4o",
        temperature: 0.7,
        maxTokens: 4096,
        createdAt: now,
        modifiedAt: now,
      },
      iterations: [],
    };
    try {
      await savePrompt(activeProject.slug, newPrompt);
      setPrompts((prev) => [...prev, newPrompt]);
      setIsCreating(false);
    } catch {
      // Keep the modal open so the user's input is preserved.
      setSaveError("Failed to save prompt to project storage.");
    }
  };

  const filteredPrompts = prompts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--studio-text)]">
          Prompt Library
        </h1>
        <Button onClick={() => setIsCreating(true)} disabled={!activeProject}>
          <Plus size={16} className="mr-2" />
          New Prompt
        </Button>
      </div>

      {!activeProject && (
        <div className="rounded-md border border-amber-800/30 bg-amber-900/10 p-3 text-sm text-amber-400">
          No active project. Open a project to save and load prompts.
        </div>
      )}

      {loadError && (
        <p className="text-sm text-[var(--studio-danger)]">{loadError}</p>
      )}

      <Input
        placeholder="Search prompts..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-md"
      />

      {filteredPrompts.length === 0 ? (
        <div className="py-12 text-center text-[var(--studio-text-muted)]">
          <p className="text-sm">
            {searchQuery
              ? "No prompts match your search."
              : activeProject
              ? "No prompts yet."
              : "Open a project to view its prompts."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPrompts.map((prompt) => (
            <Card key={prompt.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-[var(--studio-text)]">
                    {prompt.name}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--studio-text-subtle)] line-clamp-2 font-mono">
                    {prompt.content}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    {prompt.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-[var(--studio-surface-elevated)] px-2 py-0.5 text-xs text-[var(--studio-text-muted)]"
                      >
                        <Tag size={10} className="mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-xs text-[var(--studio-text-subtle)]">
                  v{prompt.version}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isCreating}
        onClose={() => {
          setIsCreating(false);
          setSaveError(null);
        }}
        title="Create New Prompt"
        size="lg"
      >
        <PromptEditor onSave={handleSavePrompt} />
        {saveError && (
          <p className="mt-3 text-sm text-[var(--studio-danger)]">{saveError}</p>
        )}
      </Modal>
    </div>
  );
}
