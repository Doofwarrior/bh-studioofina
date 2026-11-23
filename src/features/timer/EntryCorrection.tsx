import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Entry, Correction } from "@/lib/workTimer";

function civil(ms: number) {
  const d = new Date(ms);
  return new Date(ms - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, -1);
}
// Compare local fields as UTC to preserve the original instant in a repeated
// DST hour. Reject new values that the local clock would silently roll forward.
function timestamp(text: string, original: number) {
  const fields = Date.parse(text + "Z");
  if (fields === Date.parse(civil(original) + "Z")) return original;
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) && fields === Date.parse(civil(parsed) + "Z")
    ? parsed
    : NaN;
}
export function EntryCorrection({
  entry,
  save,
}: {
  entry: Entry;
  save: (a: Correction) => Promise<string | undefined>;
}) {
  const [base, setBase] = useState<Entry>();
  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [at, setAt] = useState("");
  const [error, setError] = useState("");
  function open() {
    setBase(entry);
    setFrom(civil(entry.from));
    setTo(civil(entry.to));
    setAt(civil(Math.floor((entry.from + entry.to) / 2)));
    setError("");
  }
  if (!base)
    return (
      <Button size="sm" variant="ghost" onClick={open}>
        Correct entry
      </Button>
    );
  async function submit(operation: "edit" | "split" | "remove") {
    if (!base) return;
    if (
      operation === "remove" &&
      !window.confirm("Remove this time record and subtract its duration?")
    )
      return;
    const ref = {
      type: "correct" as const,
      id: base.id,
      projectId: base.target.projectId,
      revision: base.correction?.revision,
    };
    const result = await save(
      operation === "edit"
        ? {
            ...ref,
            operation,
            from: timestamp(from, base.from),
            to: timestamp(to, base.to),
          }
        : operation === "split"
          ? {
              ...ref,
              operation,
              at: timestamp(at, Math.floor((base.from + base.to) / 2)),
            }
          : { ...ref, operation },
    );
    if (result) setError(result);
    else setBase(undefined);
  }
  const field = "border border-qah-border bg-qah-bg p-1";
  return (
    <fieldset className="my-2 flex flex-wrap items-end gap-2 border border-qah-border p-2">
      <legend>Correct time record</legend>
      <label>
        Recorded start{" "}
        <input
          className={field}
          type="datetime-local"
          step="0.001"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </label>
      <label>
        Recorded end{" "}
        <input
          className={field}
          type="datetime-local"
          step="0.001"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </label>
      <Button size="sm" onClick={() => void submit("edit")}>
        Save interval
      </Button>
      <label>
        Split at{" "}
        <input
          className={field}
          type="datetime-local"
          step="0.001"
          value={at}
          onChange={(e) => setAt(e.target.value)}
        />
      </label>
      <Button size="sm" onClick={() => void submit("split")}>
        Split entry
      </Button>
      <Button size="sm" variant="danger" onClick={() => void submit("remove")}>
        Remove entry
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setBase(undefined)}>
        Cancel
      </Button>
      {error && <p role="alert">{error}</p>}
    </fieldset>
  );
}
