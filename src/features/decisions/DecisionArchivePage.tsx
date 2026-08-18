import { useEffect, useState } from "react";
import { readDecisions } from "@/lib/storage";
import { DecisionArchiveViewer } from "./DecisionArchiveViewer";
import type { DecisionEntry } from "@/types/project";

interface DecisionArchivePageProps {
  projectSlug: string;
}

export function DecisionArchivePage({ projectSlug }: DecisionArchivePageProps) {
  const [decisions, setDecisions] = useState<DecisionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadDecisions() {
      try {
        setLoading(true);
        setError(null);
        const result = await readDecisions(projectSlug);
        if (mounted) {
          setDecisions(result);
        }
      } catch (err) {
        console.error("[DecisionArchive] Failed to load decisions:", err);
        if (mounted) {
          setError("Failed to load decisions");
          setDecisions([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDecisions();

    return () => {
      mounted = false;
    };
  }, [projectSlug]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--studio-text-muted)]">
        <p>Loading decisions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--studio-danger)]">
        <p>{error}</p>
      </div>
    );
  }

  return <DecisionArchiveViewer decisions={decisions} />;
}
