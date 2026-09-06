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
