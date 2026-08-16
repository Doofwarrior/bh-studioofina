/**
 * QAL'AT AL-HAQQ v1.0 - AI Bridge (Ollama)
 *
 * The SOLE LLM GATEWAY in the entire codebase.
 */

import type { SkillRequest, SkillResponse, AIBridge } from "@/types/ai";
import type { OllamaConfig, OllamaModel } from "@/types/ollama";
import {
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "@/lib/constants";

function getOllamaConfig(): OllamaConfig {
  return {
    baseUrl:
      localStorage.getItem("qah:ollama-base-url") ||
      DEFAULT_OLLAMA_BASE_URL,
    model:
      localStorage.getItem("qah:ollama-model") || DEFAULT_OLLAMA_MODEL,
    temperature: DEFAULT_TEMPERATURE,
    maxTokens: DEFAULT_MAX_TOKENS,
  };
}

function buildSystemPrompt(request: SkillRequest): string {
  const parts: string[] = [
    `You are the ${request.skillId} skill for QAL'AT AL-HAQQ, an AI-assisted creative workspace.`,
    "Respond with structured, actionable output. Be concise and precise.",
  ];

  if (request.context?.references?.length) {
    parts.push("## References");
    parts.push(...request.context.references);
  }

  if (request.context?.previousDecisions?.length) {
    parts.push("## Previous Decisions");
    parts.push(...request.context.previousDecisions);
  }

  return parts.join("\n");
}

export const aiBridge: AIBridge = {
  async call(request: SkillRequest): Promise<SkillResponse> {
    const startTime = Date.now();
    const config = getOllamaConfig();

    try {
      if (!request.skillId || !request.projectId || !request.userPrompt) {
        return {
          skillId: request.skillId || "unknown",
          status: "error",
          content: { error: "Invalid request: missing required fields" },
          cached: false,
        };
      }

      const systemPrompt = buildSystemPrompt(request);
      const messages = [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: request.userPrompt },
      ];

      const res = await fetch(`${config.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.model,
          messages,
          stream: false,
          options: {
            temperature: config.temperature,
            num_predict: config.maxTokens,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return {
          skillId: request.skillId,
          status: "error",
          content: { error: `Ollama error ${res.status}: ${errText}` },
          latencyMs: Date.now() - startTime,
          cached: false,
        };
      }

      const data = await res.json();
      const content = data.message?.content || "";

      let parsedContent: unknown = content;
      try {
        if (content.trim().startsWith("{")) {
          parsedContent = JSON.parse(content);
        }
      } catch {
        // Not JSON, keep as string
      }

      return {
        skillId: request.skillId,
        status: "success",
        content: parsedContent,
        tokensUsed: data.eval_count || 0,
        latencyMs: Date.now() - startTime,
        cached: false,
      };
    } catch (error) {
      return {
        skillId: request.skillId || "unknown",
        status: "error",
        content: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        latencyMs: Date.now() - startTime,
        cached: false,
      };
    }
  },

  async callStructured(
    request: SkillRequest,
    schemaDescription: string
  ): Promise<SkillResponse> {
    const startTime = Date.now();
    const config = getOllamaConfig();

    try {
      const systemParts = [
        buildSystemPrompt(request),
        "## Output Format",
        "You MUST respond with valid JSON only. No markdown, no explanations outside the JSON.",
        schemaDescription,
      ];

      const systemPrompt = systemParts.join("\n");

      const messages = [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: request.userPrompt },
      ];

      const res = await fetch(`${config.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.model,
          messages,
          stream: false,
          format: "json",
          options: {
            temperature: config.temperature,
            num_predict: config.maxTokens,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return {
          skillId: request.skillId,
          status: "error",
          content: { error: `Ollama error ${res.status}: ${errText}` },
          latencyMs: Date.now() - startTime,
          cached: false,
        };
      }

      const data = await res.json();
      const content = data.message?.content || "";

      let parsedContent: unknown;
      try {
        parsedContent = JSON.parse(content);
      } catch {
        return {
          skillId: request.skillId,
          status: "partial",
          content: { raw: content },
          reasoning: "Failed to parse JSON from Ollama response",
          latencyMs: Date.now() - startTime,
          cached: false,
        };
      }

      return {
        skillId: request.skillId,
        status: "success",
        content: parsedContent,
        tokensUsed: data.eval_count || 0,
        latencyMs: Date.now() - startTime,
        cached: false,
      };
    } catch (error) {
      return {
        skillId: request.skillId || "unknown",
        status: "error",
        content: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        latencyMs: Date.now() - startTime,
        cached: false,
      };
    }
  },

  async checkConnection(): Promise<{
    ok: boolean;
    models?: OllamaModel[];
    error?: string;
  }> {
    const config = getOllamaConfig();
    try {
      const res = await fetch(`${config.baseUrl}/api/tags`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        return {
          ok: false,
          error: `Ollama returned ${res.status}: ${res.statusText}`,
        };
      }

      const data = await res.json();
      return { ok: true, models: data.models || [] };
    } catch (err) {
      return {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Cannot connect to Ollama. Is it running?",
      };
    }
  },
};
