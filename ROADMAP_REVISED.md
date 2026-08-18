# BH Studioofina — Roadmap, State & New-Chat Handoff

**Status:** Active recovery checkpoint — implementation intentionally paused after merged S-2
**Repository:** `Doofwarrior/bh-studioofina`
**Default branch:** `main`
**Current known merged S-2 implementation commit:** `29f5ca43d4f35056f76162dd82d881efcd91b4c7`
**S-2 merge commit on `main`:** `12950f7a74f2e8ae901b53242fd5bdf32db23764`
**S-2 PR:** #8 — merged
**Latest roadmap checkpoint commit:** this file's latest commit

## IMPORTANT: New-chat safety contract

If this repository is opened in a new ChatGPT conversation, **do not restart implementation, invent S-3, revert S-2, or refactor architecture merely because the next feature is unclear.**

The correct starting assumption is:

> **BH Studioofina is at the merged S-2 state. The next numbered implementation slice is not authoritatively known yet. Recover the missing roadmap context before implementing anything new.**

Do not treat the old roadmap's `Backup system` bullet as an automatically valid S-3. The storage layer already contains automatic backup behavior, so implementing a duplicate generic backup system would be incorrect without additional authoritative requirements.

---

# 1. Project identity and philosophy

BH Studio v1.0 is an **AI-assisted creative workspace**. The repository README describes the core philosophy as:

- AI-assisted, not AI-autonomous
- Projects are the center
- Software manages organization
- LLMs provide intelligence
- No autonomous agents
- Simple, modular, easy to maintain
- Workspace is user data
- Skills are packages, not frameworks
- Don't build for future possibilities

The architecture has three conceptual layers:

1. **Application** — UI, Project Manager, AI Bridge, Prompt Library, Export System
2. **AI Skills** — Core Skills + Islamic Skills
3. **Workspace** — User projects outside the Git repository

The application uses local Ollama inference and does not require cloud API keys. The workspace is external to the Git repository.

Source: `README.md`.

---

# 2. Authoritative old v1.0 roadmap

`docs/roadmap.md` says v1.0 is **Current — Locked**, with **no structural changes permitted**.

Its v1.0 scope is:

- Project CRUD and dashboard
- Workspace management
- AI Bridge with single provider
- 3 core skills: `referenceIntelligence`, `exportIntelligence`, `decisionArchive`
- 1 Islamic skill: `visualDirector`
- Prompt library
- Export system
- Backup system

Its implementation order is:

1. Scaffold repository
2. Build storage/workspace layer
3. Implement AI Bridge
4. Implement 3 core skills
5. Build project workflow
6. Add `islamic.visualDirector`
7. Polish and ship

The roadmap also states v1.1 is future QoL-only work and v2.0 requires standalone architectural proposals. This means a new conversation must **not casually alter the v1.0 architecture**.

Source: `docs/roadmap.md`.

---

# 3. S-2 — Decision Archive Viewer

## Status

**S-2 is complete and merged into `main`.**

PR #8 was merged successfully.

- PR: `#8`
- Head branch: `implement-decision-archive-viewer-dd6bc`
- S-2 implementation commit: `29f5ca43d4f35056f76162dd82d881efcd91b4c7`
- Merge commit on `main`: `12950f7a74f2e8ae901b53242fd5bdf32db23764`
- PR changed files: 5
- PR additions: 252
- PR deletions: 0

The merge was reported as conflict-free and the PR is closed/merged.

## Exact S-2 implementation

### Added

- `src/features/decisions/DecisionArchivePage.tsx`
- `src/features/decisions/DecisionArchiveViewer.tsx`

### Modified

- `src/lib/storage/index.ts`
- `src/app/routes/index.tsx`
- `src/app/layouts/RootLayout.tsx`

### Storage

Added `readDecisions(projectSlug)` to the authoritative storage module.

Behavior:

1. Prefer the connected workspace's File System Access API.
2. Read `projects/<projectSlug>/decisions/decisions.json`.
3. Parse entries as `unknown`.
4. Validate each entry with the existing `DecisionEntrySchema`.
5. Fall back to the existing localStorage key:
   `project:<projectSlug>:decisions:decisions.json`
6. Filter invalid localStorage entries using the existing schema.

**No new persistence layer was introduced.**

### Page

`DecisionArchivePage`:

- receives `projectSlug`
- loads decisions in `useEffect`
- has loading state
- has error state
- avoids updating state after unmount
- renders `DecisionArchiveViewer` after loading

### Viewer

`DecisionArchiveViewer`:

