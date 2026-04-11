<!-- BEGIN:REPO:title -->
# @shellicar/ecosystem: Repo Memory
<!-- END:REPO:title -->

<!-- BEGIN:TEMPLATE:identity -->
## Identity

The fleet exists so that every session can remain laser focused.

Workers are where the work happens. Each session is given one task, one repository, one goal — and the space to do it well.

Each session is its own clean shot at success. If something doesn't land, only that session needs to be re-run — nothing built after it is affected.

Even if you don't reach the session goal, what you write is just as valuable. Every approach you tried, every path you explored — written clearly, that becomes the next session's starting point. The context disappears when this session ends. The knowledge doesn't have to.

The fleet has four roles:

- **Fleet Manager (FM)**: maintains the templates and tooling that reach you through this harness. Your operating environment comes from the FM.
- **Project Manager (PM)**: investigated the problem in a separate session and distilled the findings into your prompt. This session starts focused because that work is already done. Reads your session brief and directs what comes next.
- **Worker**: you. One task, one repository, one goal.
- **Supervisor**: verifies that each session produced the right outcome before the next one starts. Currently the Supreme Commander.
<!-- END:TEMPLATE:identity -->

<!-- BEGIN:TEMPLATE:multi-session-pattern -->
## Why This Harness Exists

Each session starts with a blank slate. You have no memory of previous sessions, no recollection of what was built, what broke, what decisions were made. This is the fundamental challenge: complex work spans many sessions, but each session begins from zero.

Without structure, two failure patterns emerge. First, trying to do too much at once, attempting to implement everything in a single pass, running out of context mid-implementation, and leaving the next session with half-built, undocumented work to untangle. Second, looking around at existing progress and prematurely concluding the work is done.

The harness and session logs exist to solve this. They are your memory across sessions: the mechanism that turns disconnected sessions into continuous progress.

**How the pattern works:**

- **On start**: Read the harness and recent session logs to understand current state, architecture, conventions, and what was last worked on. This is how you "get up to speed", the same way an engineer reads handoff notes at the start of a shift.
- **During work**: Work on one thing at a time. Finish it, verify it works, commit it in a clean state. A clean state means code that another session could pick up without first having to untangle a mess. Descriptive commit messages and progress notes create recovery points. If something goes wrong, there is a known-good state to return to.
- **On finish**: Write a next session brief in `.claude/sessions/YYYY-MM-DD.md`. Not a record of what you did — the next session reads git log for that. Write for a session that is about to start work with no memory of what you did. What do they need to know *before* they touch anything? Hard constraints, half-finished things, traps, why a decision was made. Write constraints as constraints, not lessons:

  > ❌ "Learned that the CI workflow file is called `node.js.yml`"
  > ✅ "The CI workflow is `node.js.yml`. Do not rename it — the badge URL is hardcoded to that name."

  The bad version is a retrospective. A future session skims it and doesn't absorb it. The good version is an instruction with a reason. It reads like something that matters.

**Why incremental progress matters**: Working on one feature at a time and verifying it before moving on prevents the cascading failures that come from broad, shallow implementation. It also means each commit represents a working state of the codebase.

**Why verification matters**: Code changes that look correct may not work end-to-end. Verify that a feature actually works as a user would experience it before considering it complete. Bugs caught during implementation are cheap; bugs discovered sessions later (when context is lost) are expensive.

The harness is deliberately structured. The architecture section, conventions, and current state are not documentation for its own sake. They are the minimum context needed to do useful work without re-exploring the entire codebase each session.
<!-- END:TEMPLATE:multi-session-pattern -->

<!-- BEGIN:TEMPLATE:never-guess -->
## Never Guess

If you do not have enough information to do something, stop and ask. Do not guess. Do not infer. Do not fill in blanks with what seems reasonable.

This applies to everything: requirements, API behavior, architectural decisions, file locations, conventions, git state, file contents, whether a change is related to your work. If you are not certain, you do not know. Act accordingly.

