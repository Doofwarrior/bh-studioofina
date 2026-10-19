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

const CharacterHistoricalProfileSchema = z.object({
  era: z.string().optional(), region: z.string().optional(), role: z.string().optional(), approximateAge: z.string().optional(),
});
const CharacterCinematicProfileSchema = z.object({
  build: z.string().optional(), heightImpression: z.string().optional(), silhouette: z.string().optional(), facialTreatment: z.string().optional(), hair: z.string().optional(), beard: z.string().optional(), headwear: z.string().optional(), innerGarment: z.string().optional(), outerGarment: z.string().optional(), lowerGarment: z.string().optional(), footwear: z.string().optional(), armor: z.string().optional(), weapons: z.string().optional(), accessories: z.string().optional(), materials: stringList.optional(), primaryColors: stringList.optional(), secondaryColors: stringList.optional(), weathering: z.string().optional(), recurringMotif: z.string().optional(),
});
const DepictionSchema = z.object({
  figureType: z.string().optional(), facePolicy: z.string().optional(), dignityRequirements: stringList.optional(), modestyRequirements: stringList.optional(), sensitivityNotes: stringList.optional(),
});
const LocationHistoricalProfileSchema = z.object({
  era: z.string().optional(), dateRange: z.string().optional(), region: z.string().optional(), modernEquivalent: z.string().optional(),
});
const LocationEnvironmentSchema = z.object({
  environmentType: z.string().optional(), terrain: z.string().optional(), groundTexture: z.string().optional(), architecture: z.string().optional(), constructionMaterials: stringList.optional(), vegetation: z.string().optional(), climate: z.string().optional(), weatherDefaults: z.string().optional(), atmosphere: z.string().optional(), lightingRecipe: z.string().optional(), populationRules: stringList.optional(), recurringProps: stringList.optional(), primaryPalette: stringList.optional(), secondaryPalette: stringList.optional(), prohibitedElements: stringList.optional(),
});
const PropHistoricalProfileSchema = z.object({ era: z.string().optional(), region: z.string().optional(), historicalEvidence: stringList.optional() });
const PropCinematicContinuitySchema = z.object({
  objectCategory: z.string().optional(), owner: z.string().optional(), materials: stringList.optional(), apparentScale: z.string().optional(), shape: z.string().optional(), color: z.string().optional(), decorativeDetails: z.string().optional(), wear: z.string().optional(), damage: z.string().optional(), continuityLock: z.string().optional(), forbiddenVariations: stringList.optional(), firstAppearance: z.string().optional(), recurringAppearances: stringList.optional(),
});

export const HaqVerseCharacterAssetSchema = HaqVerseAssetBaseSchema.extend({
  kind: z.literal("CHARACTER"), historicalProfile: CharacterHistoricalProfileSchema.optional(), cinematicProfile: CharacterCinematicProfileSchema.optional(), depiction: DepictionSchema.optional(), historical: HaqVerseHistoricalContextSchema.optional(), cinematic: HaqVerseCinematicContextSchema.optional(),
});
export const HaqVerseLocationAssetSchema = HaqVerseAssetBaseSchema.extend({
  kind: z.literal("LOCATION"), historicalProfile: LocationHistoricalProfileSchema.optional(), cinematicEnvironment: LocationEnvironmentSchema.optional(), historical: HaqVerseHistoricalContextSchema.optional(), cinematic: HaqVerseCinematicContextSchema.optional(),
});
export const HaqVersePropAssetSchema = HaqVerseAssetBaseSchema.extend({
  kind: z.literal("PROP"), historicalProfile: PropHistoricalProfileSchema.optional(), cinematicContinuity: PropCinematicContinuitySchema.optional(), narrativeMeaning: z.string().optional(), historical: HaqVerseHistoricalContextSchema.optional(), cinematic: HaqVerseCinematicContextSchema.optional(),
});

export const HaqVerseVisualAssetSchema = z.discriminatedUnion("kind", [
  HaqVerseCharacterAssetSchema,
  HaqVerseLocationAssetSchema,
  HaqVersePropAssetSchema,
]);

