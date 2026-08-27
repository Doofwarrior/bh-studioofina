import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PROJECT_TYPES } from "@/lib/constants";
import { slugify } from "@/utils/slugify";
import type { ProjectManifest } from "@/types/project";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (manifest: ProjectManifest) => void;
}

export function CreateProjectModal({
  isOpen,
  onClose,
  onCreate,
}: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof PROJECT_TYPES)[number]>("content");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;

    const now = new Date().toISOString();
    const manifest: ProjectManifest = {
      id: crypto.randomUUID(),
      name: name.trim(),
      slug: slugify(name),
      type,
      description: description.trim() || undefined,
      createdAt: now,
      modifiedAt: now,
      version: "1.0",
      settings: { defaultExportFormat: "reel" },
      tags: [],
      status: "active",
      progress: 0,
    };

    onCreate(manifest);
    setName("");
    setType("content");
    setDescription("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Project">
      <div className="space-y-4">
        <Input
          label="Project Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., The Cycle of Anger"
        />

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--studio-text-muted)]">
            Project Type
          </label>
          <select
            value={type}
            onChange={(e) =>
              setType(e.target.value as (typeof PROJECT_TYPES)[number])
            }
            className="w-full rounded-md border bg-[var(--studio-surface)] px-3 py-2 text-sm text-[var(--studio-text)] focus:outline-none focus:ring-1 focus:ring-[var(--studio-accent)]"
          >
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--studio-text-muted)]">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border bg-[var(--studio-surface)] px-3 py-2 text-sm text-[var(--studio-text)] placeholder:text-[var(--studio-text-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--studio-accent)] resize-y"
            placeholder="Brief description of the project..."
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>
            Create Project
          </Button>
        </div>
      </div>
    </Modal>
  );
}
