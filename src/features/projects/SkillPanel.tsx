import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { listSkills } from "@/ai/skills";
import { useSkill } from "@/hooks/useSkill";
import type { SkillRegistryEntry } from "@/types/ai";
import type { ZodType } from "zod";
import { logSkillResult, type PersistOutcome } from "./logSkillResult";

interface FieldDef {
  name: string;
  kind: "string" | "number" | "enum" | "array";
  optional: boolean;
  values?: string[];
}

// Read-only introspection of a skill's EXISTING input schema to render a form.
// No skill internals are modified; we only read the published input contract.
// We peel Zod wrappers (Optional/Nullable/Default/Effects) to classify each
// field by its base type.
type AnyZod = ZodType & {
  shape?: Record<string, AnyZod>;
  _def?: {
    shape?: Record<string, AnyZod>;
    typeName?: string;
    innerType?: AnyZod;
    schema?: AnyZod;
    values?: string[];
  };
};

function getShape(schema: AnyZod): Record<string, AnyZod> | undefined {
  return schema?.shape ?? schema?._def?.shape;
}

function peel(schema: AnyZod | undefined): {
  base: AnyZod | undefined;
  optional: boolean;
} {
  let cur = schema;
  let optional = false;
  while (cur?._def) {
    const typeName = cur._def.typeName;
    if (
      typeName === "ZodOptional" ||
      typeName === "ZodNullable" ||
      typeName === "ZodDefault"
    ) {
      optional = true;
      cur = cur._def.innerType;
    } else if (typeName === "ZodEffects") {
      cur = cur._def.schema ?? cur._def.innerType;
    } else {
      break;
    }
  }
  return { base: cur, optional };
}

function classify(base: AnyZod | undefined): {
  kind: FieldDef["kind"];
  values?: string[];
} {
  const typeName = base?._def?.typeName;
  if (typeName === "ZodNumber") return { kind: "number" };
  if (typeName === "ZodEnum")
    return { kind: "enum", values: base?._def?.values };
  if (typeName === "ZodArray") return { kind: "array" };
  return { kind: "string" };
}

function deriveFields(inputSchema: ZodType): FieldDef[] {
  const shape = getShape(inputSchema as AnyZod);
  if (!shape) return [];
  return Object.keys(shape).map((name) => {
    const { base, optional } = peel(shape[name]);
    const { kind, values } = classify(base);
    return { name, kind, optional, values };
  });
}

interface SkillFormProps {
  entry: SkillRegistryEntry;
  projectId: string;
  projectSlug: string;
}

