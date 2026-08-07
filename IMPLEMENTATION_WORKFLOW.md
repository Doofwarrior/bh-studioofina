# BH Studio — Implementation Workflow

## Master Loop

BH Studio development follows one simple loop:

LOCKED ARCHITECTURE
        ↓
IMPLEMENTATION BATCH
        ↓
TEST / VALIDATE
        ↓
CLEAN CHECKPOINT
        ↓
NEXT IMPLEMENTATION BATCH
        ↓
TEST / VALIDATE
        ↓
REPEAT

---

# Phase 1 — Select Batch

Before changing code:

- inspect the current repository state
- identify what is already complete
- identify the next missing piece
- choose the smallest useful implementation batch

Do not perform a full architecture audit.

Do not redesign completed systems.

---

# Phase 2 — Implement

Implement only the selected batch.

Follow:

- existing repository conventions
- existing component patterns
- existing TypeScript patterns
- existing AI skill patterns
- existing storage patterns
- existing UI patterns
- locked architecture

Prefer reuse over invention.

---

# Phase 3 — Validate

Immediately validate the batch.

Use the project's existing validation mechanisms.

Check:

- TypeScript
- build
- relevant runtime behavior
- relevant schemas
- relevant existing tests

Do not allow unrelated pre-existing errors to expand the scope.

---

# Phase 4 — Fix

If the batch introduced an error:

FIX IT.

If an error existed before the batch:

DO NOT FIX IT unless it blocks the current work or the owner explicitly requests it.

---

# Phase 5 — Checkpoint

When the batch is complete:

- verify changed files
- verify implementation
- verify validation
- ensure no temporary files remain
- ensure no unrelated changes were introduced

Leave the repository in a clean, understandable state.

---

# Phase 6 — Continue

Identify the next smallest useful batch.

Use this priority:

1. Core functionality
2. Required integrations
3. User-facing functionality
4. Validation
5. Polish
6. Optional improvements

Do not work on polish while required functionality is incomplete.

---

# Batch Rules

Each batch should answer:

### What?

Exactly what is being built.

### Where?

Exactly which files/components are involved.

### Why?

What existing BH Studio requirement it satisfies.

### Done when?

What condition proves the batch is complete.

---

# Example

## Batch

Implement the next missing AI skill.

### Scope

- skill folder
- skill schema
- prompt template
- existing registry entry

### Do not touch

- AI Bridge
- Workspace architecture
- Knowledge Layer
- Decision Archive
- unrelated skills

### Done when

- skill registered
- schema validates
- prompt integrates with existing mechanism
- relevant validation passes

Then move to the next batch.

---

# Session Rule

Never sacrifice a clean implementation for the appearance of progress.

A smaller completed batch is better than a huge partially implemented feature.

---

# Core Principle

Every session should move the repository forward.

The correct question is not:

> "What else can we analyze?"

The correct question is:

> "What is the smallest concrete thing we can build next that advances BH Studio toward v1.0?"