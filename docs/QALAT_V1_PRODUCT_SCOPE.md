# QAL‘AT AL-HAQQ v1 — Product Scope Lock

## Purpose

QAL‘AT AL-HAQQ is a personal command workspace for capturing, organizing, finding, working on, planning, deciding, exporting, and recovering the user's projects and creative material.

## Core Loop

**Capture → Organize → Find → Work → Plan → Decide → Export → Recover**

## v1 In Scope

- Dashboard
- Workspace / Projects
- Project Status
- Content Vault
- Planner / To-Do / Calendar
- Quick Capture
- Global Search
- Decision Archive
- Export
- Backup / Restore
- Settings
- Vercel-hosted final release
- Cloud persistence and authentication required for anywhere access

## v1 Out of Scope / Deferred

- HaqVerse integration
- Islamic Research Engine
- KnowledgeOS
- Content-generation engine
- New AI skills
- RAG infrastructure
- Vector database
- Autonomous agents
- Higgsfield integration
- Claude integration
- Social publishing integrations
- Speculative architecture upgrades

## Cost Constraint

Target **$0/month infrastructure for v1 where feasible**. Paid infrastructure must not be introduced without explicit owner approval and demonstrated necessity.

## Product Rule

If a proposed v1 feature does not materially improve **Capture, Organize, Find, Work, Plan, Decide, Export, or Recover**, it does not enter v1 without explicit owner approval.

## Governance

- No new v1 feature enters scope without explicit owner approval.
- Current repository evidence outranks historical assumptions.
- Preserve working systems before removal or replacement.
- Do not perform opportunistic refactors or architecture upgrades during finalization.
- Each finalization slice must be bounded, validated, checkpointed, and stopped before the next slice begins.
- Build success alone is not release acceptance; functional and production validation are required.

## Release Definition

QAL‘AT AL-HAQQ v1 is complete only when the accepted product is deployed to Vercel, authenticated, cloud-persistent, usable without the owner's local development server, backup-capable, validated, and frozen at a known repository state.

## Deferred Work Handling

Ideas discovered during v1 finalization that are useful but not necessary for the locked release belong in a post-v1 backlog. They must not silently expand the v1 implementation scope.