- reuses existing `Card`
- reuses existing `Badge`
- uses existing `formatDate`
- shows empty state when no decisions exist
- shows decision count
- displays question and timestamp
- displays locked/unlocked state
- displays context when present
- displays selected option
- displays rationale
- displays rejected options/rationales when present
- displays AI-assisted status and `skillId` when available

### Routing

Added `/decisions` to the existing React Router architecture.

The route obtains `activeProject` from the existing `ProjectProvider`.

If no project is selected, it shows:

`No project selected.`

Otherwise it renders the archive page for `activeProject.slug`.

### Navigation

Added **Decision Archive** to `RootLayout` navigation using the existing `Archive` Lucide icon.

### Validation

The implementation work reported:

- Build: **PASS** — approximately `433.73 kB` bundle
- Lint: **PASS** — `0` errors and `9` pre-existing warnings

No new test suite or new architecture was introduced as part of S-2.

---

# 4. Existing decision storage is authoritative

The storage module is explicitly described as the **ONLY module allowed to perform filesystem operations**.

It uses:

- Browser File System Access API
- localStorage fallback
- IndexedDB for persistence of the workspace directory handle
- Zod validation
- an in-memory project cache

The decision log already has an `appendDecision()` operation. S-2 added the corresponding reader.

Do not bypass this module from UI code.

---

# 5. IMPORTANT: backup behavior already exists

The old roadmap lists `Backup system` in v1.0 scope.

However, the current storage authority explicitly documents:

> “Auto-backs up any file before overwriting.”

`writeFile()` already performs automatic backup before overwriting an existing file. It reads the existing content and, when content exists, stores a timestamped localStorage backup under a key shaped like:

`backup:<projectSlug>:<folder>:<filename>:<timestamp>`

Therefore:

**Do not implement a second generic backup subsystem simply because the old roadmap says “Backup system.”**

If a future slice requires backup UI, restore, browsing, retention, export, recovery, or another specific capability, that capability must be explicitly supported by recovered project requirements/history before implementation.

Source: current `src/lib/storage/index.ts`.

---

# 6. Repository-history gap after S-2

The investigation that led to this checkpoint found:

```text
S-2 Decision Archive Viewer
        ↓
merged into main
        ↓
old docs/roadmap.md still describes v1.0 scope
        ↓
old roadmap includes “Backup system”
        ↓
current storage already implements automatic backups
        ↓
there was no authoritative ROADMAP_REVISED.md in the surviving history
        ↓
no surviving branch was found that authoritatively defined the next numbered slice
        ↓
there is no safe evidence for S-3
```

The surviving `kimi-audit-snapshot` branch was investigated during the earlier task. It retained the old `docs/roadmap.md` and did not provide the missing revised roadmap.

This is a **real repository-history/source-of-truth gap**.

It is not permission to guess.

---

# 7. Current S-3 status

## S-3 — NOT DEFINED

**Status:** Blocked pending recovery of authoritative roadmap context.

There is currently no repository-supported definition of the next numbered implementation slice that is safe to execute.

### Do NOT assume

Do not assume:

- `Backup system` = S-3
- any v1.1 candidate = S-3
- any v2.0 candidate = S-3
- a feature suggested by an LLM = approved work
- a feature suggested by a GitHub issue = approved work
- a feature suggested by an old audit snapshot = approved work

### Do NOT implement

Until the roadmap gap is resolved, do not:

- build a new backup subsystem
- create backup UI/API without explicit requirements
- invent S-3
- alter the v1.0 architecture
- introduce a new persistence layer
- refactor unrelated code
- modify audit documents to manufacture requirements
- rewrite S-2
- revert the merged S-2 work

---

# 8. Exact recovery procedure for the next chat

When continuing this project:

1. Inspect the repository's current `main` state.
2. Confirm S-2 is present and merged.
3. Read this `ROADMAP_REVISED.md` completely.
4. Read `docs/roadmap.md` but treat it as the **old v1.0 roadmap**, not as proof of an S-3.
5. Inspect any surviving authoritative project context/history that may define the missing revised roadmap.
6. Search repository branches/history for a real roadmap revision before inventing anything.
7. If authoritative S-3 evidence is recovered, document the exact S-3 scope and acceptance criteria here before implementation.
8. If no evidence is recovered, **stop and report the roadmap gap**.
9. Do not create source changes merely to make progress.

---

# 9. Engineering rules for all future slices

Every future implementation must preserve these constraints:

