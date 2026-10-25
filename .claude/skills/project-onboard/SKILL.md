---
name: project-onboard
description: Bring an agent that is new to a project up to speed — read the project's foundation documents in the right order, check them against reality, and give a short briefing on what the project is, how to work in it, what constrains the task and where things stand — then take the mission if one was given. Read-only: it changes nothing. Use at the start of a session in a project, when a new or sub-agent arrives without context, or before giving an agent a mission on an existing project.
---

# project-onboard

A new agent knows nothing about the project, and a wrong picture is worse than none: it produces
confident work that contradicts the project's rules and decisions. This skill gives the agent a
**verified working understanding** first, and only then a mission. It is the same for a fresh
session, a teammate's agent, or a sub-agent.

**Read-only.** Do not create, edit or delete files, commit, install, build or run tests. If you
find a problem (stale documentation, missing files), report it; `project-sync` fixes it.

## Principles

1. **Context first, mission second.** Finish the briefing before acting on the mission.
2. **Only what the mission needs.** The foundation is small, but ADRs and architecture can be
   long: read the core in full, then only the parts the mission touches.
3. **Documents can be wrong.** Spot-check the claims you will rely on against the code, and treat
   anything the docs check flags as unverified.
4. **Say what you do not know.** Missing documents, open questions and stale statements are part
   of the briefing, not something to smooth over.
5. **The rules of the project bind you.** Its working mode and its "always ask before" list govern
   what you do next.

## Procedure

### 1. The mission
Take what the user wrote when invoking the skill beyond the request to onboard: that is the
mission. If there is none, you will ask for it after the briefing. Do not start on it yet.

### 2. Get the context pack
```bash
node <skill-dir>/scripts/context-pack.mjs <project-root>
```
It lists which foundation documents exist and how long they are, the documentation index, the
ADRs with their status, shows the latest decisions and lessons, the open questions, the git state (branch,
uncommitted changes, recent commits) and whether the documentation check passes.

If **no foundation document exists**, say so, and say what you can still learn from the README,
manifests and git history, labelled as inference. Suggest `project-init` (new project) or
`project-adopt` (existing codebase) to the user; do not run them unasked.

### 3. Read, in this order
| Document | How much |
|---|---|
| `CLAUDE.md` | All of it: the map, the hard rules, the working mode, the protocol |
| `docs/brief.md` | All of it: what to build, scope in and out, priorities |
| `docs/README.md` | The documentation index: which documents exist and what each covers. Open the ones that cover what the mission touches (API, deployment, CI, tests, technologies…) |
| `docs/architecture.md` | The layout and conventions; the sections the mission touches |
| ADRs | Titles and status from the pack; open only those that concern the mission, plus any `Proposed`. Skip superseded ones unless the mission touches them |
| Latest decisions-log entries, lessons | As shown in the pack; open the files only if something is relevant |
| `.assistant/takeover-report.md` | Only for an adopted project: baseline and known risks |

When the mission is unknown, read the core only (the first four rows).

### 4. Check the picture against reality
Do not run tests or builds. Spot-check the two or three statements you will rely on most: that
the module the mission concerns exists where the architecture says, that the command the rules
mention exists in the manifest, that a cited decision is not superseded. If the pack reported
documentation problems, treat the affected statements as unverified and say which.

### 5. State of play
Note the branch and any uncommitted changes. Uncommitted changes may be someone else's work in
progress: never discard or overwrite them. Read the recent commits to see what is in flight.

### 6. Brief the user
Short — about 25 lines, in the user's language:
- **Project**: what it is and for whom, in one or two sentences.
- **How I must work**: the working mode, the "always ask before" list, the rules that matter for
  the mission.
- **Structure**: the map that matters here.
- **Decisions and lessons that constrain the mission.**
- **State of play**: branch, work in flight.
- **Doubts**: missing or stale documents, open questions that touch the mission.
- **Mission**: restate it in one line and say how the context shapes it, or, if none was given,
  ask what the mission is.

A sub-agent keeps this to about ten lines and returns it first in its report.

### 7. Then act within the project's rules
- Follow the working mode of `CLAUDE.md`: if it asks for a plan and one approval, propose the
  plan and wait; if it says step by step, stop after each step. With no stated mode, propose a
  plan first whenever the mission changes the structure or is hard to reverse.
- Honour the "always ask before" list.
- When the mission ends, follow the Living documentation protocol in `CLAUDE.md`: record
  decisions with `adr-new`, keep `docs/architecture.md` true, run `project-sync`.

## Giving a sub-agent its context
When you spawn a sub-agent on a project that has a foundation, start its prompt with the
onboarding and then the mission: *"Use the project-onboard skill, then: <mission>."* If the
sub-agent cannot call skills, give it the reading list of step 3 directly and tell it the
project's working mode and "always ask before" list.
