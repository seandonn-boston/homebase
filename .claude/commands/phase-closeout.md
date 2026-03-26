# /phase-closeout

Verify, harden, and prepare a completed phase for merge to `main`.

> **Prerequisites:** See [`_primer.md`](_primer.md) for operational definitions (Admiral, Work Hierarchy, Decision Authority, Recovery Ladder, etc.)

## Mission

Close a phase safely and completely. The Admiral merges — you prove it's ready.

## Entry State

- All phase tasks are complete in `plan/todo/*.md`.
- All task PRs are merged into the phase slush branch.
- No unresolved merge conflicts.
- You are on the phase slush branch.

## Exit State

- All closeout checks pass (tests, lint, spellcheck, security, CI).
- Gate check passes.
- Stationary documents are updated.
- Slush→main PR is updated with closeout results and marked ready for Admiral review.
- Slush→main PR is **NOT merged**. Only the Admiral merges.

## Inputs

- Required: phase identifier (e.g., `phase 02`)
- Optional: slush branch name (e.g., `slush/phase-02-spec-debt`)
- Source of truth: `plan/todo/*.md`, `plan/ROADMAP.md`, CI state

## Session Continuity Protocol

Closeout is multi-step and stateful. If a session is interrupted mid-closeout, detect progress before restarting:

1. **Check closeout progress from git:**
   - `git log --oneline -20` on the slush branch — look for closeout-related commits (fix commits, stationary updates, spellcheck fixes).
   - Check `git diff main..HEAD --stat` to see total phase changes.
   - Check `gh pr list --base main --head slush/phase-<NN>-<slug>` — if the PR body contains closeout results, the merge flow step was reached.

2. **Determine which steps are complete:**
   - If closeout fix commits exist → checks were already run and some failures were found and fixed.
   - If stationary update commits exist → gate check passed, stationaries are done.
   - If PR body contains closeout results → merge flow was reached. Verify CI is still green.

3. **Resume from the interrupted step**, not from scratch. Re-run checks only if fixes were applied since the last run.

4. **Report**: `CLOSEOUT RESUMING: [which step was reached, what remains]`

## Completion Assessment

**Before any mechanical checks**, honestly assess whether the phase delivered what it was designed to deliver. This is the most important part of closeout — everything else is verification machinery. If you rush this, the rest is theater.

Evaluate across five dimensions. Include the full assessment in the Output Contract.

**Deterministic** — provable, repeatable:

1. **Was it completed as designed?** Compare the ROADMAP's scope and exit criteria against what was built. Name the gaps.
2. **Do tests prove it works?** Are tests meaningful assertions, or perfunctory checks that always pass? Could this green suite hide broken functionality?

**Probabilistic** — likely outcomes under real conditions:

3. **Is it useful?** Does it solve real problems, or is it ceremony? Would a developer picking up this codebase find the deliverables genuinely helpful?
4. **Is it capable?** Does it work under real conditions — not just the happy path, but messy actual use?
5. **Is it robust?** Edge cases, missing inputs, corrupt state, absent dependencies — tested or assumed away?

**Virtual** — development/simulated environments:

6. **Is it grounded?** Anchored in the spec and real codebase needs, or theoretical infrastructure nothing consumes yet?
7. **Is it simple?** Could the same outcomes have been achieved with less code, fewer files, a more direct approach?

**Visual** — observable confirmation:

8. **Can you see it working?** Run CLI tools and include output. Link to passing CI runs. Show schema validation passes and fails. Evidence over assertion.

**Verifiable** — third-party confirmable:

9. **Could someone else confirm this?** Is documentation sufficient for another developer or agent to verify independently, without this session's context?

If any answer reveals a significant gap: fix it before proceeding, or escalate with a recommendation.

### What goes wrong during assessment

- **Completion bias.** The strongest pull is to say "yes" to all 9 questions and move on. If you find yourself answering "yes" to everything without evidence, slow down. Perfect scores are a red flag.
- **Confusing "tests pass" with "it works."** Tests prove what they test. They don't prove what they don't test. Question #2 exists to catch this.
- **Grounding drift.** A phase can produce technically correct work that nothing actually uses. Question #6 catches infrastructure built for hypothetical futures.

## Required Closeout Checks

Run and pass all of the following for the phase **as a whole set**:

