import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/utils/formatDate";
import type { DecisionEntry } from "@/types/project";
import { Archive, Lock, Unlock } from "lucide-react";

interface DecisionArchiveViewerProps {
  decisions: DecisionEntry[];
}

export function DecisionArchiveViewer({
  decisions,
}: DecisionArchiveViewerProps) {
  if (decisions.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Archive
            size={48}
            className="mb-4 text-[var(--studio-text-subtle)]"
          />
          <h3 className="text-lg font-semibold text-[var(--studio-text)]">
            No Decisions Yet
          </h3>
          <p className="mt-2 text-sm text-[var(--studio-text-muted)]">
            Run the Decision Archive skill to record creative decisions for this
            project.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--studio-text)]">
          Decision Archive
        </h2>
        <Badge>{decisions.length} decision{decisions.length !== 1 ? "s" : ""}</Badge>
      </div>

      <div className="space-y-3">
        {decisions.map((decision) => (
          <Card key={decision.id}>
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--studio-text)]">
                    {decision.question}
                  </p>
                  <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
                    {formatDate(decision.timestamp)}
                  </p>
                </div>
                <Badge variant={decision.locked ? "default" : "warning"}>
                  {decision.locked ? (
                    <>
                      <Lock size={12} className="mr-1" />
                      Locked
                    </>
                  ) : (
                    <>
                      <Unlock size={12} className="mr-1" />
                      Unlocked
                    </>
                  )}
                </Badge>
              </div>

              {/* Context */}
              {decision.context && (
                <div className="rounded-md bg-[var(--studio-surface-elevated)] p-3">
                  <p className="text-xs text-[var(--studio-text-muted)]">
                    {decision.context}
                  </p>
                </div>
              )}

              {/* Selected Option */}
              <div>
                <p className="text-xs font-medium text-[var(--studio-text-muted)]">
                  Selected
                </p>
                <p className="mt-1 text-sm text-[var(--studio-accent)]">
                  {decision.selected}
                </p>
              </div>

              {/* Rationale */}
              <div>
                <p className="text-xs font-medium text-[var(--studio-text-muted)]">
                  Rationale
                </p>
                <p className="mt-1 text-sm text-[var(--studio-text)]">
                  {decision.rationale}
                </p>
              </div>

              {/* Rejected Options */}
              {decision.rejectedRationale.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[var(--studio-text-muted)]">
                    Rejected Options
                  </p>
                  <ul className="mt-1 space-y-1">
                    {decision.rejectedRationale.map((reason, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-[var(--studio-text-muted)]"
                      >
                        • {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Assisted Badge */}
              {decision.aiAssisted && (
                <div className="pt-2">
                  <Badge variant="default">AI Assisted</Badge>
                  {decision.skillId && (
                    <span className="ml-2 text-xs text-[var(--studio-text-subtle)]">
                      {decision.skillId}
                    </span>
                  )}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
