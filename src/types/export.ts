import { z } from "zod";

// ───────────────────────────────────────────
// Bilingual Text
// ───────────────────────────────────────────

export const BilingualTextSchema = z.object({
  en: z.string(),
  bn: z.string(),
});

export type BilingualText = z.infer<typeof BilingualTextSchema>;

// ───────────────────────────────────────────
// Platform Version
// ───────────────────────────────────────────

export const PlatformVersionSchema = z.object({
  platform: z.enum([
    "instagram",
    "tiktok",
    "youtube",
    "facebook",
    "twitter",
    "whatsapp",
  ]),
  durationSeconds: z.number().int().positive(),
  hasText: z.boolean(),
  hasAudio: z.boolean(),
  filePath: z.string(),
});

export type PlatformVersion = z.infer<typeof PlatformVersionSchema>;

// ───────────────────────────────────────────
// Export Package
// ───────────────────────────────────────────

export const ExportPackageSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
  format: z.enum(["reel", "carousel", "document", "archive"]),
  createdAt: z.string().datetime(),
  assets: z.array(z.string()),
  manifest: z.object({
    title: z.string(),
    captions: BilingualTextSchema.optional(),
    hashtags: z.array(z.string()).optional(),
    platformVersions: z.array(PlatformVersionSchema),
  }),
});

export type ExportPackage = z.infer<typeof ExportPackageSchema>;
