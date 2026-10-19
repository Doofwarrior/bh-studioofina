import { HaqVerseVisualAssetSchema } from "../domain/schemas";
import type { HaqVerseVisualAsset } from "../domain/types";

function keyFor(projectId: string) {
  return `qah:haqverse:${projectId}:visual-assets`;
}

export function loadVisualAssets(projectId: string): HaqVerseVisualAsset[] {
  try {
    const raw = localStorage.getItem(keyFor(projectId));
    if (!raw) return [];
    const parsed = HaqVerseVisualAssetSchema.array().safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function saveVisualAssets(projectId: string, assets: HaqVerseVisualAsset[]) {
  localStorage.setItem(keyFor(projectId), JSON.stringify(assets));
}

export function findContinuityTagConflict(
  assets: HaqVerseVisualAsset[],
  continuityTag: string,
  ignoredId?: string
) {
  return assets.find((asset) => asset.continuityTag === continuityTag && asset.id !== ignoredId);
}
