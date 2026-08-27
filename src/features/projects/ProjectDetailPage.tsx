import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/utils/formatDate";
import { listFiles } from "@/lib/storage";
import type { ProjectManifest, ProjectStatus } from "@/types/project";
import { SkillPanel } from "./SkillPanel";
import {
  ArrowLeft,
  Folder,
  FileText,
  Image,
  MessageSquare,
  Settings,
  Trash2,
} from "lucide-react";

interface ProjectDetailPageProps {
  project: ProjectManifest;
  onBack: () => void;
  onDelete: () => void;
  onUpdate: (manifest: ProjectManifest) => Promise<void>;
}

const folderDefinitions = [
  { name: "references", icon: FileText },
  { name: "research", icon: FileText },
  { name: "scripts", icon: FileText },
  { name: "assets", icon: Image },
  { name: "prompts", icon: MessageSquare },
  { name: "notes", icon: FileText },
  { name: "exports", icon: Folder },
  { name: "decisions", icon: FileText },
  { name: "archive", icon: Folder },
] as const;

const statusOptions: ProjectStatus[] = ["active", "paused", "blocked", "completed"];

export function ProjectDetailPage({
  project,
  onBack,
  onDelete,
  onUpdate,
}: ProjectDetailPageProps) {
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<ProjectStatus>(project.status ?? "active");
  const [progress, setProgress] = useState(project.progress ?? 0);
  const [nextAction, setNextAction] = useState(project.nextAction ?? "");
  const [targetDate, setTargetDate] = useState(project.targetDate ?? "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setStatus(project.status ?? "active");
    setProgress(project.progress ?? 0);
    setNextAction(project.nextAction ?? "");
    setTargetDate(project.targetDate ?? "");
  }, [project]);

  useEffect(() => {
    let cancelled = false;

    async function loadFolderCounts() {
      const entries = await Promise.all(
        folderDefinitions.map(async (folder) => {
          try {
            const files = await listFiles(project.slug, folder.name);
            return [folder.name, files.length] as const;
          } catch {
            return [folder.name, 0] as const;
          }
        })
      );

      if (!cancelled) {
        setFolderCounts(Object.fromEntries(entries));
      }
    }

    loadFolderCounts();

    return () => {
      cancelled = true;
    };
  }, [project.slug]);

  const saveStatus = async () => {
    setIsSaving(true);
    try {
      await onUpdate({
        ...project,
        status,
        progress,
        nextAction: nextAction.trim() || undefined,
        targetDate: targetDate || undefined,
        modifiedAt: new Date().toISOString(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--studio-text)]">
              {project.name}
            </h1>
            <p className="text-sm text-[var(--studio-text-muted)]">
              {project.slug} · Created {formatDate(project.createdAt)}
            </p>
          </div>
          <Badge>{project.type}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">
            <Settings size={14} className="mr-1.5" />
            Settings
          </Button>
          <Button variant="danger" size="sm" onClick={onDelete}>
            <Trash2 size={14} className="mr-1.5" />
            Delete
          </Button>
        </div>
      </div>

      {project.description && (
        <Card>
          <p className="text-sm text-[var(--studio-text-muted)]">
            {project.description}
          </p>
        </Card>
      )}

      <Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs uppercase tracking-[0.08em] text-qah-text-muted">
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as ProjectStatus)}
              className="mt-1.5 w-full border border-qah-border-strong bg-[#080b08] px-3 py-2 text-sm text-qah-text"
            >
              {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="text-xs uppercase tracking-[0.08em] text-qah-text-muted">
            Progress
            <input
              type="number"
              min={0}
              max={100}
              value={progress}
              onChange={(event) => setProgress(Math.max(0, Math.min(100, Number(event.target.value) || 0)))}
              className="mt-1.5 w-full border border-qah-border-strong bg-[#080b08] px-3 py-2 text-sm text-qah-text"
            />
          </label>
          <label className="text-xs uppercase tracking-[0.08em] text-qah-text-muted md:col-span-2 xl:col-span-1">
            Target Date
            <input
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
              className="mt-1.5 w-full border border-qah-border-strong bg-[#080b08] px-3 py-2 text-sm text-qah-text"
            />
          </label>
          <label className="text-xs uppercase tracking-[0.08em] text-qah-text-muted md:col-span-2 xl:col-span-1">
            Next Action
            <input
              value={nextAction}
              maxLength={240}
              onChange={(event) => setNextAction(event.target.value)}
              placeholder="What should happen next?"
              className="mt-1.5 w-full border border-qah-border-strong bg-[#080b08] px-3 py-2 text-sm text-qah-text"
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={saveStatus} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Project Status"}
          </Button>
        </div>
      </Card>

      <SkillPanel projectId={project.id} projectSlug={project.slug} />

      <div>
        <h2 className="mb-4 text-lg font-semibold text-[var(--studio-text)]">
          Project Folders
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {folderDefinitions.map((folder) => (
            <Card
              key={folder.name}
              className="cursor-pointer transition-colors hover:bg-[var(--studio-surface-elevated)]"
            >
              <div className="flex items-center gap-3">
                <folder.icon
                  size={18}
                  className="text-[var(--studio-text-subtle)]"
                />
                <div>
                  <p className="font-medium capitalize text-[var(--studio-text)]">
                    {folder.name}
                  </p>
                  <p className="text-xs text-[var(--studio-text-subtle)]">
                    {folderCounts[folder.name] ?? 0} items
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
