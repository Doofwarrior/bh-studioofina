# BH Studio Coding Guidelines v1.0

## General Rules

1. **TypeScript everywhere.** No `any` without explicit justification.
2. **Zod for all runtime validation.** Every external input, file read, and AI response is validated.
3. **No direct `fs` calls.** Use `lib/storage/` only.
4. **No direct LLM SDK imports.** Use `aiBridge.ts` only.
5. **Skills are pure TypeScript.** No React, no UI framework imports in `ai/skills/`.
6. **One responsibility, one source of truth.** If you find duplication, refactor.

## File Organization

- `src/app/` — Routing, layouts, pages, providers only
- `src/components/ui/` — Primitive design system components
- `src/components/project/` — Project-scoped reusable components
- `src/components/editor/` — Editor components
- `src/features/` — Self-contained feature modules with their own components, hooks, and logic
- `src/ai/` — AI Bridge, prompt templates, and skills only
- `src/lib/` — Shared libraries (storage, validation, constants)
- `src/hooks/` — Reusable React hooks
- `src/utils/` — Pure helper functions
- `src/types/` — All TypeScript definitions
- `src/styles/` — Global styles and Tailwind config

## Naming Conventions

- **Files:** `kebab-case.ts` for utilities, `PascalCase.tsx` for components
- **Functions:** `camelCase`
- **Types/Interfaces:** `PascalCase`
- **Constants:** `SCREAMING_SNAKE_CASE`
- **Skill IDs:** `category.skillName` (dot notation)

## Import Rules

| From | Can Import |
|------|-----------|
| `components/` | `lib/`, `utils/`, `types/`, `hooks/` |
| `features/` | `components/`, `lib/`, `utils/`, `types/`, `hooks/`, `ai/skills/*/index.ts` |
| `ai/skills/` | `lib/`, `utils/`, `types/`, `ai/aiBridge.ts` |
| `ai/aiBridge.ts` | `lib/`, `utils/`, `types/` |
| `lib/storage/` | `utils/`, `types/` |

## Error Handling

- All async operations return `Result<T, E>` or throw with typed errors.
- AI Bridge always returns `SkillResponse` with status field.
- Storage operations validate before write and auto-backup before overwrite.

## Comments

- **Why, not what.** The code says what it does. Comments explain why it does it.
- **TODOs** must include the version they target: `// TODO(v1.1): Add keyboard shortcut`
