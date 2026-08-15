/**
 * BH Studio v1.0 — Decision Archive Skill
 *
 * Skill ID: core.decisionArchive
 * Purpose: Structure a decision, log it, and lock it
 * Auto-Log: Yes
 */

import { z } from "zod";
import type { SkillRequest, SkillResponse, SkillManifest, AIBridge } from "@/types/ai";
import { buildDecisionArchivePrompt } from "@/ai/promptTemplates/decisionArchive";
import { DecisionArchiveOutputSchema } from "./schema";

export const skillManifest = {
  id: "core.decisionArchive",
  name: "Decision Archive",
  category: "core",
  version: "1.0.0",
  description:
    "Structures creative decisions, logs them with rationale, and supports locking.",
  inputSchema: z.object({
    context: z.string(),
    question: z.string(),
    options: z.array(z.string()),
    projectGoal: z.string().optional(),
  }),
  outputSchema: DecisionArchiveOutputSchema,
  requiresProject: true,
  autoLog: true,
} satisfies SkillManifest;

export async function execute(
  request: SkillRequest,
  bridge: AIBridge
): Promise<SkillResponse> {
  const params = skillManifest.inputSchema.parse(request.parameters);

  const prompt = buildDecisionArchivePrompt({
    context: params.context,
    question: params.question,
    options: params.options,
    projectGoal: params.projectGoal,
  });

  const response = await bridge.callStructured(
    { ...request, userPrompt: prompt },
    `Return a JSON object with keys: recommendation (string), rationale (string), rejectedRationale (array of {option: string, reason: string}), risks (array of strings), followUp (string or null)`
  );

  if (response.status === "success" && typeof response.content === "object") {
    try {
      const validated = DecisionArchiveOutputSchema.parse(response.content);
      return { ...response, content: validated };
    } catch (validationError) {
      return {
        skillId: request.skillId,
        status: "partial",
        content: response.content,
        reasoning: validationError instanceof Error ? validationError.message : "Output validation failed",
        cached: false,
      };
    }
  }

  return response;
}
