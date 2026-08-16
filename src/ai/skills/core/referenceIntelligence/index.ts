/**
 * BH Studio v1.0 — Reference Intelligence Skill
 *
 * Skill ID: core.referenceIntelligence
 * Purpose: Synthesize references, find contradictions, suggest gaps
 * Auto-Log: Yes
 */

import { z } from "zod";
import type { SkillRequest, SkillResponse, SkillManifest, AIBridge } from "@/types/ai";
import { buildReferenceIntelligencePrompt } from "@/ai/promptTemplates/referenceIntelligence";
import { ReferenceIntelligenceOutputSchema } from "./schema";

export const skillManifest = {
  id: "core.referenceIntelligence",
  name: "Reference Intelligence",
  category: "core",
  version: "1.0.0",
  description:
    "Synthesizes project references, identifies contradictions, and suggests research gaps.",
  inputSchema: z.object({
    topic: z.string(),
    references: z.array(z.string()),
    projectGoal: z.string().optional(),
  }),
  outputSchema: ReferenceIntelligenceOutputSchema,
  requiresProject: true,
  autoLog: true,
} satisfies SkillManifest;

export async function execute(
  request: SkillRequest,
  bridge: AIBridge
): Promise<SkillResponse> {
  const params = skillManifest.inputSchema.parse(request.parameters);

  const prompt = buildReferenceIntelligencePrompt({
    topic: params.topic,
    references: params.references,
    projectGoal: params.projectGoal,
  });

  const response = await bridge.callStructured(
    { ...request, userPrompt: prompt },
    `Return a JSON object with keys: summaries (array of {referenceIndex: number, summary: string, relevance: "High"|"Medium"|"Low"}), contradictions (array of {between: string, description: string, severity: "Critical"|"Moderate"|"Minor"}), gaps (array of strings), suggestions (array of strings)`
  );

  if (response.status === "success" && typeof response.content === "object") {
    try {
      const validated = ReferenceIntelligenceOutputSchema.parse(response.content);
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
