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

## Completion Assessment

Before any mechanical checks, honestly assess whether the phase delivered what it was designed to deliver. Evaluate across five verification dimensions and include the full assessment in the Output Contract.

### Evaluation Dimensions

**Deterministic** — provable, repeatable outcomes:

1. **Was the task completed as designed?** Compare the ROADMAP's stated scope and exit criteria against what was actually built. Identify gaps between intent and outcome.
2. **Do tests prove it works?** Are the tests meaningful assertions of behavior, or perfunctory checks that always pass? Could a test suite this green still hide broken functionality?

**Probabilistic** — likely outcomes under real conditions:

3. **Is it useful?** Does it solve real problems, or is it ceremony? Would a developer picking up this codebase find the deliverables genuinely helpful?
4. **Is it capable?** Does each deliverable function correctly under real conditions — not just the happy path tested in CI, but the messy conditions of actual use?
5. **Is it robust?** How does it handle edge cases, missing inputs, corrupt state, absent dependencies? Were failure modes tested or assumed away?

**Virtual** — behavior in development/simulated environments:

6. **Is it grounded?** Is the work anchored in the spec and the codebase's real needs, or did it drift into theoretical infrastructure that nothing consumes yet?
7. **Is it simple?** Could the same outcomes have been achieved with less code, fewer files, or a more direct approach? Is there unnecessary abstraction?

**Visual** — observable confirmation of correct behavior:

8. **Can you see it working?** For CLI tools: run them and include output. For CI workflows: link to passing runs. For schemas: show a validation pass and fail. Evidence over assertion.

**Verifiable** — third-party confirmable:

9. **Could someone else confirm this works?** Is the documentation sufficient for another developer or agent to verify the deliverables independently, without context from this session?

### User-Driven QA (future)

> The ultimate quality signal is ethical use of real user analytical data — actual usage patterns, failure rates, and outcomes observed in production. This requires Brain-level tracking infrastructure (B2+ with session telemetry, outcome recording, and feedback loops) which is not yet built. Until that infrastructure exists, the above assessment dimensions serve as the best available proxy. When Brain tracking is available, this section should evolve into a data-driven assessment referencing actual metrics rather than probabilistic self-evaluation. See EDD-01 through EDD-05 in `plan/todo/03-testing-and-code-quality.md` for the evaluation-driven design gate system that will formalize this.

If any answer reveals a significant gap, note it as a finding and either fix it before proceeding or escalate to the Admiral with a recommendation.

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

Before stationary updates:

1. Update phase/task statuses in `plan/todo/*.md`.
2. Add concise closeout notes: checks run, outcomes, hardening performed, and merge result.
3. If closeout blocked, record blocked state and Admiral escalation note.

## Blocked Task Relocation

After TODO updates, for any tasks that remain incomplete due to genuine blockers:

1. Identify which blocker each task depends on and which phase resolves that blocker.
2. If the blocker is resolved by work in a **later** phase (not the active or any previous phase), relocate the task:
   - Add the task to the appropriate later phase's `plan/todo/*.md` file, near where its blocker is resolved.
   - In the current phase's TODO, mark the task with a deferral note and cross-reference to the destination file.
3. Do NOT relocate tasks whose blockers are from the active or previous phases — these are genuine incomplete work and should remain visible as such.

## Gate Check

**All of the following must pass before proceeding to stationary updates:**

1. All tasks accounted for — every item is either complete, deferred with documented blocker, or relocated to a later phase.
2. Linters pass on all changed files.
3. Full test suite passes.
4. CI pipeline is green.

If any gate fails, fix and re-check before continuing.

## Stationary Updates

**Only after the gate check passes**, update standing documents ("stationaries") to reflect the current state of the project:

1. **README.md** — update badges, feature highlights, project status, or any sections that reference capabilities added in this phase.
2. **plan/index.md** — update scores, gap descriptions, or completion counts if they are stale relative to work completed.
3. **ROADMAP.md** — add phase completion notes if applicable.
4. **component_versions.json** — update component versions and file lists to include new artifacts.
5. Any other standing documents that claim specific counts, percentages, or statuses that have changed.

After stationary updates, push and request Admiral review of the slush→main PR one final time.

## Output Contract (always include)

1. **Completion assessment** — honest answers to all 6 questions (useful, capable, robust, grounded, simple, as-designed).
2. Phase and slush branch targeted.
3. Preconditions status.
4. Closeout checks run and results (tests, lint, spellcheck, security, CI).
5. Fixes applied during closeout.
6. TODO updates made.
7. Blocked tasks relocated (which tasks, to which phase, why).
8. Gate check results (all tasks accounted for, linters, tests, CI).
9. Stationary updates applied (README, index, ROADMAP, component_versions, etc.).
10. PR/merge status into `main`.
11. Any Admiral escalation details and recommended solutions.

## Non-Goals

- Do not create new TODO items.
- Do not modify `aiStrat/`.
- Do not bypass required CI or quality gates.
