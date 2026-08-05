/**
 * BH Studio v1.0 — Export Intelligence Prompt Template
 *
 * Skill: core.exportIntelligence
 * Purpose: Optimize exports per platform, generate captions/hashtags
 */

export function buildExportIntelligencePrompt(params: {
  projectTitle: string;
  contentDescription: string;
  targetPlatforms: string[];
  language: "en" | "bn" | "bilingual";
  tone?: string;
}): string {
  return `Generate optimized export metadata for the following content.

## Project Title
${params.projectTitle}

## Content Description
${params.contentDescription}

## Target Platforms
${params.targetPlatforms.join(", ")}

## Language Preference
${params.language}

## Tone
${params.tone || "Engaging and authentic"}

## Instructions
1. Write platform-optimized captions for each target platform.
2. Generate 15-20 relevant hashtags.
3. Suggest optimal duration and format for each platform.
4. Provide bilingual output (English + Bengali) if requested.
5. Include a call-to-action suggestion.

Respond in structured JSON format with these keys:
- captions: object with platform keys (instagram, tiktok, etc.) containing { en, bn }
- hashtags: array of strings
- platformSpecs: array of { platform, recommendedDuration, recommendedFormat, notes }
- callToAction: { en, bn }
`;
}
