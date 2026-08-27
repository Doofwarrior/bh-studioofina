import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/utils/formatDate";
import type { ProjectManifest } from "@/types/project";
import { Folder, Clock, ArrowUpRight } from "lucide-react";

interface ProjectCardProps {
  project: ProjectManifest;
  onClick?: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  return (
    <Card
      className="dashboard-project-card cursor-pointer"
      onClick={onClick}
    >
      <div className="dashboard-project-card__topline">
        <span>PROJECT / {project.id.slice(0, 6).toUpperCase()}</span>
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="dashboard-project-card__glyph">
            <Folder size={20} className="text-[var(--studio-accent)]" />
          </div>
          <div>
            <h3 className="truncate font-medium text-[var(--studio-text)]">
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

      <div className="dashboard-project-card__footer">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {formatDate(project.modifiedAt)}
        </span>
        {project.tags.length > 0 && (
          <span>{project.tags.join(", ")}</span>
        )}
        <ArrowUpRight size={15} className="dashboard-project-card__arrow" aria-hidden="true" />
      </div>
    </Card>
  );
}
