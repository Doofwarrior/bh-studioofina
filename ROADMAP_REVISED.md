# BH Studioofina — Master Roadmap & New-Chat Engineering Instructions

**Document purpose:** This is the continuity and safety contract for future ChatGPT sessions working on BH Studioofina.

**Repository:** `Doofwarrior/bh-studioofina`
**Remote:** `https://github.com/Doofwarrior/bh-studioofina.git`
**Canonical branch:** `main`
**Current state:** S-2 complete and merged; next numbered slice is not yet authoritative
**Implementation policy:** evidence-first, narrow-slice, architecture-preserving

---

# 0. READ THIS FIRST — NON-NEGOTIABLE NEW-CHAT CONTRACT

A new ChatGPT session must **not assume that an unfinished-looking roadmap means the next feature should be invented**.

The correct starting state is:

> **BH Studioofina has completed S-2: Decision Archive Viewer. S-2 is already merged into `main`. The next numbered implementation slice is currently undefined because the authoritative revised roadmap could not be recovered from surviving repository history. Do not invent S-3. Recover evidence first. If evidence cannot be recovered, stop.**

Before changing any source file, the next chat must:

1. Inspect the current `main` branch.
2. Read this entire `ROADMAP_REVISED.md`.
3. Read `docs/roadmap.md` and explicitly recognize it as the older v1.0 roadmap.
4. Confirm the S-2 merge is present.
5. Inspect the current storage/types/routing architecture relevant to the proposed work.
6. Search repository history and surviving branches for an authoritative definition of the next slice.
7. Only implement a numbered slice after its scope and acceptance criteria are supported by authoritative evidence.

If the next slice remains undefined, **do not create source changes just to make progress**.

---

# 1. PROJECT IDENTITY

BH Studioofina is an **AI-assisted creative workspace**, not an autonomous agent platform.

Core philosophy:

- AI-assisted, not AI-autonomous.
- Projects are the center of the system.
- Software manages organization and workspace state.
- LLMs provide intelligence when explicitly invoked.
- No autonomous agents.
- Keep the system simple, modular, understandable, and maintainable.
- Workspace data belongs to the user.
- Skills are packages/capabilities, not a new application framework.
- Do not build speculative infrastructure for hypothetical future requirements.

The repository README describes the conceptual architecture as three layers:

```text
APPLICATION
  UI
  Project Manager
  AI Bridge
  Prompt Library
  Export System

AI SKILLS
  Core Skills
  Islamic Skills

WORKSPACE
  User projects / user data outside the Git repository
```

The application uses local Ollama inference and does not require cloud API keys as a core dependency.

---

# 2. ARCHITECTURE RULES

The existing v1.0 architecture is locked unless an explicit architectural proposal is recovered and approved.

The following boundaries are important:

## Application layer

Owns UI, routing, project selection, AI bridge integration, prompt library, and export surfaces.

## Skill layer

Contains reusable AI capabilities such as `referenceIntelligence`, `exportIntelligence`, `decisionArchive`, and Islamic skills.

## Workspace/storage layer

Owns persistence and filesystem operations.

The storage module is the authoritative boundary for filesystem operations. UI components must not independently implement filesystem persistence.

### Existing persistence mechanisms

- Browser File System Access API for the connected workspace.
- localStorage fallback.
- IndexedDB for persistence of the workspace directory handle.
- Existing project cache behavior.
- Existing Zod schemas for validation.

### Rule

**Reuse the existing storage APIs, types, and schemas. Do not introduce another persistence mechanism unless an explicitly authoritative architectural requirement says so.**

---

# 3. AUTHORITATIVE ROADMAP STATUS

The surviving older roadmap is `docs/roadmap.md`.

It describes v1.0 as **Current — Locked** and states that structural changes are not permitted.

The old v1.0 scope includes:

- Project CRUD and dashboard.
- Workspace management.
- AI Bridge with a single provider.
- Three core skills:
  - `referenceIntelligence`
  - `exportIntelligence`
  - `decisionArchive`
