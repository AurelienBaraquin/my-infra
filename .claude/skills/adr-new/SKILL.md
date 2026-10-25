---
name: adr-new
description: Record a technical or process decision at the moment it is made — as an ADR in docs/adr/ when it is architectural, or as a dated line in the decisions log when it is smaller. Use whenever you or the user choose a dependency, pattern, data model, boundary, tool, or process, when a past decision is reversed or superseded, or when the user says "let's record this decision". Decisions are written in the same change as the code they drive.
---

# adr-new

Capture the *why* while it is still known. Decisions are allowed to change; what is not allowed
is for them to change silently or to be written up later as if they had been planned.

## 1. Decide: ADR or log line

Write an **ADR** when the decision is hard or costly to reverse, or shapes how others write code:
a framework, database or broker, a layering or data-model rule, an auth scheme, a deployment or
release approach, a testing strategy, a cross-cutting convention.

Write a **log line** (`.assistant/decisions-log.md`) for smaller choices: a library for one
feature, a threshold, a workaround, a process tweak. Format:
`YYYY-MM-DD — what was decided — why (the trade-off)`.

When unsure, write the log line, and promote it to an ADR the day it constrains other work.

## 2. Make sure it really is a decision

- At least **two real options** were weighed. If the user has not weighed alternatives, name the
  credible ones with their honest trade-offs and ask which they choose — do not write a
  one-sided ADR.
- If the choice is not made yet, write the ADR as **Proposed**, or record an *Open question* in
  `CLAUDE.md` instead. Never present a hunch as a decision.

## 3. Write the ADR

1. Find the next number: highest `NNNN-*.md` in `docs/adr/` plus one (4 digits, no gaps).
2. Copy `docs/adr/0000-template.md` to `docs/adr/NNNN-short-kebab-title.md`.
3. Title line `# ADR-NNNN — <title>`, then fill every field:
   - **Status**: `Accepted` (or `Proposed`).
   - **Date**: `date +%F`, never guessed.
   - **Deciders**: who actually decided.
   - **Context**, **Options considered**, **Decision**, **Consequences** (positive, trade-offs,
     follow-ups).
4. Keep it to about one page. Link code and documents by path.

## 4. Superseding or reversing a decision

- Write a **new** ADR with `Supersedes: ADR-OLD`.
- In the old ADR change only the status line to `Superseded by ADR-NEW`. Do not rewrite its body.

## 5. Retroactive records

If the decision was taken earlier and you are documenting it now, say so in the ADR's context
("Recorded retroactively on <date> from <source>") and use the real original date for the
decision. Never present it as contemporaneous.

## 6. Keep everything consistent, in the same change

- Add a one-line pointer in `.assistant/decisions-log.md` (`… — see ADR-NNNN`).
- If the decision changes the structure, update `docs/architecture.md`.
- If it introduces, replaces or removes a technology, service or tool, update `docs/technologies.md`
  (or that item's own document) and its row in `docs/README.md`.
- If it changes the scope, priorities or success criteria, update `docs/brief.md` — after the
  user agrees, since the brief is the owner's statement of intent.
- If it makes a rule in `CLAUDE.md` obsolete or adds one, update `CLAUDE.md`.
- Run `node scripts/check-docs.mjs` (numbering, status, links).
- The ADR travels in the same commit or PR as the code it governs.
