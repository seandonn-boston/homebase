# /phase-closeout

Perform end-of-phase verification, hardening, and merge preparation for a completed phase slush branch.

## Mission

Close a phase safely and completely before merging to `main`.

## Inputs

- Required argument: phase identifier (for example: `phase 02`)
- Optional argument: slush branch name (for example: `slush/phase-02-spec-debt`)
- Source of truth:
  - `plan/todo/*.md`
  - `plan/ROADMAP.md`
  - current repository CI state

## Hard Rules

1. `aiStrat/` is read-only. Never modify files under `aiStrat/`.
2. Apply **Clean as you go** during closeout fixes.
3. Do not get blocked. If blocked (policy/tooling/permissions), alert Admiral with:
   - what is blocked
   - why it is blocked
   - recommended resolutions
4. Do not merge to `main` until all required checks in this command pass.

## Preconditions

1. Confirm all phase tasks are complete in `plan/todo/*.md`.
2. Confirm task PRs are merged into the phase slush branch.
3. Confirm no unresolved merge conflicts remain.

## Required Closeout Checks

Run and pass all of the following for the phase as a whole set:

1. Full test suite (happy path and not-happy-path coverage remains valid).
2. Full lint/format checks.
3. Spellcheck for changed docs and user-facing text.
4. Security gap review and hardening pass.
5. CI pipeline status green for required workflows.

If any check fails:

1. Fix the issue on the phase slush branch.
2. Re-run failed checks.
3. Repeat until all checks pass or escalate to Admiral with recommended solutions.

## Merge Flow

1. Sync main first:
   - `git checkout main`
   - `git pull --ff-only`
2. Checkout phase slush branch and rebase/merge latest main as policy requires.
3. Resolve conflicts and re-run required closeout checks.
4. Locate the existing slush→main PR (opened when the slush branch was created per `/next-todo` policy). If it does not exist, open one now.
5. Update the slush→main PR body with closeout results (checks run, fixes applied, CI status).
6. Ensure required CI checks are green.
7. **Do NOT merge the slush→main PR.** Mark it as ready for Admiral review and notify the Admiral.
   - Only an Admiral may approve and merge slush branches into `main`.

## TODO Updates

Before and after merge:

1. Update phase/task statuses in `plan/todo/*.md`.
2. Add concise closeout notes: checks run, outcomes, hardening performed, and merge result.
3. If closeout blocked, record blocked state and Admiral escalation note.

## Output Contract (always include)

1. Phase and slush branch targeted.
2. Preconditions status.
3. Closeout checks run and results (tests, lint, spellcheck, security, CI).
4. Fixes applied during closeout.
5. TODO updates made.
6. PR/merge status into `main`.
7. Any Admiral escalation details and recommended solutions.

## Non-Goals

- Do not create new TODO items.
- Do not modify `aiStrat/`.
- Do not bypass required CI or quality gates.
