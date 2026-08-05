/**
 * BH Studio v1.0 — Export Intelligence Schema
 */

import { z } from "zod";
import { BilingualTextSchema } from "@/types/export";

export const PlatformSpecSchema = z.object({
  platform: z.enum([
    "instagram",
    "tiktok",
    "youtube",
    "facebook",
    "twitter",
    "whatsapp",
  ]),
  recommendedDuration: z.number().int().positive(),
  recommendedFormat: z.string(),
  notes: z.string(),
});

export const ExportIntelligenceOutputSchema = z.object({
  captions: z.record(BilingualTextSchema),
  hashtags: z.array(z.string()),
  platformSpecs: z.array(PlatformSpecSchema),
  callToAction: BilingualTextSchema,
});

export type ExportIntelligenceOutput = z.infer<
  typeof ExportIntelligenceOutputSchema
>;
