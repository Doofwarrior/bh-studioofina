import { z } from "zod";
import type { OllamaModel } from "./ollama";

// ───────────────────────────────────────────
// AI Bridge Interface
// ───────────────────────────────────────────

export interface AIBridge {
  call(request: SkillRequest): Promise<SkillResponse>;
  callStructured(
    request: SkillRequest,
    schemaDescription: string
  ): Promise<SkillResponse>;
  checkConnection(): Promise<{
    ok: boolean;
    models?: OllamaModel[];
    error?: string;
  }>;
}

// ───────────────────────────────────────────
// Skill Request
// ───────────────────────────────────────────

export const SkillRequestSchema = z.object({
  skillId: z.string(),
  projectId: z.string(),
  userPrompt: z.string(),
  context: z
    .object({
      references: z.array(z.string()).optional(),
      previousDecisions: z.array(z.string()).optional(),
      activeScript: z.string().optional(),
    })
    .optional(),
  parameters: z.record(z.unknown()).optional(),
});

export type SkillRequest = z.infer<typeof SkillRequestSchema>;

// ───────────────────────────────────────────
// Skill Response
// ───────────────────────────────────────────

export const SkillResponseSchema = z.object({
  skillId: z.string(),
  status: z.enum(["success", "error", "partial"]),
  content: z.unknown(),
  reasoning: z.string().optional(),
  tokensUsed: z.number().optional(),
  latencyMs: z.number().optional(),
  cached: z.boolean(),
});

export type SkillResponse = z.infer<typeof SkillResponseSchema>;

// ───────────────────────────────────────────
// Skill Manifest
// ───────────────────────────────────────────

export const SkillManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(["core", "islamic"]),
  version: z.string(),
  description: z.string(),
  inputSchema: z.instanceof(z.ZodType),
  outputSchema: z.instanceof(z.ZodType),
  requiresProject: z.boolean(),
  autoLog: z.boolean(),
});

export type SkillManifest = z.infer<typeof SkillManifestSchema>;

// ───────────────────────────────────────────
// Skill Registry Entry
// ───────────────────────────────────────────

export type SkillExecutor = (
  request: SkillRequest,
  bridge: AIBridge
) => Promise<SkillResponse>;

export interface SkillRegistryEntry {
  manifest: SkillManifest;
  execute: SkillExecutor;
}
