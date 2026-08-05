/**
 * BH Studio v1.0 — Slugify Utility
 *
 * Converts a string to a URL-safe slug.
 */

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
