import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/utils/formatDate";
import type { ProjectManifest } from "@/types/project";
import { Folder, Clock } from "lucide-react";

interface ProjectCardProps {
  project: ProjectManifest;
  onClick?: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-[var(--studio-surface-elevated)]"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--studio-surface-elevated)]">
            <Folder size={20} className="text-[var(--studio-accent)]" />
          </div>
          <div>
            <h3 className="font-medium text-[var(--studio-text)]">
              {project.name}
            </h3>
            <p className="text-xs text-[var(--studio-text-subtle)]">
              {project.slug}
            </p>
          </div>
        </div>
        <Badge>{project.type}</Badge>
      </div>

      {project.description && (
        <p className="mt-3 text-sm text-[var(--studio-text-muted)] line-clamp-2">
          {project.description}
        </p>
      )}

      <div className="mt-3 flex items-center gap-4 text-xs text-[var(--studio-text-subtle)]">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {formatDate(project.modifiedAt)}
        </span>
        {project.tags.length > 0 && (
          <span>{project.tags.join(", ")}</span>
        )}
      </div>
    </Card>
  );
}