1. Full test suite (happy + unhappy path coverage).
2. Full lint/format checks.
3. Spellcheck for changed docs and user-facing text.
4. Security gap review and hardening pass.
5. CI pipeline green for required workflows.

If any check fails: fix on the slush branch, re-run the failed check. If a fix introduces new failures, re-run the full set.

## Blocked Task Relocation

For tasks that remain incomplete due to genuine blockers:

1. Identify which blocker each task depends on and which phase resolves it.
2. If the blocker is resolved in a **later** phase → relocate the task:
   - Add it to the appropriate later phase's `plan/todo/*.md`, near where its blocker is resolved.
   - Mark it with a deferral note and cross-reference in the current phase's TODO.
3. Do NOT relocate tasks whose blockers are from the active or previous phases — these are genuine incomplete work and must remain visible.

## Gate Check

**All must pass before stationary updates:**

1. Every task accounted for — complete, deferred with documented blocker, or relocated.
2. Linters pass on all changed files.
3. Full test suite passes.
4. CI pipeline green.

If any gate fails, fix and re-check. Do not proceed to stationary updates with a failing gate.

## Stationary Updates

**Only after the gate check passes**, update standing documents to reflect current project state:

1. **README.md** — badges, feature highlights, project status.
2. **plan/index.md** — scores, gap descriptions, completion counts.
3. **ROADMAP.md** — phase completion notes.
4. **component_versions.json** — component versions and file lists.
5. Any other standing documents claiming counts, percentages, or statuses that changed.

## Merge Flow

1. Sync main: `git checkout main`, `git pull --ff-only`.
2. Checkout slush branch and rebase/merge latest main.
3. If conflicts arise, resolve and re-run closeout checks.
4. Locate the existing slush→main PR (opened by `/next-todo` when the slush branch was created). If missing, open one now.
5. Update the PR body with closeout results: checks run, fixes applied, CI status, completion assessment summary.
6. Ensure CI is green.
7. **Do NOT merge.** Mark ready for Admiral review.

## TODO Updates

Before stationary updates:

1. Update phase/task statuses in `plan/todo/*.md`.
2. Add concise closeout notes: checks run, outcomes, hardening performed.
3. If blocked, record blocked state and escalation note.

## What goes wrong during closeout

- **Tests pass locally but CI fails.** Environment differences. Check CI logs, fix the environment-specific issue, don't disable the CI check.
- **Spellcheck finds false positives.** Technical terms, acronyms, project-specific names. Add them to the spellcheck dictionary rather than ignoring the check.
- **Stationary updates conflict with ongoing work.** If another branch has updated `plan/index.md` or `README.md`, merge main into slush and resolve. Re-run gate check after resolution.
- **Blocked tasks have ambiguous blockers.** You can't tell if the blocker is this phase or a future phase. Leave it in the current phase — visibility is more important than tidiness. Note the ambiguity.
- **Phase is "complete" but the Completion Assessment reveals gaps.** This is the assessment working as intended. Fix what you can. For gaps that require significant new work, note them as findings in the Output Contract and let the Admiral decide whether to defer or extend the phase.

## Output Contract

```
CONTINUITY: [FRESH START | CLOSEOUT RESUMING: <details>]

COMPLETION ASSESSMENT:
1. Completed as designed: [answer with evidence]
2. Tests prove it works: [answer with evidence]
3. Useful: [answer with evidence]
4. Capable: [answer with evidence]
5. Robust: [answer with evidence]
6. Grounded: [answer with evidence]
7. Simple: [answer with evidence]
8. Can see it working: [answer with evidence]
9. Could someone else confirm: [answer with evidence]

PHASE: <NN> — <name>
SLUSH BRANCH: <branch name>
PRECONDITIONS: [all met | gaps found]
CLOSEOUT CHECKS: [tests, lint, spellcheck, security, CI — pass/fail each]
FIXES APPLIED: [what was fixed during closeout]
TODO UPDATES: [what was marked, annotated, relocated]
BLOCKED TASKS: [which tasks, relocated to which phase, why]
GATE CHECK: [all tasks accounted, linters, tests, CI — pass/fail each]
STATIONARY UPDATES: [which docs updated]
PR STATUS: [PR URL, CI status, marked for Admiral review]
ESCALATIONS: [if any — what, why, recommendation]
```

## Non-Goals

- Do not create new TODO items.
- Do not bypass CI or quality gates.
- Do not merge slush→main. Admiral approval required.
