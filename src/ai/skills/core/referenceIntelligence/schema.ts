/**
 * BH Studio v1.0 — Reference Intelligence Schema
 */

import { z } from "zod";

export const ReferenceSummarySchema = z.object({
  referenceIndex: z.number().int(),
  summary: z.string(),
  relevance: z.enum(["High", "Medium", "Low"]),
});

export const ContradictionSchema = z.object({
  between: z.string(),
  description: z.string(),
  severity: z.enum(["Critical", "Moderate", "Minor"]),
});

export const ReferenceIntelligenceOutputSchema = z.object({
  summaries: z.array(ReferenceSummarySchema),
  contradictions: z.array(ContradictionSchema),
  gaps: z.array(z.string()),
  suggestions: z.array(z.string()),
});

export type ReferenceIntelligenceOutput = z.infer<
  typeof ReferenceIntelligenceOutputSchema
>;
