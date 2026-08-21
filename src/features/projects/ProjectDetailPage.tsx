import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/utils/formatDate";
import { listFiles } from "@/lib/storage";
import type { ProjectManifest } from "@/types/project";
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

export function ProjectDetailPage({
  project,
  onBack,
  onDelete,
}: ProjectDetailPageProps) {
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});

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

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Description */}
      {project.description && (
        <Card>
          <p className="text-sm text-[var(--studio-text-muted)]">
            {project.description}
          </p>
        </Card>
      )}

      {/* Skill Invocation */}
      <SkillPanel projectId={project.id} projectSlug={project.slug} />

      {/* Folders Grid */}
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
