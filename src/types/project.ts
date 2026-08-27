import { z } from "zod";

// ───────────────────────────────────────────
// Project Manifest
// ───────────────────────────────────────────

export const ProjectStatusSchema = z.enum([
  "active",
  "paused",
  "blocked",
  "completed",
]);

export const ProjectManifestSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  type: z.enum(["content", "research", "product", "custom"]),
  description: z.string().optional(),
  createdAt: z.string().datetime(),
  modifiedAt: z.string().datetime(),
  version: z.literal("1.0"),
  settings: z.object({
    defaultExportFormat: z.string(),
    colorPalette: z.string().optional(),
    aiModelPreference: z.string().optional(),
  }),
  tags: z.array(z.string()),
  status: ProjectStatusSchema.optional(),
  progress: z.number().int().min(0).max(100).optional(),
  nextAction: z.string().max(240).optional(),
  targetDate: z.string().optional(),
});

export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
export type ProjectManifest = z.infer<typeof ProjectManifestSchema>;

// ───────────────────────────────────────────
// Decision Entry
// ───────────────────────────────────────────

export const DecisionEntrySchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  context: z.string(),
  question: z.string(),
  options: z.array(z.string()),
  selected: z.string(),
  rationale: z.string(),
  rejectedRationale: z.array(z.string()),
  locked: z.boolean(),
  aiAssisted: z.boolean(),
  skillId: z.string().optional(),
});

export type DecisionEntry = z.infer<typeof DecisionEntrySchema>;

// ───────────────────────────────────────────
// Prompt Asset
// ───────────────────────────────────────────

export const PromptIterationSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  changeNote: z.string(),
  diff: z.string(),
});

export type PromptIteration = z.infer<typeof PromptIterationSchema>;

export const PromptAssetSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  version: z.number().int().positive(),
  content: z.string(),
  tags: z.array(z.string()),
  projectId: z.string().uuid(),
  skillId: z.string().optional(),
  metadata: z.object({
    model: z.string(),
    temperature: z.number(),
    maxTokens: z.number(),
    createdAt: z.string().datetime(),
    modifiedAt: z.string().datetime(),
  }),
  iterations: z.array(PromptIterationSchema),
});

export type PromptAsset = z.infer<typeof PromptAssetSchema>;