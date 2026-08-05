# BH Studio Architecture v1.0

## Three-Layer Design

```
┌─────────────────────────────────────────┐
│           BH STUDIO v1.0                │
├─────────────────────────────────────────┤
│  LAYER 1: APPLICATION                   │
│  ├── UI (React + TypeScript)            │
│  ├── Project Manager                    │
│  ├── AI Bridge (single entry)           │
│  ├── Prompt Library                     │
│  └── Export System                      │
├─────────────────────────────────────────┤
│  LAYER 2: AI SKILLS                     │
│  ├── core.referenceIntelligence         │
│  ├── core.decisionArchive               │
│  ├── core.exportIntelligence            │
│  └── islamic.visualDirector             │
├─────────────────────────────────────────┤
│  LAYER 3: WORKSPACE (outside repo)      │
│  ├── Project A (Jaiyo)                  │
│  ├── Project B (The HaqVerse)           │
│  ├── Project C (Studio)                 │
│  └── Shared Library                     │
└─────────────────────────────────────────┘
```

## Communication Rules

- Layers talk **downward only**.
- Application calls AI Skills.
- AI Skills read/write Workspace via Application's storage API.
- AI Skills never touch UI.
- Workspace never imports from Application.

## Repository Structure

See the locked blueprint for the complete folder tree.

## Key Boundaries

| Boundary | Enforced By |
|----------|-------------|
| Only `aiBridge.ts` calls LLMs | Import linting + code review |
| Only `lib/storage/` touches filesystem | Import linting + code review |
| Skills are pure TypeScript | No UI imports in `ai/skills/` |
| Workspace is outside repo | `.gitignore` + runtime config |

## Data Flow

```
User Action → Feature Component → Skill Module → aiBridge.ts → LLM API
                                      ↑
                               (prompt template + Zod schema)
```

## Workspace Layout

Default: `~/BH-Studio-Workspace/`

```
projects/
  {project-name}/
    project.json
    references/
    research/
    scripts/
    assets/
    prompts/
    notes/
    exports/
    decisions/
    archive/
templates/
shared-library/
backups/
```
