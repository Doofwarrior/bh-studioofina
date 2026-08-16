/**
 * BH Studio v1.0 — Export Intelligence Skill
 *
 * Skill ID: core.exportIntelligence
 * Purpose: Optimize exports per platform, generate captions/hashtags
 * Auto-Log: No
 */

import { z } from "zod";
import type { SkillRequest, SkillResponse, SkillManifest, AIBridge } from "@/types/ai";
import { buildExportIntelligencePrompt } from "@/ai/promptTemplates/exportIntelligence";
import { ExportIntelligenceOutputSchema } from "./schema";

export const skillManifest = {
  id: "core.exportIntelligence",
  name: "Export Intelligence",
  category: "core",
  version: "1.0.0",
  description:
    "Optimizes content exports for target platforms and generates bilingual captions and hashtags.",
  inputSchema: z.object({
    projectTitle: z.string(),
    contentDescription: z.string(),
    targetPlatforms: z.array(z.string()),
    language: z.enum(["en", "bn", "bilingual"]),
    tone: z.string().optional(),
  }),
  outputSchema: ExportIntelligenceOutputSchema,
  requiresProject: true,
  autoLog: false,
} satisfies SkillManifest;

export async function execute(
  request: SkillRequest,
  bridge: AIBridge
): Promise<SkillResponse> {
  const params = skillManifest.inputSchema.parse(request.parameters);

  const prompt = buildExportIntelligencePrompt({
    projectTitle: params.projectTitle,
    contentDescription: params.contentDescription,
    targetPlatforms: params.targetPlatforms,
    language: params.language,
    tone: params.tone,
  });

  const response = await bridge.callStructured(
    { ...request, userPrompt: prompt },
    `Return a JSON object with keys: captions (object with platform keys like "instagram", "tiktok", etc., each containing {en: string, bn: string}), hashtags (array of strings), platformSpecs (array of {platform: string, recommendedDuration: number, recommendedFormat: string, notes: string}), callToAction ({en: string, bn: string})`
  );

  if (response.status === "success" && typeof response.content === "object") {
    try {
      const validated = ExportIntelligenceOutputSchema.parse(response.content);
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
