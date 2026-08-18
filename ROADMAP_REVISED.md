# Revised Roadmap — BH Studioofina

**Status:** Active recovery checkpoint  
**Last updated:** 2026-08-18  
**Current completed slice:** S-2 — Decision Archive Viewer  
**Current next-slice status:** Blocked pending recovery of the missing authoritative roadmap context

## Purpose

This document replaces the missing `ROADMAP_REVISED.md` as the current engineering checkpoint for the project. It records only roadmap information supported by repository investigation and the completed S-2 work. It deliberately does **not** invent an S-3 feature where the repository history does not provide authoritative evidence.

## Source-of-truth rules

1. Work must follow the project's existing v1.0 architecture.
2. The roadmap and audit documents are treated as source-of-truth material; implementation must not invent missing roadmap slices.
3. Each implementation should remain a narrow, isolated slice.
4. Reuse existing storage APIs, types, routing, navigation, UI components, and toast patterns where applicable.
5. Do not introduce a new persistence layer when the authoritative storage layer already provides the required behavior.
6. Do not refactor unrelated code.
7. Do not fabricate missing data or requirements.

## Completed

### S-2 — Decision Archive Viewer

**Status:** ✅ Merged into `main`

Implementation completed and merged through PR #8.

Commit:

`29f5ca43d4f35056f76162dd82d881efcd91b4c7`

Implemented changes:

- Added `readDecisions()` to `src/lib/storage/index.ts` for reading decision entries.
- Added `src/features/decisions/DecisionArchiveViewer.tsx` for rendering decision cards.
- Added `src/features/decisions/DecisionArchivePage.tsx` for loading and displaying archive data.
- Added the `/decisions` route in `src/app/routes/index.tsx`.
- Added the **Decision Archive** navigation item in `src/app/layouts/RootLayout.tsx`.
- Reused existing `Card` and `Badge` UI components.
- Reused the existing storage architecture.
- Did not introduce a new persistence layer.
- Did not modify the roadmap or audit documents as part of S-2.

Validation reported for S-2:

- Build: ✅ Passed — approximately 433.73 kB bundle.
- Lint: ✅ Passed — 0 errors; 9 pre-existing warnings.

## Repository-history finding: backup behavior already exists

The old roadmap contains a planned **Backup system** item. Repository investigation found that the authoritative storage layer already implements backup behavior.

The current storage authority documents:

> “Auto-backs up any file before overwriting.”

`writeFile()` already creates a timestamped backup of existing content before overwriting it.

### Consequence

A new generic “Backup system” implementation must **not** be created merely because the old roadmap lists backup functionality. Doing so would duplicate existing storage behavior and would violate the project's narrow-slice and source-of-truth rules.

If a future roadmap slice explicitly requires a backup-related UI, inspection, recovery flow, retention policy, or other behavior, that work must be supported by authoritative roadmap/history evidence before implementation.

## Current roadmap gap

After S-2 was merged, repository investigation found:

```text
S-2
  ↓
merged into main
  ↓
old roadmap says “Backup system”
  ↓
storage already implements automatic backup
  ↓
no authoritative ROADMAP_REVISED.md was present
  ↓
no surviving branch provided authoritative evidence for the next numbered slice
```

The surviving `kimi-audit-snapshot` branch was also checked during the investigation; it contains the same old `docs/roadmap.md` and does not provide the missing revised roadmap.

Therefore, the absence of an S-3 definition is a **repository-history gap**, not a reason to guess the next feature.

## Next work item

### S-3 — Not yet defined

**Status:** ⏸️ Blocked pending recovery of authoritative roadmap context.

Do **not** implement a feature solely by assuming that the old roadmap's “Backup system” entry is S-3.

Before implementation resumes, recover or establish authoritative evidence for the next numbered slice from one or more of:

- the original project context/history,
- a surviving authoritative roadmap revision,
- a repository branch or commit containing the missing revised roadmap,
- or another explicit project source-of-truth that defines the next slice.

Once that evidence is recovered, update this document with the exact slice definition before implementation begins.

## Recovery procedure

1. Locate the missing authoritative roadmap revision or original project context.
2. Confirm the next numbered slice and its acceptance criteria.
3. Reconcile the recovered roadmap with the current `main` state, including merged S-2.
4. Verify whether any roadmap item is already implemented by the existing architecture/storage layer.
5. Record the confirmed next slice in this document.
6. Only then begin implementation of that slice.

## Explicitly out of scope until the next slice is recovered

- Inventing an S-3 feature.
- Building a new generic backup subsystem.
- Adding backup UI/API solely from the old roadmap wording.
- Introducing a new persistence layer.
- Refactoring unrelated architecture.
- Modifying audit documents to manufacture missing requirements.

## Current project state

```text
main
  └── S-2 Decision Archive Viewer
        ├── decision storage reader
        ├── archive viewer UI
        ├── archive page
        ├── /decisions route
        └── Decision Archive navigation item

Next:
  └── S-3 definition recovery required before implementation
```

## Decision

**Pause feature implementation at the merged S-2 state until the missing authoritative roadmap context is recovered.**

This is intentional: preserving the project's source-of-truth and narrow-slice architecture is more important than filling the roadmap gap with an invented feature.
