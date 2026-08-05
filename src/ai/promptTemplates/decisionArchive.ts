/**
 * BH Studio v1.0 — Decision Archive Prompt Template
 *
 * Skill: core.decisionArchive
 * Purpose: Structure a decision, log it, and lock it
 */

export function buildDecisionArchivePrompt(params: {
  context: string;
  question: string;
  options: string[];
  projectGoal?: string;
}): string {
  return `Help structure a creative decision for the following scenario.

## Context
${params.context}

## Decision Question
${params.question}

## Options Considered
${params.options.map((o, i) => `${i + 1}. ${o}`).join("\n")}

## Project Goal
${params.projectGoal || "Not specified"}

## Instructions
1. Analyze each option against the project goal.
2. Recommend the best option with clear rationale.
3. Explain why each rejected option was not chosen.
4. Identify risks or trade-offs of the recommended option.
5. Suggest a follow-up decision if needed.

Respond in structured JSON format with these keys:
- recommendation: string (the chosen option)
- rationale: string (why this option)
- rejectedRationale: array of { option, reason }
- risks: array of strings
- followUp: string or null
`;
}