function SkillForm({ entry, projectId, projectSlug }: SkillFormProps) {
  const fields = useMemo(
    () => deriveFields(entry.manifest.inputSchema),
    [entry]
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const [persistState, setPersistState] = useState<PersistOutcome | "idle" | "persisting">(
    "idle"
  );
  const { isLoading, error, response, execute } = useSkill(entry.manifest.id);

  const requiredMissing = fields.some(
    (f) => !f.optional && !(values[f.name] ?? "").trim()
  );
  const canRun = !!projectId && !isLoading && !requiredMissing;

  const handleRun = async () => {
    const parameters: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = (values[f.name] ?? "").trim();
      if (!raw && f.optional) continue;
      if (f.kind === "number") parameters[f.name] = Number(raw);
      else if (f.kind === "array")
        parameters[f.name] = raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      else parameters[f.name] = raw;
    }
    setPersistState("idle");
    try {
      const res = await execute({
        projectId,
        userPrompt: `Run ${entry.manifest.name}`,
        parameters,
      });
      // Only auto-log skills that declare autoLog:true in their manifest.
      if (res && res.status !== "error" && entry.manifest.autoLog) {
        setPersistState("persisting");
        const outcome = await logSkillResult(
          entry,
          projectSlug,
          parameters,
          res
        );
        setPersistState(outcome);
      }
    } catch {
      // Execution error: hook error state is shown; nothing to persist.
    }
  };

  return (
    <>
      {fields.map((f) => (
        <div key={f.name} className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--studio-text-muted)]">
            {f.name}
            {f.optional ? "" : " *"}
          </label>
          {f.kind === "enum" ? (
            <select
              value={values[f.name] ?? ""}
              onChange={(e) =>
                setValues((v) => ({ ...v, [f.name]: e.target.value }))
              }
              className="w-full rounded-md border bg-[var(--studio-surface)] px-3 py-2 text-sm text-[var(--studio-text)] focus:outline-none focus:ring-1 focus:ring-[var(--studio-accent)]"
            >
              <option value="">Select…</option>
              {f.values?.map((val) => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </select>
          ) : f.kind === "array" ? (
            <textarea
              value={values[f.name] ?? ""}
              onChange={(e) =>
                setValues((v) => ({ ...v, [f.name]: e.target.value }))
              }
              placeholder="Comma-separated values"
              rows={2}
              className="w-full rounded-md border bg-[var(--studio-surface)] px-3 py-2 text-sm text-[var(--studio-text)] focus:outline-none focus:ring-1 focus:ring-[var(--studio-accent)]"
            />
          ) : (
            <Input
              value={values[f.name] ?? ""}
              onChange={(e) =>
                setValues((v) => ({ ...v, [f.name]: e.target.value }))
              }
              type={f.kind === "number" ? "number" : "text"}
              placeholder={f.kind === "number" ? "e.g., 60" : f.name}
            />
          )}
        </div>
      ))}

      <div className="flex items-center gap-3">
        <Button onClick={handleRun} disabled={!canRun}>
          {isLoading ? "Running…" : "Run Skill"}
        </Button>
        {!projectId && (
          <span className="text-xs text-[var(--studio-danger)]">
            No active project.
          </span>
        )}
      </div>

      {error && (
        <p className="text-sm text-[var(--studio-danger)]">{error}</p>
      )}

      {response && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Status:{" "}
            <span
              className={
                response.status === "success"
                  ? "text-green-400"
                  : response.status === "error"
                  ? "text-[var(--studio-danger)]"
                  : "text-amber-400"
              }
            >
              {response.status}
            </span>
            {response.latencyMs != null && ` (${response.latencyMs}ms)`}
          </p>
          {response.status === "error" &&
            typeof response.content === "object" && (
              <p className="text-sm text-[var(--studio-danger)]">
                {(
                  response.content as { error?: string; message?: string }
                ).error ??
                  (response.content as { message?: string }).message}
              </p>
            )}
          {typeof response.content === "object" ? (
            <pre className="max-h-80 overflow-auto rounded-md border bg-[var(--studio-surface-elevated)] p-3 text-xs">
              {JSON.stringify(response.content, null, 2)}
            </pre>
          ) : (
            <p className="whitespace-pre-wrap text-sm">
              {String(response.content)}
            </p>
          )}
        </div>
      )}

      {persistState !== "idle" && (
        <p
          className={
            persistState === "persisting"
              ? "text-sm text-[var(--studio-text-muted)]"
              : persistState === "saved"
              ? "text-sm text-green-400"
              : persistState === "limited"
              ? "text-sm text-amber-400"
              : "text-sm text-[var(--studio-danger)]"
          }
        >
          {persistState === "persisting" && "Saving result to project…"}
          {persistState === "saved" &&
            "Result saved to this project (auto-logged)."}
          {persistState === "limited" &&
            "Result received but could not be fully saved (incomplete data). Shown above."}
          {persistState === "failed" &&
            "Execution succeeded, but saving the result to the project failed."}
        </p>
      )}
    </>
  );
}

interface SkillPanelProps {
  projectId: string;
  projectSlug: string;
}

export function SkillPanel({ projectId, projectSlug }: SkillPanelProps) {
  const skills = useMemo(() => listSkills(), []);
  const [selectedId, setSelectedId] = useState(
    skills[0]?.manifest.id ?? ""
  );
  const selected: SkillRegistryEntry | undefined =
    skills.find((s) => s.manifest.id === selectedId) ?? skills[0];

  if (!selected) {
    return (
      <Card title="AI Skills">
        <p className="text-sm text-[var(--studio-text-muted)]">
          No skills available.
        </p>
      </Card>
    );
  }

  return (
    <Card
      title="AI Skills"
      subtitle="Run a registered skill against this project"
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--studio-text-muted)]">
            Skill
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full rounded-md border bg-[var(--studio-surface)] px-3 py-2 text-sm text-[var(--studio-text)] focus:outline-none focus:ring-1 focus:ring-[var(--studio-accent)]"
          >
            {skills.map((s) => (
              <option key={s.manifest.id} value={s.manifest.id}>
                {s.manifest.name} — {s.manifest.description}
              </option>
            ))}
          </select>
        </div>

        {/* key isolates execution state per skill and resets on switch */}
        <SkillForm
          key={selected.manifest.id}
          entry={selected}
          projectId={projectId}
          projectSlug={projectSlug}
        />

        {projectId && (
          <p className="text-xs text-[var(--studio-text-subtle)]">
            Project: {projectId.slice(0, 8)}…
          </p>
        )}
      </div>
    </Card>
  );
}
