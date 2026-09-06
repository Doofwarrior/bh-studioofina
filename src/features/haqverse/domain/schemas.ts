import { z } from "zod";
import { ContinuityTagSchema } from "./tags";

const id = z.string().min(1);
const timestamp = z.string().datetime();
const stringList = z.array(z.string());

export const HaqVerseContentStatusSchema = z.enum([
  "DRAFT",
  "RESEARCH",
  "SCRIPT",
  "VISUAL",
  "PRODUCTION",
  "REVIEW",
  "READY",
  "ARCHIVED",
]);

export const HaqVerseAssetKindSchema = z.enum(["CHARACTER", "LOCATION", "PROP"]);
export const HaqVerseAssetStatusSchema = z.enum(["DRAFT", "REVIEW", "LOCKED"]);
export const HaqVerseConfidenceSchema = z.enum(["LOW", "MEDIUM", "HIGH", "UNKNOWN"]);
export const HaqVerseGuardrailStatusSchema = z.enum([
  "PASS",
  "WARNING",
  "BLOCK",
  "NOT_APPLICABLE",
]);

export const HaqVerseHistoricalContextSchema = z.object({
  facts: stringList,
  sourceNotes: stringList,
  disputedDetails: stringList,
  unknownDetails: stringList,
  confidence: HaqVerseConfidenceSchema,
});

export const HaqVerseCinematicContextSchema = z.object({
  interpretationNotes: stringList,
  lockedChoices: stringList,
  forbiddenChanges: stringList,
});

export const HaqVerseContentRecordSchema = z.object({
  id,
  projectId: id,
  title: z.string().min(1),
  slug: z.string().min(1).optional(),
  status: HaqVerseContentStatusSchema,
  createdAt: timestamp,
  updatedAt: timestamp,
  topic: z.string().optional(),
  conceptSummary: z.string().optional(),
  scriptReference: z.string().optional(),
  scriptText: z.string().optional(),
  visualBriefReference: z.string().optional(),
  visualBriefSummary: z.string().optional(),
  historical: HaqVerseHistoricalContextSchema.optional(),
  cinematic: HaqVerseCinematicContextSchema.optional(),
  notes: z.string().optional(),
});

export const HaqVerseAssetBaseSchema = z.object({
  id,
  projectId: id,
  contentRecordId: id.optional(),
  kind: HaqVerseAssetKindSchema,
  name: z.string().min(1),
  continuityTag: ContinuityTagSchema,
  status: HaqVerseAssetStatusSchema,
  createdAt: timestamp,
  updatedAt: timestamp,
  notes: z.string().optional(),
});

export const HaqVerseWorldRuleSchema = z.object({
  id,
  projectId: id,
  name: z.string().min(1),
  continuityTag: ContinuityTagSchema,
  status: HaqVerseAssetStatusSchema,
  era: z.string().optional(),
  region: z.string().optional(),
  visualPhilosophy: z.string().optional(),
  palette: stringList.optional(),
  lightingGrammar: z.string().optional(),
  cameraGrammar: z.string().optional(),
  architectureRules: stringList.optional(),
  wardrobeRules: stringList.optional(),
  prohibitedElements: stringList.optional(),
  notes: z.string().optional(),
});

export const HaqVerseMotionRuleSchema = z.object({
  id,
  projectId: id,
  name: z.string().min(1),
  continuityTag: ContinuityTagSchema,
  status: HaqVerseAssetStatusSchema,
  globalVector: z.string().optional(),
  cameraVector: z.string().optional(),
  environmentRelativeVector: z.string().optional(),
  subjectMotionRules: stringList.optional(),
  depthBehavior: z.string().optional(),
  interactionConstraints: stringList.optional(),
  exitBehavior: z.string().optional(),
  prohibitedMotion: stringList.optional(),
  notes: z.string().optional(),
});

export const HaqVerseShotSpecSchema = z.object({
  id,
  projectId: id,
  name: z.string().min(1),
  order: z.number().int().nonnegative(),
  contentRecordId: id.optional(),
  characterAssetIds: z.array(id).optional(),
  locationAssetId: id.optional(),
  propAssetIds: z.array(id).optional(),
  worldRuleId: id.optional(),
  motionRuleId: id.optional(),
  startState: z.string().optional(),
  action: z.string().optional(),
  motionBeat: z.string().optional(),
  endState: z.string().optional(),
  cameraMovement: z.string().optional(),
  lens: z.string().optional(),
  composition: z.string().optional(),
  lighting: z.string().optional(),
  weather: z.string().optional(),
  emotionalBeat: z.string().optional(),
  notes: z.string().optional(),
});

export type HaqVerseContentRecord = z.infer<typeof HaqVerseContentRecordSchema>;
export type HaqVerseAssetBase = z.infer<typeof HaqVerseAssetBaseSchema>;
export type HaqVerseWorldRule = z.infer<typeof HaqVerseWorldRuleSchema>;
export type HaqVerseMotionRule = z.infer<typeof HaqVerseMotionRuleSchema>;
export type HaqVerseShotSpec = z.infer<typeof HaqVerseShotSpecSchema>;
