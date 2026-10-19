import { z } from "zod";

export const ContinuityTagPattern = /^@[A-Z0-9_]+$/;

export const ContinuityTagSchema = z.string().regex(
  ContinuityTagPattern,
  "Continuity tags must start with @ and contain only uppercase letters, digits, and underscores."
);

export type ContinuityTag = z.infer<typeof ContinuityTagSchema>;

export function isContinuityTag(value: string): value is ContinuityTag {
  return ContinuityTagSchema.safeParse(value).success;
}
