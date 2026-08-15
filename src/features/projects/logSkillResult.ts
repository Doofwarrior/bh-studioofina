import { appendDecision, writeFile } from "@/lib/storage";
import {
  DecisionEntrySchema,
  type DecisionEntry,
} from "@/types/project";
import type { SkillRegistryEntry, SkillResponse } from "@/types/ai";
import { DecisionArchiveOutputSchema } from "@/ai/skills/core/decisionArchive/schema";

export type PersistOutcome = "saved" | "limited" | "failed";

// Orchestration over EXISTING storage functions for skills that declare
// `autoLog: true` in their manifest. No new persistence layer is introduced.
//
// Only the two currently-registered autoLog skills have concrete handlers:
//   - core.decisionArchive   → appendDecision (project decisions folder)
//   - core.referenceIntelligence → writeFile (project research folder)
//
// execute() may return a `partial` response. For decisionArchive we require the
// contract-valid output; if a partial response lacks required fields we report
// "limited" rather than fabricating values. Reference output is persisted as-is.
export async function logSkillResult(
  entry: SkillRegistryEntry,
  projectSlug: string,
  parameters: Record<string, unknown>,
  response: SkillResponse
): Promise<PersistOutcome> {
  if (response.status === "error") return "failed";

  try {
    if (entry.manifest.id === "core.decisionArchive") {
      return await logDecision(projectSlug, parameters, response);
    }
    if (entry.manifest.id === "core.referenceIntelligence") {
      return await logReference(projectSlug, response);
    }
    return "failed";
  } catch {
    return "failed";
  }
}

async function logDecision(
  projectSlug: string,
  parameters: Record<string, unknown>,
  response: SkillResponse
): Promise<PersistOutcome> {
  const parsed = DecisionArchiveOutputSchema.safeParse(response.content);
  if (!parsed.success) {
    // Partial/incomplete response: required fields missing — do not fabricate.
    return "limited";
  }
  const out = parsed.data;

  const context = typeof parameters.context === "string" ? parameters.context : "";
  const question =
    typeof parameters.question === "string" ? parameters.question : "";
  const options = Array.isArray(parameters.options)
    ? parameters.options.map(String)
    : [];

  const record: DecisionEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    context,
    question,
    options,
    selected: out.recommendation,
    rationale: out.rationale,
    rejectedRationale: out.rejectedRationale.map(
      (r) => `${r.option}: ${r.reason}`
    ),
    locked: false,
    aiAssisted: true,
    skillId: "core.decisionArchive",
  };

  // Validates against the existing DecisionEntry contract (no weakening).
  DecisionEntrySchema.parse(record);
  await appendDecision(projectSlug, record);
  return "saved";
}

async function logReference(
  projectSlug: string,
  response: SkillResponse
): Promise<PersistOutcome> {
  const text =
    typeof response.content === "object" && response.content !== null
      ? JSON.stringify(response.content, null, 2)
      : String(response.content);

  const filename = `reference-intelligence-${Date.now()}.json`;
  await writeFile(projectSlug, "research", filename, text);
  return "saved";
}
