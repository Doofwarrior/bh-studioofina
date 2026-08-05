# BH Studio Manifesto v1.0

## Purpose

BH Studio is an AI-assisted creative workspace for solo creators. It organizes projects, stores knowledge, and runs AI skills on demand. It never tries to automate creative decisions or become another ChatGPT.

## Principles

1. **AI-assisted, not AI-autonomous**
   Every AI action requires an explicit user trigger. No background agents. No scheduled tasks.

2. **Projects are the center**
   Every piece of data, UI state, and AI call belongs to a project or the global workspace. Nothing floats free.

3. **Software manages organization**
   The app handles folders, links, versions, and exports. It does not generate creative content on its own.

4. **LLMs provide intelligence**
   All AI reasoning, synthesis, and generation flow through `aiBridge.ts`. No exceptions.

5. **No autonomous agents**
   No background daemons, no scheduled AI tasks, no auto-pilot modes.

6. **Simple, modular, easy to maintain**
   If a refactor requires touching more than 3 modules, the design is wrong.

7. **Workspace is user data**
   The workspace lives outside the Git repository. It is sacred, portable, and never versioned with the app.

8. **Skills are packages, not frameworks**
   AI skills are self-contained modules with a standard interface. They do not build sub-frameworks inside the app.

9. **Don't build for future possibilities**
   No speculative folders, no placeholder architectures, no "we might need this later."

## Version Lock Policy

- **v1.0.0** — Bug fixes only. No new folders, features, or architectural changes.
- **v1.1** — Quality-of-life improvements that don't change architecture (UI polish, performance, docs, minor UX).
- **v2.0** — New capabilities requiring architectural additions (new AI skills, testing, plugins, collaboration).

## Golden Rule

> If the code and the blueprint disagree, the blueprint wins. If the blueprint is wrong, fix it only after identifying a genuine bug — not because a new idea appeared.
