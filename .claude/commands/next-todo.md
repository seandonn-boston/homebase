# /next-todo

Execute the next actionable work item from `plan/todo/`.

> **Prerequisites:** See [`_primer.md`](_primer.md) for operational definitions (Admiral, Work Hierarchy, Decision Authority, Recovery Ladder, etc.)

## Mission

Implement existing TODO items only. Do not invent new TODO items.

## Entry State

- `plan/todo/*.md` contains at least one incomplete task.
- You may or may not be on the correct branch — Session Continuity Protocol detects this.

## Exit State

- One task is complete with passing tests (happy + unhappy path).
- Task PR is merged into the phase slush branch.
- `plan/todo/*.md` is updated to reflect completed work.
- Working tree is clean on the phase slush branch.

## Inputs

- Optional argument: specific phase/task hint (e.g., `phase 02`, `SD-04`)
- Source of truth: `plan/todo/*.md`

## Session Continuity Protocol

A prior session may have been interrupted mid-task. **Before starting new work**, detect and resume:

1. **Detect active phase slush branch:**
   - `git branch -a | grep slush/`
   - If a slush branch exists, this phase is in progress.

2. **Detect in-progress task branch:**
   - `git branch -a | grep task/`
   - If an unmerged task branch exists for the active phase, work was interrupted mid-task.

3. **Recover context from git history:**
   - On the task branch: `git log --oneline slush/phase-<NN>-<slug>..HEAD` to see commits made so far.
   - Check `git status` and `git diff` for uncommitted work.
   - Check `git stash list` for stashed changes.
   - Read the latest commit messages — they describe what was completed.
   - Check `gh pr list --head <task-branch> --state all` — merged PR = task done; open = needs merging; none = still in progress.

4. **Recover task identity:**
   - The task branch name encodes phase and task ID: `task/phase-<NN>/<task-id>-<slug>`
   - Cross-reference against `plan/todo/*.md` to see what remains.

5. **Resume or advance:**
   - Uncommitted work on task branch → commit it, then continue.
   - Commits but no PR → finish remaining subtasks, open PR, merge.
   - Merged PR → task is done; advance to the next incomplete task.
   - No task branch exists → start the next incomplete task normally.

6. **Report continuity status** at the top of the Output Contract:
   - `RESUMING: task/phase-00/sd-10-fleet-protocol (3 commits found, PR not yet opened)`
   - or `FRESH START: no in-progress work detected`

## Work Hierarchy

- **Phase**: large body of work spanning multiple sessions/agents. One slush branch, one slush→main PR (Admiral-approved).
- **Task**: meaningful chunk within a phase. One task branch, one task→slush PR (self-merged).
- **Subtask**: one meaningful commit. No branch, no PR.

## Branch and PR Policy

### Phase-level

1. Sync main first: `git checkout main`, `git pull --ff-only`.
2. Ensure exactly one phase slush branch off main: `slush/phase-<NN>-<slug>`.
3. When creating a new slush branch, immediately push and open a PR to `main`:
   - Title: `Phase <NN>: <Phase Name>`
   - Body: scope summary from `plan/ROADMAP.md`
   - **Do NOT merge this PR.** Admiral approval required.
   - Include the slush→main PR URL in the Output Contract.
4. If more than one slush branch exists for the phase → escalate.

### Task-level

1. Create task branch from phase slush: `task/phase-<NN>/<task-id>-<slug>`
2. Complete task work on that branch.
3. Open PR from task branch to phase slush.
4. Resolve merge conflicts.
5. Merge PR into phase slush (autonomous — no human approval needed).
6. One task = one PR. If a task needs multiple PRs → escalate.

### Subtask-level

1. Subtask = one meaningful commit. No branch, no PR.
2. If a subtask needs multiple commits or a PR → promote it to a task and escalate.

## Parallel Worker Awareness

When multiple Claude Code instances run `/next-todo` in parallel (via git worktrees), **branch existence is the coordination lock:**

1. **Before selecting a task**, list all existing task branches:
   ```
   git branch -a --list 'task/phase-<NN>/*'
   ```
2. **Skip any task whose branch already exists** — another worker has claimed it.
3. **Select the next unclaimed, unblocked, incomplete task** from `plan/todo/*.md`.
4. **Create the task branch immediately** after selection to claim it — do not start work before the branch exists.

This ensures no two workers ever pick the same task, with zero external coordination beyond git itself.

## Execution Algorithm

1. **Run Session Continuity Protocol** to detect and resume in-progress work.
2. Identify the active phase and next incomplete task in `plan/todo/`.
3. **Check for claimed tasks**: list existing `task/phase-<NN>/*` branches. Skip tasks that already have a branch (claimed by another worker or prior session).
4. Verify dependencies and preconditions. If a task is blocked, skip it and take the next unblocked task.
5. Create/checkout phase slush branch per policy.
6. Create task branch from the phase slush branch (or checkout existing one). **This is the claim — do it before starting implementation.**
7. Execute subtasks as commit-sized increments:
   - First subtask: TDD-first (where applicable).
   - Each subtask: implement, commit, update TODO status.
   - Final subtask: run tests, run linters, cleanup, ensure CI passes. Fix failures before completion.
7. Open PR from task branch → phase slush. Resolve conflicts. Merge.
8. At phase completion, run `/phase-closeout` (do not merge slush to main directly).

## What goes wrong during task execution

These are the command-specific failure modes — situations Standing Orders and enforcement hooks don't cover:

- **Task is larger than expected.** A "task" turns out to need multiple PRs. Escalate immediately — don't split silently. The Work Hierarchy exists to keep phase→task→subtask mappings clean.
- **Dependencies between tasks are wrong.** A task claims no dependencies but actually requires another task's output. Skip it, note the real dependency in `plan/todo/*.md`, take the next task.
- **Merge conflicts with slush branch.** Another task landed on slush while you were working. Resolve on your task branch before opening the PR. If the conflict is architectural (not just textual), escalate.
- **Tests pass on task branch but fail on slush after merge.** The task PR merged but broke something. Fix on slush directly with a follow-up commit. Do not revert the merge unless the fix is non-trivial.
- **TODO item is ambiguous.** The task description doesn't clearly define done. Add concise DoD notes (happy path + unhappy path tests) to `plan/todo/*.md` before starting implementation.
- **Scope creep during implementation.** You discover adjacent work that "should" be done. Don't do it. Note it as a routing suggestion in the Output Contract.

## Definition of Done

Each task must have:
- Happy path tests
- Unhappy path tests

If missing from TODO docs, add concise DoD notes to `plan/todo/*.md` before marking complete.

## Output Contract

```
CONTINUITY: [FRESH START | RESUMING: <details>]

SELECTED: Phase <NN> / Task <ID> — [rationale for selection]
BRANCHES: [created/used]
COMMITS: [subtask → commit mapping]
TEST/LINT/CI: [results]
TODO UPDATES: [what was marked complete or annotated]
PR STATUS: [opened/merged/conflicts resolved]
ESCALATIONS: [if any — what, why, recommendation]
ROUTING SUGGESTIONS: [adjacent work discovered but not acted on]
```

## Non-Goals

- Do not invent new TODO items.
- Do not rewrite roadmap scope.
- Do not add extra slush branches for one phase.
- Do not split one task across multiple PRs unless escalated.