- One Islamic skill:
  - `visualDirector`
- Prompt library.
- Export system.
- Backup system.

The old implementation order is:

1. Scaffold repository.
2. Build storage/workspace layer.
3. Implement AI Bridge.
4. Implement the three core skills.
5. Build project workflow.
6. Add `islamic.visualDirector`.
7. Polish and ship.

The old roadmap also describes v1.1 as future QoL-only work and v2.0 as requiring standalone architectural proposals.

### Critical interpretation

The old roadmap is useful historical context, but it is **not sufficient evidence for a new numbered slice after S-2**.

Do not convert an old bullet into a new task merely because it appears to be the next unfinished item.

---

# 4. S-2 — DECISION ARCHIVE VIEWER — COMPLETE

## Status

**S-2 is COMPLETE and MERGED into `main`.**

GitHub PR:

- PR `#8`
- Head branch: `implement-decision-archive-viewer-dd6bc`
- Implementation commit: `29f5ca43d4f35056f76162dd82d881efcd91b4c7`
- Merge commit on `main`: `12950f7a74f2e8ae901b53242fd5bdf32db23764`
- PR scope: 5 files
- PR additions: 252
- PR deletions: 0

The merge was conflict-free and completed successfully.

## Exact files changed by S-2

```text
src/lib/storage/index.ts
src/features/decisions/DecisionArchivePage.tsx
src/features/decisions/DecisionArchiveViewer.tsx
src/app/routes/index.tsx
src/app/layouts/RootLayout.tsx
```

No other source architecture was intended to change.

---

# 5. S-2 IMPLEMENTATION DETAILS

## 5.1 Storage — `readDecisions()`

Added:

```ts
readDecisions(projectSlug): Promise<DecisionEntry[]>
```

Behavior:

1. Prefer the connected workspace File System Access API.
2. Open `projects/<projectSlug>/decisions/`.
3. Read `decisions.json`.
4. Parse raw entries as unknown data.
5. Validate entries through the existing `DecisionEntrySchema`.
6. If filesystem access fails, fall back to the existing localStorage key:
   `project:<projectSlug>:decisions:decisions.json`
7. Filter invalid localStorage entries through the existing schema.

This is a read path over the existing persistence design.

**No new persistence layer was introduced.**

## 5.2 Page — `DecisionArchivePage.tsx`

Responsibilities:

- Accept `projectSlug`.
- Load decisions using `readDecisions()`.
- Manage loading state.
- Manage error state.
- Avoid state updates after unmount.
- Render `DecisionArchiveViewer` once data is available.

## 5.3 Viewer — `DecisionArchiveViewer.tsx`

Reuses existing components and utilities:

- `Card`
- `Badge`
- `formatDate`
- existing Lucide icons

Displays:

- Empty state.
- Decision count.
- Question.
- Timestamp.
- Locked/unlocked status.
- Context when available.
- Selected option.
- Rationale.
- Rejected options/rationales.
- AI-assisted indicator.
- Skill ID when present.

## 5.4 Routing

Added:

```text
/decisions
```

The route reads `activeProject` from the existing `ProjectProvider`.

If there is no active project, it shows:

```text
No project selected.
```

Otherwise it passes `activeProject.slug` to `DecisionArchivePage`.

## 5.5 Navigation

Added **Decision Archive** to the existing `RootLayout` navigation using the existing `Archive` Lucide icon.

---

# 6. S-2 VALIDATION

The implementation task reported:

- **Build:** PASS
- Bundle size: approximately `433.73 kB`
- **Lint:** PASS
- Lint errors: `0`
- Lint warnings: `9`, all reported as pre-existing

S-2 did not introduce a new persistence layer or a broad architectural refactor.

If future work touches S-2 code, first verify the merged `main` implementation rather than rebuilding it from memory.

---

# 7. DECISION ARCHIVE STORAGE IS ALREADY ESTABLISHED

The decision archive already has an authoritative append/write path in the storage layer.

S-2 added the missing viewer/read path.

Conceptually:

