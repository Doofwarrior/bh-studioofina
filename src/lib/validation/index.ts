/**
 * BH Studio v1.0 — Validation Schemas
 *
 * Single source of truth for all Zod schemas.
 * Re-exported from types/ for runtime validation.
 */

export {
  SkillRequestSchema,
  SkillResponseSchema,
  SkillManifestSchema,
  type SkillRequest,
  type SkillResponse,
  type SkillManifest,
  type SkillRegistryEntry,
  type SkillExecutor,
} from "@/types/ai";

export {
  ProjectManifestSchema,
  DecisionEntrySchema,
  PromptAssetSchema,
  PromptIterationSchema,
  type ProjectManifest,
  type DecisionEntry,
  type PromptAsset,
  type PromptIteration,
} from "@/types/project";

export {
  ExportPackageSchema,
  BilingualTextSchema,
  PlatformVersionSchema,
  type ExportPackage,
  type BilingualText,
  type PlatformVersion,
} from "@/types/export";
