/**
 * BH Studio v1.0 — Visual Director Schema (Islamic Skill)
 */

import { z } from "zod";

export const ShotSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  duration: z.number().positive(),
  visualDescription: z.string(),
  camera: z.object({
    framing: z.string(),
    movement: z.string(),
    focus: z.string(),
    lighting: z.string(),
    texture: z.string(),
  }),
  audio: z.object({
    layers: z.array(z.string()),
  }),
  onScreenText: z.object({
    content: z.string().optional(),
    font: z.string().optional(),
    placement: z.string().optional(),
    animation: z.string().optional(),
  }),
  emotionalObjective: z.string(),
  transition: z.string(),
  colors: z.object({
    dominant: z.string(),
    secondary: z.string(),
    accent: z.string(),
  }),
});

export const ColorArcSchema = z.object({
  act: z.string(),
  dominantColor: z.string(),
  secondaryColor: z.string(),
  accentColor: z.string(),
  mood: z.string(),
});

export const VisualDirectorOutputSchema = z.object({
  title: z.string(),
  concept: z.string(),
  shots: z.array(ShotSchema),
  colorArcs: z.array(ColorArcSchema),
  globalStyle: z.object({
    prefix: z.string(),
    lut: z.string().optional(),
    resolution: z.string(),
    fps: z.number(),
  }),
  safetyNotes: z.array(z.string()),
});

export type VisualDirectorOutput = z.infer<typeof VisualDirectorOutputSchema>;
