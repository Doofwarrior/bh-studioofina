import { Badge } from "@/components/ui/Badge";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { backupStatus, runBackup } from "@/lib/storage/applicationBackup";
import {
  backupWorkspace,
  configureSecondaryBackup,
  secondaryBackupFolder,
} from "@/lib/storage";

export function BackupSettings() {
  const [status, setStatus] = useState(backupStatus),
    [busy, setBusy] = useState(false),
    [secondary, setSecondary] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    const update = () => setStatus(backupStatus());
    window.addEventListener("storage", update);
    window.addEventListener("qah:backup-status", update);
    secondaryBackupFolder()
      .then((h) => setSecondary(h?.name ?? ""))
      .catch((e) => setError(String(e)));
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("qah:backup-status", update);
    };
  }, []);
  async function destination(enable: boolean) {
    try {
      setSecondary((await configureSecondaryBackup(enable)) ?? "");
      setError("");
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <Card
      title="Application backups"
      subtitle="Daily while QAL’AT is open and the workspace is writable"
    >
      <div className="space-y-3 text-sm">
        <p><a href="/settings?recover">Restore application data</a> · Close other QAL’AT tabs before recovery.</p>
        <p>
          Primary destination · {backupWorkspace()?.name ?? "Disconnected"} /
          Qalat Backups
        </p>
        <p>
          Includes this browser’s QAL’AT records and files under projects/,
          including copied references. External files, other workspace folders
          and browser permissions are excluded.
        </p>
        <p>
          Retains the latest verified copy for 7 days, 4 weeks and 12 months of
          available history (UTC).
        </p>
        <p>
          Last verified ·{" "}
          {status.last
            ? new Date(status.last.date).toLocaleString() +
              " · " +
              status.last.destinations.join(", ")
            : "None"}
        </p>
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await runBackup();
            } catch (e) {
              setError(String(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Backing up…" : "Backup Now"}
        </Button>
        <div role="status">{busy && <Badge variant="processing">Backup in progress</Badge>}</div>
        <p>Secondary destination · {secondary || "None"}</p>
        <Button onClick={() => destination(true)}>
          Choose secondary folder
        </Button>{" "}
        {secondary && (
          <Button onClick={() => destination(false)}>
            Remove secondary destination
          </Button>
        )}
        {(status.error || error) && <p role="alert"><Badge variant="danger">{status.error || error}</Badge></p>}
      </div>
    </Card>
  );
}