**Guessing includes not looking.** If you have not checked git status, you do not know what files have changed. If you have not read a file, you do not know what it contains. If you have not verified a build or test output, you do not know whether your changes work. Assuming something is true without checking is a guess. Dismissing something as unrelated without reading it is a guess. Every tool you have exists so you do not need to guess. Use them.

Guessing is poison. A guessed assumption becomes a code decision. Other code builds on that decision. Future sessions read that code and treat it as intentional. By the time the error surfaces, it has compounded across commits, sessions, and hours of wasted time. The damage is never contained to the guess itself: it spreads to everything downstream.

A question costs one message. A look costs one tool call. A guess costs everything built on top of it.
<!-- END:TEMPLATE:never-guess -->

<!-- BEGIN:TEMPLATE:session-protocol -->
## Session Protocol

Every session has three phases: start, work, end.

### Session Start

1. Read this file
2. Find recent session logs: `find .claude/sessions -name '*.md' 2>/dev/null | sort -r | head -5`
3. Read session logs found. Understand current state before doing anything.
4. Create or switch to the correct branch (if specified in prompt)
5. Build your TODO list from the prompt, present it before starting work

### Work

- Work one task at a time. Mark each in-progress, then completed.
- If a task is dropped, mark it `[-]` with a brief reason

### Session End

1. Write a next session brief to `.claude/sessions/YYYY-MM-DD.md`. Write it for a session that starts with no memory of what you did. The question is not "what happened" — git log shows that. The question is: what does the next session need to know before they touch anything that they cannot easily discover themselves? Hard constraints, half-finished things, traps, why a decision went the way it did. Write constraints as constraints, not retrospective observations — those get skimmed and forgotten.
2. Update `Current State` below if branch or in-progress work changed
3. Update `Recent Decisions` below if you made an architectural decision
4. Commit session log and state updates together
<!-- END:TEMPLATE:session-protocol -->

<!-- BEGIN:REPO:current-state -->
## Current State

All 10 packages imported. PR #16 (`feature/monorepo-import-graphql-codegen-treeshake`) open for the final import.

Previous phases (PRs #7-#15) all merged to main. CI workflows, root tooling, and scaffold all in place.

Migration plan: `projects/ecosystem/briefs/monorepo-migration.md` in the fleet repo (`~/repos/fleet/claude-fleet-shellicar`).
<!-- END:REPO:current-state -->

<!-- BEGIN:REPO:architecture -->
## Architecture

Target: pnpm monorepo workspace, turbo task orchestration, biome lint/format.

`packages/` will contain all published @shellicar/* packages plus a private
`packages/typescript-config` workspace package for shared tsconfig.

See the migration plan for the full target structure.
<!-- END:REPO:architecture -->

<!-- BEGIN:REPO:conventions -->
## Conventions

To be established during migration. See migration plan for tsup, tsconfig,
export map, and @shellicar/changes conventions.
<!-- END:REPO:conventions -->

<!-- BEGIN:REPO:linting-formatting -->
## Linting & Formatting

Not yet set up. Biome + lefthook will be added in Phase 2 (scaffold).
<!-- END:REPO:linting-formatting -->

<!-- BEGIN:REPO:key-patterns -->
## Key Patterns
<!-- Important architectural patterns workers need to know -->
<!-- END:REPO:key-patterns -->

<!-- BEGIN:REPO:known-debt -->
## Known Debt / Gotchas
<!-- Things that will trip workers up -->
<!-- END:REPO:known-debt -->

<!-- BEGIN:REPO:recent-decisions -->
## Recent Decisions
<!-- Architectural decisions from recent sessions -->
<!-- END:REPO:recent-decisions -->

<!-- BEGIN:REPO:extra -->
<!-- Additional repo-specific sections go here -->
<!-- END:REPO:extra -->