```text
Decision Archive Skill
        │
        │ appendDecision()
        ▼
projects/<slug>/decisions/decisions.json
        │
        │ readDecisions()
        ▼
DecisionArchivePage
        │
        ▼
DecisionArchiveViewer
```

The UI must continue to consume the storage layer rather than reading or writing the workspace directly.

---

# 8. BACKUP SYSTEM — IMPORTANT INTERPRETATION

The old roadmap lists **Backup system** in the v1.0 scope.

However, repository investigation found that the current authoritative storage layer already implements backup behavior.

The storage layer explicitly documents:

> “Auto-backs up any file before overwriting.”

`writeFile()` already backs up existing content before overwrite and stores timestamped backup data using keys shaped like:

```text
backup:<projectSlug>:<folder>:<filename>:<timestamp>
```

Therefore:

## Do NOT do this

Do not implement a second generic backup engine merely because the old roadmap contains the phrase `Backup system`.

That would duplicate existing behavior and violate the narrow-slice / source-of-truth rules.

## What may eventually be possible

A future authoritative slice could potentially define a specific capability around the existing backup data, such as:

- backup browsing
- restore
- retention management
- recovery UX
- backup export
- backup diagnostics

But **none of those are automatically approved**.

A future backup-related feature requires explicit requirements or recovered roadmap evidence.

---

# 9. THE REAL CURRENT BLOCKER — MISSING S-3 DEFINITION

After S-2, repository investigation found a source-of-truth gap.

The evidence chain is:

```text
S-2 Decision Archive Viewer
        ↓
merged into main
        ↓
old docs/roadmap.md remains historical v1.0 context
        ↓
old roadmap contains “Backup system”
        ↓
current storage already provides automatic backup-on-overwrite behavior
        ↓
no surviving authoritative ROADMAP_REVISED.md previously defined the next slice
        ↓
surviving audit snapshot did not provide the missing numbered slice
        ↓
S-3 cannot safely be inferred
```

This is a genuine repository-history/documentation gap.

It is **not** a license to guess.

---

# 10. CURRENT ROADMAP — BUILD GATES

The roadmap from this point forward must use explicit evidence gates.

## Gate A — Repository orientation

Before any implementation:

- Inspect `main`.
- Read this file.
- Read `README.md`.
- Read `docs/roadmap.md`.
- Inspect the relevant current source files.
- Check Git status and recent history.

**Exit condition:** current repository state is understood.

## Gate B — Roadmap recovery

Search for:

- revised roadmap files
- roadmap commits
- branches containing revised planning
- archived project instructions
- authoritative task definitions
- previous task handoffs that define the next numbered slice

Do not treat arbitrary issue comments or speculative suggestions as authoritative without corroboration.

**Exit condition:** S-3 has an authoritative definition OR the search proves the definition is unavailable.

## Gate C — Scope lock

If S-3 is recovered, write down:

- exact objective
- exact files expected to change
- explicit non-goals
- acceptance criteria
- validation commands
- dependencies on existing architecture

Do not begin implementation until this scope is unambiguous.

**Exit condition:** one narrow implementation slice is locked.

## Gate D — Implementation

Implement only the locked slice.

Rules:

- Reuse existing APIs.
- Reuse existing types/schemas.
- Reuse existing UI patterns.
- Reuse existing routing/navigation.
- Do not introduce speculative abstractions.
- Do not refactor unrelated code.
- Do not change architecture.

**Exit condition:** requested slice is implemented and no unrelated changes exist.

## Gate E — Validation

Run the repository's appropriate validation commands, at minimum the project build and lint checks when applicable.

Also run tests/typecheck if those scripts exist and are relevant.

Fix only errors caused by the implementation unless the task explicitly authorizes unrelated cleanup.

**Exit condition:** validation passes or remaining failures are clearly documented as pre-existing/environmental.

## Gate F — Git review

Before committing or pushing, if the task requests Git operations:

- inspect complete diff
- verify only intended files changed
- exclude generated/dependency noise from the intended feature scope
- verify branch and HEAD
- verify no accidental modifications

