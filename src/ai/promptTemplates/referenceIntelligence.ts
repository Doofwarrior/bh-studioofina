/**
 * BH Studio v1.0 — Reference Intelligence Prompt Template
 *
 * Skill: core.referenceIntelligence
 * Purpose: Synthesize references, find contradictions, suggest gaps
 */

export function buildReferenceIntelligencePrompt(params: {
  topic: string;
  references: string[];
  projectGoal?: string;
}): string {
  return `Analyze the following references for the topic "${params.topic}".

## Project Goal
${params.projectGoal || "Not specified"}

## References
${params.references.map((r, i) => `${i + 1}. ${r}`).join("\n")}

## Instructions
1. Summarize the key points from each reference.
2. Identify any contradictions or conflicting information.
3. Highlight gaps in the current reference set.
4. Suggest 3-5 additional references or angles to explore.
5. Rate each reference's relevance (High / Medium / Low).

Respond in structured JSON format with these keys:
- summaries: array of { referenceIndex, summary, relevance }
- contradictions: array of { between, description, severity }
- gaps: array of strings
- suggestions: array of strings
`;
}
