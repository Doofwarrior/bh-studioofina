import type { ContinuityTag } from "./tags";

export type HaqVerseContentRecordId = string;
export type HaqVerseAssetId = string;
export type HaqVerseWorldRuleId = string;
export type HaqVerseMotionRuleId = string;
export type HaqVerseShotId = string;

export type HaqVerseContentStatus =
  | "DRAFT"
  | "RESEARCH"
  | "SCRIPT"
  | "VISUAL"
  | "PRODUCTION"
  | "REVIEW"
  | "READY"
  | "ARCHIVED";

export type HaqVerseAssetKind = "CHARACTER" | "LOCATION" | "PROP";
export type HaqVerseAssetStatus = "DRAFT" | "REVIEW" | "LOCKED";
export type HaqVerseConfidence = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
export type HaqVerseGuardrailStatus =
  | "PASS"
  | "WARNING"
  | "BLOCK"
  | "NOT_APPLICABLE";

export interface HaqVerseHistoricalContext {
  facts: string[];
  sourceNotes: string[];
  disputedDetails: string[];
  unknownDetails: string[];
  confidence: HaqVerseConfidence;
}

export interface HaqVerseCinematicContext {
  interpretationNotes: string[];
  lockedChoices: string[];
  forbiddenChanges: string[];
}

export interface HaqVerseContentRecord {
  id: HaqVerseContentRecordId;
  projectId: string;
  title: string;
  slug?: string;
  status: HaqVerseContentStatus;
  createdAt: string;
  updatedAt: string;
  topic?: string;
  conceptSummary?: string;
  scriptReference?: string;
  scriptText?: string;
  visualBriefReference?: string;
  visualBriefSummary?: string;
  historical?: HaqVerseHistoricalContext;
  cinematic?: HaqVerseCinematicContext;
  notes?: string;
}

export interface HaqVerseAssetBase {
  id: HaqVerseAssetId;
  projectId: string;
  contentRecordId?: HaqVerseContentRecordId;
  kind: HaqVerseAssetKind;
  name: string;
  continuityTag: ContinuityTag;
  status: HaqVerseAssetStatus;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface HaqVerseCharacterAsset extends HaqVerseAssetBase {
  kind: "CHARACTER";
  historicalProfile?: {
    era?: string;
    region?: string;
    role?: string;
    approximateAge?: string;
  };
  cinematicProfile?: {
    build?: string;
    heightImpression?: string;
    silhouette?: string;
    facialTreatment?: string;
    hair?: string;
    beard?: string;
    headwear?: string;
    innerGarment?: string;
    outerGarment?: string;
    lowerGarment?: string;
    footwear?: string;
    armor?: string;
    weapons?: string;
    accessories?: string;
    materials?: string[];
    primaryColors?: string[];
    secondaryColors?: string[];
    weathering?: string;
    recurringMotif?: string;
  };
  depiction?: {
    figureType?: string;
    facePolicy?: string;
    dignityRequirements?: string[];
    modestyRequirements?: string[];
    sensitivityNotes?: string[];
  };
  historical?: HaqVerseHistoricalContext;
  cinematic?: HaqVerseCinematicContext;
}

export interface HaqVerseLocationAsset extends HaqVerseAssetBase {
  kind: "LOCATION";
  historicalProfile?: {
    era?: string;
    dateRange?: string;
    region?: string;
    modernEquivalent?: string;
  };
  cinematicEnvironment?: {
    environmentType?: string;
    terrain?: string;
    groundTexture?: string;
    architecture?: string;
    constructionMaterials?: string[];
    vegetation?: string;
    climate?: string;
    weatherDefaults?: string;
    atmosphere?: string;
    lightingRecipe?: string;
    populationRules?: string[];
    recurringProps?: string[];
    primaryPalette?: string[];
    secondaryPalette?: string[];
    prohibitedElements?: string[];
  };
  historical?: HaqVerseHistoricalContext;
  cinematic?: HaqVerseCinematicContext;
}

export interface HaqVersePropAsset extends HaqVerseAssetBase {
  kind: "PROP";
  historicalProfile?: {
    era?: string;
    region?: string;
    historicalEvidence?: string[];
  };
  cinematicContinuity?: {
    objectCategory?: string;
    owner?: string;
    materials?: string[];
    apparentScale?: string;
    shape?: string;
    color?: string;
    decorativeDetails?: string;
    wear?: string;
    damage?: string;
    continuityLock?: string;
    forbiddenVariations?: string[];
    firstAppearance?: string;
    recurringAppearances?: string[];
  };
  narrativeMeaning?: string;
  historical?: HaqVerseHistoricalContext;
  cinematic?: HaqVerseCinematicContext;
}

export type HaqVerseVisualAsset =
  | HaqVerseCharacterAsset
  | HaqVerseLocationAsset
  | HaqVersePropAsset;

export interface HaqVerseWorldRule {
  id: HaqVerseWorldRuleId;
  projectId: string;
  name: string;
  continuityTag: ContinuityTag;
  status: HaqVerseAssetStatus;
  era?: string;
  region?: string;
  visualPhilosophy?: string;
  palette?: string[];
  lightingGrammar?: string;
  cameraGrammar?: string;
  architectureRules?: string[];
  wardrobeRules?: string[];
  prohibitedElements?: string[];
  notes?: string;
}

export interface HaqVerseMotionRule {
  id: HaqVerseMotionRuleId;
  projectId: string;
  name: string;
  continuityTag: ContinuityTag;
  status: HaqVerseAssetStatus;
  globalVector?: string;
  cameraVector?: string;
  environmentRelativeVector?: string;
  subjectMotionRules?: string[];
  depthBehavior?: string;
  interactionConstraints?: string[];
  exitBehavior?: string;
  prohibitedMotion?: string[];
  notes?: string;
}

export interface HaqVerseShotSpec {
  id: HaqVerseShotId;
  projectId: string;
  name: string;
  order: number;
  contentRecordId?: HaqVerseContentRecordId;
  characterAssetIds?: HaqVerseAssetId[];
  locationAssetId?: HaqVerseAssetId;
  propAssetIds?: HaqVerseAssetId[];
  worldRuleId?: HaqVerseWorldRuleId;
  motionRuleId?: HaqVerseMotionRuleId;
  startState?: string;
  action?: string;
  motionBeat?: string;
  endState?: string;
  cameraMovement?: string;
  lens?: string;
  composition?: string;
  lighting?: string;
  weather?: string;
  emotionalBeat?: string;
  notes?: string;
}
