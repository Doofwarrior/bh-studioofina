import { HaqVerseMotionRuleSchema, HaqVerseWorldRuleSchema } from "../domain/schemas";
import type { HaqVerseCameraMovement, HaqVerseMotionRule, HaqVerseVisualAsset, HaqVerseWorldRule } from "../domain/types";
import { loadCameraMovements } from "../camera/cameraState";
import { loadVisualAssets } from "../registry/registryState";

function keyFor(projectId: string, type: "world-rules" | "motion-rules") {
  return `qah:haqverse:${projectId}:${type}`;
}

function load<T>(projectId: string, type: "world-rules" | "motion-rules", schema: { safeParse: (value: unknown) => { success: boolean; data?: T[] } }): T[] {
  try {
    const raw = localStorage.getItem(keyFor(projectId, type));
    if (!raw) return [];
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data ?? [] : [];
  } catch { return []; }
}

export const loadWorldRules = (projectId: string) => load<HaqVerseWorldRule>(projectId, "world-rules", HaqVerseWorldRuleSchema.array());
export const loadMotionRules = (projectId: string) => load<HaqVerseMotionRule>(projectId, "motion-rules", HaqVerseMotionRuleSchema.array());
export const saveWorldRules = (projectId: string, rules: HaqVerseWorldRule[]) => localStorage.setItem(keyFor(projectId, "world-rules"), JSON.stringify(rules));
export const saveMotionRules = (projectId: string, rules: HaqVerseMotionRule[]) => localStorage.setItem(keyFor(projectId, "motion-rules"), JSON.stringify(rules));

type TaggedRecord = HaqVerseVisualAsset | HaqVerseWorldRule | HaqVerseMotionRule | HaqVerseCameraMovement;
export function findProjectTagConflict(projectId: string, tag: string, ignoredId?: string): TaggedRecord | undefined {
  return [...loadVisualAssets(projectId), ...loadWorldRules(projectId), ...loadMotionRules(projectId), ...loadCameraMovements(projectId)]
    .find((record) => record.continuityTag === tag && record.id !== ignoredId);
}
