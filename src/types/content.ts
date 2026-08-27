import { z } from "zod";

export const ContentCategorySchema = z.enum([
  "ideas",
  "research",
  "projects",
  "archive",
]);

export const ContentNoteSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(160),
  body: z.string(),
  category: ContentCategorySchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ContentCategory = z.infer<typeof ContentCategorySchema>;
export type ContentNote = z.infer<typeof ContentNoteSchema>;