Do not create duplicate commits.

**Exit condition:** Git state is intentional.

## Gate G — Delivery

Only commit, push, create PRs, or merge when explicitly requested.

Never place credentials, tokens, or secrets in files.

---

# 11. S-3 — CURRENT STATUS

```text
S-3: UNDEFINED / BLOCKED
```

There is currently no authoritative repository-supported definition of S-3 in the surviving evidence.

### S-3 is NOT automatically any of these

- Backup system
- Backup UI
- Restore UI
- Backup API
- v1.1 QoL feature
- v2.0 feature
- Any AI-generated suggestion
- Any arbitrary GitHub issue
- Any feature inferred from an audit document

### Required outcome

Either:

1. Recover an authoritative S-3 definition and proceed through the build gates; or
2. Report that the roadmap is still blocked and make **no source changes**.

---

# 12. SOURCE-OF-TRUTH PRIORITY

When documents or suggestions conflict, use this priority order unless the project explicitly says otherwise:

1. Current repository code and actual merged Git history.
2. Explicit current task instructions from the project owner.
3. An authoritative revised roadmap or project handoff.
4. Current architecture/type/schema definitions.
5. Older roadmap documents, clearly labeled as historical context.
6. Audit snapshots, unless explicitly identified as authoritative requirements.
7. GitHub issues/comments and speculative proposals.
8. AI-generated assumptions.

Never let a lower-priority source override a higher-priority repository fact without explicit evidence.

---

# 13. ENGINEERING RULES FOR FUTURE WORK

These rules apply to every future slice:

1. Preserve the v1.0 architecture.
2. Work one narrow slice at a time.
3. Inspect before editing.
4. Identify exact files before implementation.
5. Prefer existing APIs over new abstractions.
6. Reuse existing UI components.
7. Reuse existing toast/notification patterns where applicable.
8. Reuse existing Zod schemas and project types.
9. Do not bypass the storage boundary.
10. Do not add persistence layers speculatively.
11. Do not refactor unrelated code.
12. Do not fabricate data.
13. Do not fabricate acceptance criteria.
14. Do not infer a numbered slice from a vague roadmap bullet.
15. Do not change audit documents during feature work unless explicitly requested.
16. Do not change roadmap documents during feature work unless explicitly requested.
17. Do not use autonomous agents, workflows, or subagents when the task explicitly forbids them.
18. Run build/lint/typecheck/tests appropriate to the repository after implementation.
19. Review the complete diff before any requested commit.
20. Never commit or push unless the user explicitly asks.
21. Never put credentials, tokens, or secrets into source, configuration, or documentation files.
22. Never create a duplicate commit when the requested commit already exists.

---

# 14. FUTURE SLICE TEMPLATE

When an authoritative future slice is recovered, document it using this structure before coding:

```markdown
## S-X — <Name>

Status: Planned / In Progress / Complete

### Objective
<one precise paragraph>

### Evidence
- <authoritative source>
- <commit / document / task reference>

### In scope
- <item>
- <item>

### Explicitly out of scope
- <item>
- <item>

### Expected files
- `<path>` — <reason>
- `<path>` — <reason>

### Existing APIs/types to reuse
- `<API>`
- `<type/schema>`
- `<component>`

### Acceptance criteria
- [ ] <criterion>
- [ ] <criterion>

### Validation
- `<command>`
- `<command>`
```

This prevents the next chat from turning an ambiguous request into an uncontrolled feature expansion.

---

# 15. GIT / DELIVERY CONTEXT

Canonical repository:

```text
https://github.com/Doofwarrior/bh-studioofina.git
```

Canonical branch:

```text
main
```

S-2 implementation commit:

```text
29f5ca43d4f35056f76162dd82d881efcd91b4c7
```

S-2 merge commit:

```text
12950f7a74f2e8ae901b53242fd5bdf32db23764
```

S-2 PR:

```text
#8
```

The earlier implementation workspace used a temporary branch named:

```text
qwen-code-3a5e5525-1ecc-4128-8d6a-ea82085dd6bc
```

