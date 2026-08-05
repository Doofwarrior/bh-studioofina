import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface PromptEditorProps {
  initialContent?: string;
  onSave: (content: string, name: string) => void;
}

export function PromptEditor({ initialContent = "", onSave }: PromptEditorProps) {
  const [name, setName] = useState("");
  const [content, setContent] = useState(initialContent);

  return (
    <div className="space-y-4">
      <Input
        label="Prompt Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., Midjourney Hero Shot"
      />
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--studio-text-muted)]">
          Prompt Content
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          className="w-full rounded-md border bg-[var(--studio-surface)] px-3 py-2 text-sm text-[var(--studio-text)] font-mono placeholder:text-[var(--studio-text-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--studio-accent)] resize-y"
          placeholder="Enter your prompt here..."
        />
      </div>
      <div className="flex justify-end">
        <Button
          onClick={() => onSave(content, name)}
          disabled={!name.trim() || !content.trim()}
        >
          Save Prompt
        </Button>
      </div>
    </div>
  );
}