export const HaqVerseWorldRuleSchema = z.object({
  id,
  projectId: id,
  name: z.string().min(1),
  continuityTag: ContinuityTagSchema,
  status: HaqVerseAssetStatusSchema,
  createdAt: timestamp,
  updatedAt: timestamp,
  era: z.string().optional(),
  region: z.string().optional(),
  productionContext: z.string().optional(),
  description: z.string().optional(),
  visualPhilosophy: z.string().optional(),
  primaryPalette: stringList.optional(),
  secondaryPalette: stringList.optional(),
  contrastGrammar: z.string().optional(),
  textureGrammar: z.string().optional(),
  lightingGrammar: z.string().optional(),
  lensGrammar: z.string().optional(),
  cameraGrammar: z.string().optional(),
  atmosphereGrammar: z.string().optional(),
  architectureRules: stringList.optional(),
  wardrobeRules: stringList.optional(),
  propRules: stringList.optional(),
  environmentRules: stringList.optional(),
  permittedStylization: stringList.optional(),
  prohibitedElements: stringList.optional(),
  prohibitedCliches: stringList.optional(),
  notes: z.string().optional(),
});

export const HaqVerseMotionReferenceFrameSchema = z.enum(["WORLD", "CAMERA", "SUBJECT", "RELATIVE"]);
export const HaqVerseCameraCategorySchema = z.enum(["STATIC", "PAN_TILT", "DOLLY_ZOOM", "TRACKING_CRANE", "HANDHELD_SPECIALTY", "AERIAL", "CUSTOM"]);
export const HaqVerseMotionVectorSchema = z.object({
  value: z.string().min(1),
  referenceFrame: HaqVerseMotionReferenceFrameSchema,
});
export const HaqVerseSubjectMotionRuleSchema = z.object({
  subjectReference: z.string().min(1),
  initialRelationshipToCamera: z.string().optional(),
  direction: HaqVerseMotionVectorSchema.optional(),
  relativeSpeed: z.string().optional(),
  depthTrajectory: z.string().optional(),
  scaleBehavior: z.string().optional(),
  allowedMotion: stringList.optional(),
  prohibitedMotion: stringList.optional(),
  notes: z.string().optional(),
});

export const HaqVerseMotionRuleSchema = z.object({
  id,
  projectId: id,
  name: z.string().min(1),
  continuityTag: ContinuityTagSchema,
  status: HaqVerseAssetStatusSchema,
  createdAt: timestamp,
  updatedAt: timestamp,
  globalVector: HaqVerseMotionVectorSchema.optional(),
  cameraVector: HaqVerseMotionVectorSchema.optional(),
  environmentRelativeVector: HaqVerseMotionVectorSchema.optional(),
  subjectMotionRules: z.array(HaqVerseSubjectMotionRuleSchema).optional(),
  depthBehavior: stringList.optional(),
  interactionConstraints: stringList.optional(),
  exitBehavior: stringList.optional(),
  prohibitedMotion: stringList.optional(),
  notes: z.string().optional(),
});

export const HaqVerseCameraMovementSchema = z.object({
  id,
  projectId: id,
  name: z.string().min(1),
  continuityTag: ContinuityTagSchema,
  status: HaqVerseAssetStatusSchema,
  category: HaqVerseCameraCategorySchema,
  movementType: z.string().min(1),
  movementDirection: z.string().optional(),
  movementSpeed: z.string().optional(),
  movementIntensity: z.string().optional(),
  stabilization: z.string().optional(),
  cameraPath: z.string().optional(),
  subjectRelationship: z.string().optional(),
  shotSize: z.string().optional(),
  cameraAngle: z.string().optional(),
  subjectPosition: z.string().optional(),
  compositionNotes: z.string().optional(),
  lens: z.string().optional(),
  focalLength: z.string().optional(),
  focusBehavior: z.string().optional(),
  depthOfField: z.string().optional(),
  emotionalEffect: z.string().optional(),
  narrativePurpose: z.string().optional(),
  bestUsedFor: z.string().optional(),
  avoidWhen: z.string().optional(),
  referenceFrame: HaqVerseMotionReferenceFrameSchema.optional(),
  compatibleGlobalVectors: stringList.optional(),
  incompatibleMotionNotes: z.string().optional(),
  notes: z.string().optional(),
  createdAt: timestamp,
  updatedAt: timestamp,
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
export type HaqVerseCameraMovement = z.infer<typeof HaqVerseCameraMovementSchema>;
export type HaqVerseShotSpec = z.infer<typeof HaqVerseShotSpecSchema>;
export type HaqVerseCharacterAsset = z.infer<typeof HaqVerseCharacterAssetSchema>;
export type HaqVerseLocationAsset = z.infer<typeof HaqVerseLocationAssetSchema>;
export type HaqVersePropAsset = z.infer<typeof HaqVersePropAssetSchema>;
export type HaqVerseVisualAsset = z.infer<typeof HaqVerseVisualAssetSchema>;
