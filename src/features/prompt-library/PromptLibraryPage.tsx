import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PromptEditor } from "@/components/editor/PromptEditor";
import type { PromptAsset } from "@/types/project";
import { Plus, Tag } from "lucide-react";

export function PromptLibraryPage() {
  const [prompts, setPrompts] = useState<PromptAsset[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSavePrompt = (content: string, name: string) => {
    const newPrompt: PromptAsset = {
      id: crypto.randomUUID(),
      name,
      version: 1,
      content,
      tags: [],
      projectId: "global",
      metadata: {
        model: "gpt-4o",
        temperature: 0.7,
        maxTokens: 4096,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      },
      iterations: [],
    };
    setPrompts((prev) => [...prev, newPrompt]);
    setIsCreating(false);
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
        <Button onClick={() => setIsCreating(true)}>
          <Plus size={16} className="mr-2" />
          New Prompt
        </Button>
      </div>

      <Input
        placeholder="Search prompts..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-md"
      />

      {filteredPrompts.length === 0 ? (
        <div className="py-12 text-center text-[var(--studio-text-muted)]">
          <p className="text-sm">
            {searchQuery ? "No prompts match your search." : "No prompts yet."}
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
        onClose={() => setIsCreating(false)}
        title="Create New Prompt"
        size="lg"
      >
        <PromptEditor onSave={handleSavePrompt} />
      </Modal>
    </div>
  );
}
