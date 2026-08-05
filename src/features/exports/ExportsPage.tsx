import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import type { ExportPackage } from "@/types/export";
import { EXPORT_FORMATS, PLATFORMS } from "@/lib/constants";
import { Package, Plus, Download } from "lucide-react";

export function ExportsPage() {
  const [exports, setExports] = useState<ExportPackage[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateExport = (name: string, format: string) => {
    const newExport: ExportPackage = {
      id: crypto.randomUUID(),
      projectId: "global", // TODO(v1.0): Link to active project
      name,
      format: format as ExportPackage["format"],
      createdAt: new Date().toISOString(),
      assets: [],
      manifest: {
        title: name,
        platformVersions: [],
      },
    };
    setExports((prev) => [...prev, newExport]);
    setIsCreating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--studio-text)]">
          Exports
        </h1>
        <Button onClick={() => setIsCreating(true)}>
          <Plus size={16} className="mr-2" />
          New Export
        </Button>
      </div>

      {exports.length === 0 ? (
        <div className="py-12 text-center text-[var(--studio-text-muted)]">
          <Package size={32} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">No exports yet.</p>
          <p className="text-xs">Create an export package for your content.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {exports.map((exp) => (
            <Card key={exp.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package
                    size={18}
                    className="text-[var(--studio-accent)]"
                  />
                  <div>
                    <h3 className="font-medium text-[var(--studio-text)]">
                      {exp.name}
                    </h3>
                    <p className="text-xs text-[var(--studio-text-subtle)]">
                      {exp.manifest.title}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{exp.format}</Badge>
                  <Button variant="ghost" size="sm">
                    <Download size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateExportModal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        onCreate={handleCreateExport}
      />
    </div>
  );
}

function CreateExportModal({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, format: string) => void;
}) {
  const [name, setName] = useState("");
  const [format, setFormat] = useState<(typeof EXPORT_FORMATS)[number]>("reel");

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Export Package">
      <div className="space-y-4">
        <Input
          label="Package Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Cycle of Anger — Instagram Reel"
        />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--studio-text-muted)]">
            Format
          </label>
          <select
            value={format}
            onChange={(e) =>
              setFormat(e.target.value as (typeof EXPORT_FORMATS)[number])
            }
            className="w-full rounded-md border bg-[var(--studio-surface)] px-3 py-2 text-sm text-[var(--studio-text)] focus:outline-none focus:ring-1 focus:ring-[var(--studio-accent)]"
          >
            {EXPORT_FORMATS.map((f) => (
              <option key={f} value={f}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => onCreate(name, format)}
            disabled={!name.trim()}
          >
            Create Export
          </Button>
        </div>
      </div>
    </Modal>
  );
}
