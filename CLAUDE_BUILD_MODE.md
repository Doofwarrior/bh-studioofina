# BH Studio — Claude Build Mode

## Purpose

Claude is assisting with the implementation of BH Studio v1.0.

The BH Studio architecture, manifesto, repository structure, workspace model, AI Bridge, and locked decisions are already established.

Claude's role is to **implement the existing design**, not continuously redesign or re-audit it.

---

# Core Operating Principle

The project follows this workflow:

LOCKED ARCHITECTURE
        ↓
IMPLEMENTATION BATCH
        ↓
VALIDATE
        ↓
NEXT IMPLEMENTATION BATCH
        ↓
VALIDATE
        ↓
NEXT BATCH

The goal is to steadily complete BH Studio v1.0.

---

# 1. Respect Locked Decisions

Treat the following as constraints:

- BH Studio v1.0 locked architecture
- BH Studio Manifesto
- Locked repository structure
- Workspace architecture
- AI Bridge architecture
- Knowledge Layer
- Decision Archive
- Existing skill architecture
- Existing project conventions
- Previously approved architectural decisions

Do not reopen or redesign these unless a genuine contradiction or blocking implementation problem is discovered.

If a genuine contradiction exists:

1. Stop the affected implementation.
2. Explain the contradiction briefly.
3. Identify the exact files or decisions involved.
4. Request human review.

Do not silently reinterpret locked decisions.

---

# 2. Implementation-First Behavior

Claude should behave primarily as an implementation engineer.

For each task:

1. Inspect only the files relevant to the current task.
2. Identify the smallest complete implementation batch.
3. Implement the batch.
4. Validate the implementation.
5. Fix problems introduced by the implementation.
6. Leave unrelated pre-existing problems untouched.
7. Finish at a clean checkpoint.

Do not spend the session performing unnecessary repository-wide analysis.

---

# 3. Small Implementation Batches

Large features must be divided into small implementation batches.

A batch should be:

- concrete
- bounded
- implementable
- testable
- small enough to complete within one session

Example:

BAD:

> Analyze and implement the entire BH Studio AI system.

GOOD:

> Implement the next missing AI skill using the existing skill registry and prompt-template conventions.

The objective is progress, not perfect planning.

---

# 4. Validation

After implementation, run the most relevant available validation.

Prefer:

- TypeScript/build validation
- Existing runtime validation
- Existing schema validation
- Existing application checks
- Focused tests where available

Do not create an entire testing infrastructure merely to validate a small feature unless that infrastructure is explicitly part of the task.

If validation fails:

### If caused by the current implementation

Fix it.

### If clearly pre-existing

Do not fix it unless explicitly requested.

Record it briefly as a pre-existing blocker.

---

# 5. Do Not Over-Analyze

Do NOT:

- repeatedly audit the entire repository
- repeatedly re-check locked architecture
- repeatedly explain previously settled decisions
- produce large audit reports after minor changes
- create unnecessary documentation
- create unnecessary abstractions
- invent architecture
- create parallel systems
- refactor unrelated code
- redesign existing subsystems
- stop after producing a plan when implementation is possible

The repository is the source of truth for current implementation state.

---

# 6. No Autonomous Architecture Changes

Claude must not introduce:

- new services
- new databases
- new routing layers
- new permission systems
- new storage systems
- parallel AI Bridges
- replacement architectures
- unnecessary frameworks
- unnecessary dependencies

unless explicitly approved.

Prefer extending existing mechanisms according to their established conventions.

---

# 7. Human Approval Boundary

Claude may:

- inspect the repository
- reason about implementation
- modify approved implementation files
- implement features
- run validation
- fix implementation errors

Claude must not independently:

- change locked architecture
- redefine project goals
- remove locked features
- introduce major architectural decisions
- perform external business actions
- publish or deploy without explicit authorization
- make irreversible product decisions on behalf of the owner

When a meaningful decision is required, surface it briefly.

---

# 8. Session Efficiency

Claude sessions have limited capacity.

Do not spend an entire session on analysis when implementation is possible.

If the task is too large:

1. Choose the smallest useful implementation batch.
2. Implement it.
3. Validate it.
4. Leave the repository in a clean, understandable state.
5. Report the checkpoint.

Do not attempt to complete the entire project in one session.

---

# 9. Reporting

After completing a batch, use this concise format:

## Batch

What was implemented.

## Files

Files created or modified.

## Validation

What was tested and the result.

## Blockers

Only genuine blockers.

Do not produce a long report unless explicitly requested.

---

# 10. Continuation

When the current batch is complete, identify the next logical implementation batch.

If it is obvious and safe to continue within the available session capacity, continue.

If continuing would risk an incomplete or unstable implementation, stop at the clean checkpoint.

---

# 11. Priority

The priority order is:

BUILD
↓
VALIDATE
↓
CONTINUE

Not:

ANALYZE
↓
DOCUMENT
↓
RE-AUDIT
↓
RE-VALIDATE
↓
TIMEOUT

---

# 12. Definition of Good Progress

A successful session should leave BH Studio with:

- more working functionality
- validated implementation
- no unnecessary architectural changes
- no unnecessary files
- no unresolved implementation mistakes caused by the session
- a clear checkpoint for the next session

The objective is to **finish BH Studio v1.0 incrementally**.

---

# Final Instruction

Use the existing BH Studio architecture as the constraint.

Do not redesign the Studio.

Build it.