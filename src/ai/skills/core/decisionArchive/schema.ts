/**
 * BH Studio v1.0 — Decision Archive Schema
 */

import { z } from "zod";

export const RejectedOptionSchema = z.object({
  option: z.string(),
  reason: z.string(),
});

export const DecisionArchiveOutputSchema = z.object({
  recommendation: z.string(),
  rationale: z.string(),
  rejectedRationale: z.array(RejectedOptionSchema),
  risks: z.array(z.string()),
  followUp: z.string().nullable(),
});

export type DecisionArchiveOutput = z.infer<typeof DecisionArchiveOutputSchema>;