The PR head branch was:

```text
implement-decision-archive-viewer-dd6bc
```

### Important

Do not assume either temporary branch is the current canonical state. Use `main` as the source of truth unless the user explicitly asks to work on another branch.

---

# 16. SAFE NEW-CHAT PROCEDURE

When starting a fresh ChatGPT conversation, the first response should NOT immediately propose implementation.

The model should say, in substance:

1. I will inspect the current repository state.
2. I will verify S-2 is merged.
3. I will read `ROADMAP_REVISED.md` and the old roadmap.
4. I will search for authoritative S-3 evidence.
5. I will not modify source files until the next slice is confirmed.

Then inspect.

### If S-3 evidence is found

Report:

- where it was found
- why it is authoritative
- exact scope
- intended files
- acceptance criteria
- risks/non-goals

Then ask/act according to the user's requested workflow.

### If S-3 evidence is NOT found

Report:

> S-2 is complete and the repository is healthy, but the next numbered slice is not authoritatively defined. I will not invent S-3 or modify source code. The correct next step is recovering the missing roadmap/context.

Then stop.

---

# 17. COPY-PASTE MASTER PROMPT FOR THE NEXT CHAT

Use the following prompt verbatim when continuity is important:

> **Continue BH Studioofina from the existing repository state. This is a continuation, not a restart. First inspect the repository and do not modify source files until the current state is verified. Read `ROADMAP_REVISED.md`, `README.md`, and `docs/roadmap.md`. S-2 Decision Archive Viewer is already complete and merged into `main` via PR #8. The S-2 implementation commit is `29f5ca43d4f35056f76162dd82d881efcd91b4c7`; the merge commit is `12950f7a74f2e8ae901b53242fd5bdf32db23764`. S-2 changed only `src/lib/storage/index.ts`, `src/features/decisions/DecisionArchivePage.tsx`, `src/features/decisions/DecisionArchiveViewer.tsx`, `src/app/routes/index.tsx`, and `src/app/layouts/RootLayout.tsx`. S-2 build passed at approximately 433.73 kB and lint passed with 0 errors and 9 pre-existing warnings. The current storage layer already performs automatic backup-before-overwrite behavior. Therefore do NOT implement a duplicate generic backup system simply because the old roadmap says “Backup system.” The current S-3 definition is undefined/blocked because the authoritative revised roadmap could not be recovered from surviving history. Search repository history, branches, and authoritative project context for the real next slice. If S-3 can be recovered, report the evidence, scope, expected files, non-goals, and acceptance criteria before coding. If it cannot be recovered, stop and report the documentation/history gap. Do not invent requirements, do not refactor unrelated code, do not change architecture, do not introduce a new persistence layer, do not redo S-2, do not modify audit documents, and do not create source changes merely to make progress.**

---

# 18. CURRENT ROADMAP CHECKPOINT

```text
┌──────────────────────────────────────────────────────────┐
│ BH STUDIOOFINA — CURRENT STATE                           │
├──────────────────────────────────────────────────────────┤
│ Architecture           │ v1.0 locked                     │
│ S-2                    │ COMPLETE                         │
│ S-2 PR                 │ #8 — MERGED                      │
│ S-2 implementation     │ 29f5ca43d4f35056f76162dd...     │
│ S-2 merge              │ 12950f7a74f2e8ae901b532...       │
│ Build                  │ PASS                             │
│ Lint                   │ PASS — 0 errors                  │
│ Existing backup        │ YES — storage layer              │
│ New persistence needed │ NO evidence                       │
│ S-3                    │ UNDEFINED / BLOCKED              │
│ Next action            │ RECOVER ROADMAP EVIDENCE          │
│ Source implementation  │ PAUSED until S-3 is authoritative │
└──────────────────────────────────────────────────────────┘
```

---

# 19. FINAL DECISION

**Do not fill the roadmap gap with an invented feature.**

The project should resume implementation only when the next numbered slice is supported by authoritative evidence.

Until then, preserving the merged S-2 repository state is the correct engineering action.
