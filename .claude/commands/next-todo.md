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
3. If more than one slush branch is needed or detected for the phase, stop and alert Admiral.

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

## Execution Algorithm

1. Identify the active phase and next incomplete task in `plan/todo/`.
2. Verify dependencies and preconditions.
3. Create/checkout phase slush branch policy-compliantly.
4. Create task branch from the phase slush branch.
5. Execute subtasks as commit-sized increments (TDD-first where applicable).
6. After each built item:
   - check implementation quality
   - update TODO status in `plan/todo/*.md`
   - resolve merge conflicts with the appropriate target branch
7. Open PR task -> phase slush, resolve issues, merge.
8. At phase completion:
   - validate completed work as a whole
   - ensure all pipelines pass
   - spellcheck
   - linter check
   - security gap check
   - harden completed work
   - then prepare merge to `main`

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
