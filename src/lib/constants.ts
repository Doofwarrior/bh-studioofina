/**
 * BH Studio v1.0 — Application Constants
 */

export const APP_NAME = "BH Studio";
export const APP_VERSION = "1.0.0";

// ─── Workspace ───
export const DEFAULT_WORKSPACE_PATH = "~/QAH-Workspace";
export const PROJECT_MANIFEST_FILENAME = "project.json";

// ─── Storage ───
export const MAX_FILE_SIZE_MB = 100;
export const AUTO_BACKUP_INTERVAL_MS = 30 * 60 * 1000;

// ─── AI Bridge (Ollama) ───
export const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
export const DEFAULT_OLLAMA_MODEL = "llama3.1";
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_TOKENS = 4096;

// ─── Project Types ───
export const PROJECT_TYPES = [
  "content",
  "research",
  "product",
  "custom",
] as const;

export const PROJECT_FOLDERS = [
  "references",
  "research",
  "scripts",
  "assets",
  "prompts",
  "notes",
  "exports",
  "decisions",
  "archive",
] as const;

// ─── Export ───
export const EXPORT_FORMATS = [
  "reel",
  "carousel",
  "document",
  "archive",
] as const;

export const PLATFORMS = [
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "twitter",
  "whatsapp",
] as const;
