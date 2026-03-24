# /next-todo

Execute the next actionable work item from `plan/todo/` using the Admiral workflow.

## Mission

Implement existing TODO items only. Do not invent new TODO items.

## Inputs

- Optional argument: specific phase/task hint (for example: `phase 02`, `SD-04`)
- Source of truth: `plan/todo/*.md`

## Hard Rules

1. `aiStrat/` is read-only. Never modify files under `aiStrat/`.
2. Every TODO item includes the imperative: **Clean as you go**.
3. Do not get blocked. If blocked (including policy/tooling/permissions), alert the Admiral with:
   - what is blocked
   - why it is blocked
   - recommended resolutions
4. Do not create new TODO items. You may update status/checkmarks and execution notes for existing items.

## Work Hierarchy

- **Phase**: large body of work spanning multiple sessions/agents.
- **Task**: meaningful chunk within a phase; usually one branch and one PR.
- **Subtask**: one meaningful commit-sized unit; no PR.

## Branch and PR Policy

### Phase-level

1. Sync main first:
   - `git checkout main`
   - `git pull --ff-only`
2. Ensure exactly one phase slush branch off main, named:
   - `slush/phase-<NN>-<slug>`
3. When creating a new phase slush branch, immediately push it and open a PR from the slush branch to `main`:
   - Title: `Phase <NN>: <Phase Name>`
   - Body: summary of the phase scope from `plan/ROADMAP.md`
   - **Do NOT merge this PR.** It requires Admiral approval to merge.
   - Include the slush→main PR URL in the Output Contract.
4. If more than one slush branch is needed or detected for the phase, stop and alert Admiral.

### Task-level

1. Create task branch from phase slush:
   - `task/phase-<NN>/<task-id>-<slug>`
2. Complete task work on that branch.
3. Open PR from task branch to phase slush branch.
4. Resolve merge conflicts.
5. Merge PR into phase slush without human permission.
6. If unable to open/merge the PR autonomously, alert Admiral.
7. A task should not require multiple PRs. If it does, alert Admiral.

### Subtask-level

1. Subtask equals one meaningful commit.
2. Subtask must not require a PR.
3. If a subtask requires multiple commits or a PR, escalate it to a task and alert Admiral.

## Definition of Done Requirements

Each phase and each task must have a Definition of Done that includes:

- happy path tests
- not-happy-path tests

If missing from TODO docs, add concise DoD notes to the phase/task execution notes in `plan/todo/*.md` before marking complete.

## Required Subtask Ordering

1. First subtask for each task: TDD-first (where applicable).
2. Final subtask for each task and each phase:
   - run tests
   - run linters
   - cleanup
   - ensure CI passes
3. If any of these fail, fix before completion.

## Session Continuity Protocol

A prior session may have been interrupted mid-task. Before starting new work, detect and resume in-progress work:

1. **Detect active phase slush branch:**
   - `git branch -a | grep slush/`
   - If a slush branch exists, this phase is in progress.

2. **Detect in-progress task branch:**
   - `git branch -a | grep task/`
   - If an unmerged task branch exists for the active phase, work was interrupted mid-task.

3. **Recover context from git history:**
   - On the task branch: `git log --oneline slush/phase-<NN>-<slug>..HEAD` to see commits made so far.
   - Check `git status` and `git diff` for any uncommitted work.
   - Check `git stash list` for any stashed changes.
   - Read the latest commit messages — they describe what was completed.
   - Check `gh pr list --head <task-branch> --state all` — if a PR exists and is merged, the task is done; if open, it needs merging; if none, the task is still in progress.

4. **Recover task identity:**
   - The task branch name encodes phase and task ID: `task/phase-<NN>/<task-id>-<slug>`
   - Cross-reference the task ID against `plan/todo/*.md` to see what remains.

5. **Resume or advance:**
   - If the task branch has uncommitted work → commit it, then continue.
   - If the task branch has commits but no PR → finish remaining subtasks, open PR, merge.
   - If the task branch has a merged PR → the task is done; advance to the next incomplete task.
   - If no task branch exists → start the next incomplete task normally.

6. **Report continuity status** at the top of the Output Contract:
   - `RESUMING: task/phase-00/sd-10-fleet-protocol (3 commits found, PR not yet opened)`
   - or `FRESH START: no in-progress work detected`

## Execution Algorithm

1. **Run Session Continuity Protocol** (above) to detect and resume in-progress work.
2. Identify the active phase and next incomplete task in `plan/todo/`.
3. Verify dependencies and preconditions.
4. Create/checkout phase slush branch policy-compliantly.
5. Create task branch from the phase slush branch (or checkout existing one).
6. Execute subtasks as commit-sized increments (TDD-first where applicable).
7. After each built item:
   - check implementation quality
   - update TODO status in `plan/todo/*.md`
   - resolve merge conflicts with the appropriate target branch
8. Open PR task -> phase slush, resolve issues, merge.
9. At phase completion, run `/phase-closeout` (do not merge slush to main directly).

## Output Contract (always include)

1. Selected phase/task/subtask and rationale.
2. Branches created/used.
3. Commits made (subtask mapping).
4. Test/lint/CI results.
5. TODO status updates applied.
6. PR/merge status and conflict resolution notes.
7. Any Admiral alerts (with recommended solutions).

## Non-Goals

- Do not rewrite roadmap scope.
- Do not modify `aiStrat/`.
- Do not add extra slush branches for one phase.
- Do not split one task across multiple PRs unless escalated.
