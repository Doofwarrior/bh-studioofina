/**
 * BH Studio v1.0 — Skill Registry
 *
 * Single source of truth for all AI skills.
 * Maps skillId → { manifest, execute }
 *
 * To add a new skill (v2.0+):
 * 1. Create folder under core/ or islamic/
 * 2. Export skillManifest and execute function
 * 3. Import and register here
 */

import type { SkillRegistryEntry } from "@/types/ai";

import {
  skillManifest as refManifest,
  execute as referenceIntelligence,
} from "./core/referenceIntelligence";
import {
  skillManifest as decManifest,
  execute as decisionArchive,
} from "./core/decisionArchive";
import {
  skillManifest as expManifest,
  execute as exportIntelligence,
} from "./core/exportIntelligence";
import {
  skillManifest as visManifest,
  execute as visualDirector,
} from "./islamic/visualDirector";

export const skillRegistry: Record<string, SkillRegistryEntry> = {
  [refManifest.id]: {
    manifest: refManifest,
    execute: referenceIntelligence,
  },
  [decManifest.id]: {
    manifest: decManifest,
    execute: decisionArchive,
  },
  [expManifest.id]: {
    manifest: expManifest,
    execute: exportIntelligence,
  },
  [visManifest.id]: {
    manifest: visManifest,
    execute: visualDirector,
  },
};

export type SkillId = keyof typeof skillRegistry;

export function getSkill(id: string): SkillRegistryEntry | undefined {
  return skillRegistry[id];
}

export function listSkills(): SkillRegistryEntry[] {
  return Object.values(skillRegistry);
}

export function listSkillsByCategory(
  category: "core" | "islamic"
): SkillRegistryEntry[] {
  return Object.values(skillRegistry).filter(
    (entry) => entry.manifest.category === category
  );
}
