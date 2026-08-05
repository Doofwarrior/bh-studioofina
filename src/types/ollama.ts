/**
 * BH Studio v1.0 — Ollama Configuration Types
 */

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[] | null;
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  stream?: boolean;
  format?: "json";
  options?: {
    temperature?: number;
    num_predict?: number;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  done_reason?: string;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaChatRequest {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  stream?: boolean;
  format?: "json";
  options?: {
    temperature?: number;
    num_predict?: number;
  };
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  done_reason?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}