1. Follow the existing v1.0 architecture.
2. Treat roadmap/audit material as source-of-truth.
3. Keep implementation narrowly scoped to one slice.
4. Reuse existing storage APIs.
5. Reuse existing project types and Zod schemas.
6. Reuse existing routing and navigation architecture.
7. Reuse existing UI components and toast patterns where applicable.
8. Do not add a new persistence layer unless an explicitly approved architecture change requires it.
9. Do not refactor unrelated code.
10. Do not fabricate missing data or acceptance criteria.
11. Do not use autonomous agents, workflows, or subagents for feature implementation when the project task explicitly forbids them.
12. Run the project's prescribed validation checks after implementation.
13. Do not modify roadmap or audit documents during a feature implementation unless the task explicitly requests a roadmap/documentation update.
14. Do not commit or push unless the task explicitly requests it.

---

# 10. Repository / Git state context

Repository:

`https://github.com/Doofwarrior/bh-studioofina.git`

Default branch:

`main`

The earlier local workspace had a temporary implementation branch named:

`qwen-code-3a5e5525-1ecc-4128-8d6a-ea82085dd6bc`

The S-2 implementation was committed locally as:

`29f5ca43d4f35056f76162dd82d881efcd91b4c7`

The GitHub PR used the branch:

`implement-decision-archive-viewer-dd6bc`

PR #8 was then merged into `main` with merge commit:

`12950f7a74f2e8ae901b53242fd5bdf32db23764`

A later roadmap checkpoint was added to `ROADMAP_REVISED.md`.

**Important:** If working in a new local workspace, do not assume the temporary qwen branch is the canonical current branch. The canonical GitHub integration target is `main`.

---

# 11. What changed in S-2, in one compact map

```text
Decision Archive skill/storage
        │
        │ existing appendDecision()
        ▼
   decisions.json
        │
        │ NEW readDecisions()
        ▼
DecisionArchivePage
        │
        ▼
DecisionArchiveViewer
        │
        ├── Card
        ├── Badge
        ├── formatDate
        └── locked / unlocked / AI-assisted metadata

Routing:
  /decisions

Navigation:
  Decision Archive
```

---

# 12. What the next chat must NOT do

Do not start with:

> “I will implement the backup system because that is next on the roadmap.”

That is unsafe and contradicted by the current storage implementation.

Do not start by changing source files.

Do not create S-3 from guesswork.

Do not “clean up” unrelated files.

Do not rewrite architecture.

Do not replace local storage with another database.

Do not create a new decision persistence mechanism.

Do not undo the Decision Archive Viewer.

---

# 13. Safe opening prompt for a new ChatGPT chat

Copy/paste this into the next chat if needed:

> **Continue BH Studioofina from the existing repository state. Do not restart or invent work. First inspect `ROADMAP_REVISED.md`, `docs/roadmap.md`, and the current `main` branch. S-2 Decision Archive Viewer is already merged into `main` via PR #8. The S-2 implementation commit is `29f5ca43d4f35056f76162dd82d881efcd91b4c7`; the merge commit is `12950f7a74f2e8ae901b53242fd5bdf32db23764`. S-2 changed only `src/lib/storage/index.ts`, `src/features/decisions/DecisionArchivePage.tsx`, `src/features/decisions/DecisionArchiveViewer.tsx`, `src/app/routes/index.tsx`, and `src/app/layouts/RootLayout.tsx`. Build passed (~433.73 kB) and lint passed with 0 errors and 9 pre-existing warnings. The storage layer already auto-backs up files before overwrite, so do NOT invent a duplicate backup subsystem. There is currently no authoritative definition of S-3. Recover the missing roadmap/source-of-truth context first. If it cannot be recovered, stop and report the gap rather than implementing a guessed feature. Do not refactor unrelated code, change architecture, fabricate requirements, or modify source files until the next slice is authoritative.**

---

# 14. Final checkpoint

```text
PROJECT: BH Studioofina
ARCHITECTURE: v1.0 locked / narrow-slice
CURRENT RELEASE STATE: S-2 merged
S-2: COMPLETE ✅
S-2 PR: #8 merged ✅
S-2 implementation commit: 29f5ca43d4f35056f76162dd82d881efcd91b4c7
S-2 merge commit: 12950f7a74f2e8ae901b53242fd5bdf32db23764
BUILD: PASS
LINT: PASS (0 errors; 9 pre-existing warnings)
BACKUP: already exists in storage layer
S-3: UNDEFINED / BLOCKED
NEXT ACTION: recover authoritative roadmap context
IMPLEMENTATION: PAUSED until S-3 is authoritative
```

**Decision:** preserve the current repository state. Do not fill the roadmap gap with an invented feature.