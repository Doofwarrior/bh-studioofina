import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/utils/formatDate";
import type { ProjectManifest } from "@/types/project";
import { Folder, Clock, ArrowUpRight, Target } from "lucide-react";

interface ProjectCardProps {
  project: ProjectManifest;
  onClick?: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const status = project.status ?? "active";
  const progress = project.progress ?? 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full border border-qah-border-strong bg-[rgba(7,10,7,0.9)] p-3 text-left transition-colors hover:border-qah-accent-dim hover:bg-[rgba(11,15,11,0.96)] focus:outline-none focus:ring-1 focus:ring-qah-accent"
    >
      <div className="flex items-center justify-between gap-3 border-b border-qah-border pb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-qah-text-subtle">
        <span>PROJECT / {project.id.slice(0, 6).toUpperCase()}</span>
        <ArrowUpRight size={13} className="text-qah-text-subtle transition-colors group-hover:text-qah-accent" aria-hidden="true" />
      </div>

      <div className="mt-3 flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center border border-qah-border text-qah-accent">
          <Folder size={16} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold tracking-[-0.02em] text-qah-text">
                {project.name}
              </h3>
              <p className="mt-0.5 truncate font-mono text-[10px] text-qah-text-subtle">
                {project.slug}
              </p>
            </div>
            <Badge>{project.type}</Badge>
          </div>

          {project.description && (
            <p className="mt-3 line-clamp-2 text-xs leading-5 text-qah-text-muted">
              {project.description}
            </p>
          )}

          <div className="mt-3 grid grid-cols-[auto_1fr_auto] items-center gap-2 border-t border-qah-border pt-2 font-mono text-[9px] uppercase tracking-[0.1em] text-qah-text-subtle">
            <span className="flex items-center gap-1.5 text-qah-text-muted"><Target size={11} />{status}</span>
            <div className="h-1 bg-qah-border" aria-label={`Progress ${progress}%`}>
              <div className="h-full bg-qah-accent" style={{ width: `${progress}%` }} />
            </div>
            <span>{progress}%</span>
          </div>

          {project.nextAction && (
            <p className="mt-2 truncate text-xs text-qah-text-muted">
              Next: {project.nextAction}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-qah-border pt-2 font-mono text-[9px] uppercase tracking-[0.1em] text-qah-text-subtle sm:grid-cols-[auto_1fr_auto]">
        <span className="flex items-center gap-1.5">
          <Clock size={11} aria-hidden="true" />
          {formatDate(project.modifiedAt)}
        </span>
        <span className="truncate text-right sm:text-left">
          {project.targetDate ? `TARGET ${project.targetDate}` : project.tags.length > 0 ? project.tags.join(" / ") : "NO TARGET"}
        </span>
        <span className="col-span-2 text-right text-qah-accent sm:col-span-1">OPEN RECORD</span>
      </div>
    </button>
  );
}
