/**
 * BH Studio v1.0 — useSkill Hook
 *
 * Executes AI skills with loading and error states.
 */

import { useState, useCallback } from "react";
import type { SkillRequest, SkillResponse, AIBridge } from "@/types/ai";
import { getSkill } from "@/ai/skills";
import { aiBridge } from "@/ai/aiBridge";

interface UseSkillState {
  isLoading: boolean;
  error: string | null;
  response: SkillResponse | null;
}

export function useSkill(skillId: string) {
  const [state, setState] = useState<UseSkillState>({
    isLoading: false,
    error: null,
    response: null,
  });

  const execute = useCallback(
    async (request: Omit<SkillRequest, "skillId">) => {
      setState({ isLoading: true, error: null, response: null });

      try {
        const skill = getSkill(skillId);
        if (!skill) {
          throw new Error(`Skill not found: ${skillId}`);
        }

        const fullRequest: SkillRequest = {
          ...request,
          skillId,
        };

        const response = await skill.execute(fullRequest, aiBridge);
        setState({ isLoading: false, error: null, response });
        return response;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Unknown error";
        setState({ isLoading: false, error, response: null });
        throw err;
      }
    },
    [skillId]
  );

  return {
    ...state,
    execute,
  };
}
