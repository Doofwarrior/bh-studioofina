/**
 * BH Studio v1.0 — Visual Director Skill (Islamic)
 *
 * Skill ID: islamic.visualDirector
 * Purpose: Generate shotlists, color arcs, and motion prompts
 * Auto-Log: No
 */

import { z } from "zod";
import type { SkillRequest, SkillResponse, SkillManifest, AIBridge } from "@/types/ai";
import { VisualDirectorOutputSchema } from "./schema";

export const skillManifest = {
  id: "islamic.visualDirector",
  name: "Visual Director",
  category: "islamic",
  version: "1.0.0",
  description:
    "Generates cinematic shotlists, color arcs, and motion prompts for Islamic documentary content.",
  inputSchema: z.object({
    topic: z.string(),
    durationSeconds: z.number().positive(),
    tone: z.string().optional(),
    targetPlatform: z.enum(["instagram", "tiktok", "youtube", "facebook"]).optional(),
    previousDecisions: z.array(z.string()).optional(),
  }),
  outputSchema: VisualDirectorOutputSchema,
  requiresProject: true,
  autoLog: false,
} satisfies SkillManifest;

export async function execute(
  request: SkillRequest,
  bridge: AIBridge
): Promise<SkillResponse> {
  const params = skillManifest.inputSchema.parse(request.parameters);
  const prompt = buildVisualDirectorPrompt(params);

  const response = await bridge.callStructured(
    { ...request, userPrompt: prompt },
    `Return a JSON object with keys: title (string), concept (string), shots (array of {id: string, timestamp: string, duration: number, visualDescription: string, camera: {framing: string, movement: string, focus: string, lighting: string, texture: string}, audio: {layers: array of strings}, onScreenText: {content?: string, font?: string, placement?: string, animation?: string}, emotionalObjective: string, transition: string, colors: {dominant: string, secondary: string, accent: string}}), colorArcs (array of {act: string, dominantColor: string, secondaryColor: string, accentColor: string, mood: string}), globalStyle: {prefix: string, lut?: string, resolution: string, fps: number}, safetyNotes (array of strings)`
  );

  if (response.status === "success" && typeof response.content === "object") {
    try {
      const validated = VisualDirectorOutputSchema.parse(response.content);
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

function buildVisualDirectorPrompt(params: {
  topic: string;
  durationSeconds: number;
  tone?: string;
  targetPlatform?: string;
  previousDecisions?: string[];
}): string {
  const parts = [
    `You are the Visual Director for an Islamic documentary Reel about "${params.topic}".`,
    `Target duration: ${params.durationSeconds} seconds.`,
    `Tone: ${params.tone || "poetic, respectful, cinematic"}.`,
  ];

  if (params.targetPlatform) {
    parts.push(`Target platform: ${params.targetPlatform}.`);
  }

  if (params.previousDecisions?.length) {
    parts.push(`
## Previous Decisions
${params.previousDecisions.join("\n")}`);
  }

  parts.push(`
## Instructions
1. Create a shot-by-shot breakdown (12 shots max for short-form).
2. Define a 3-act color arc with specific hex codes.
3. Specify camera philosophy per act (locked tripod → handheld → static void).
4. Include diegetic sound design (no background music).
5. Apply the 60:30:10 color rule per shot.
6. Include safety notes: avoid blood, weapons, graphic content. Use documentary frame language.
7. Output a global style prefix for AI generation.

Respond in valid JSON matching the described schema.
`);

  return parts.join("\n");
}
