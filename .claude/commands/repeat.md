# /repeat

Run a task in an event-driven loop, re-triggering when specified criteria are met rather than on a timer.

> **Prerequisites:** See [`_primer.md`](_primer.md) for operational definitions (Admiral, Work Hierarchy, Decision Authority, Recovery Ladder, etc.)

## Mission

Execute a task chain repeatedly. Each iteration runs until a condition (repeatFlag) is satisfied, then executes transition logic (exitStrategy), then starts again. The loop is event-driven — for timer-based repetition, use `/loop`.

## Entry State

- A valid `/repeat` invocation with all required parameters.
- Git state is recoverable (branches, PRs, TODOs) for session continuity.

## Exit State

- `endRepeat` condition satisfied, OR user interruption, OR unrecoverable error.
- Current iteration's work is committed and checkpoint is produced.
- Git working tree is clean.

## Syntax

```
/repeat {task: `<commands>`,
         exitStrategy: "<transition logic>",
         repeatFlag: <condition>,
         conditions: [...],
         endRepeat: "<termination condition>"}
```

## Parameters

### Required

- **task**: The command chain to execute each iteration. See **Task Syntax** below.
- **repeatFlag**: The condition that signals iteration completion.
  - Slash command reference (e.g., `/phase-closeout`): fires when that command completes successfully.
  - Plain-language condition: evaluated honestly after each major step.
- **exitStrategy**: What to do between iterations — branch creation, state reset, context advancement. See **Exit Strategy Contract** below.

### Optional

- **conditions**: Standing rules enforced throughout every iteration. See **Condition Categories** below. Violation is immediate and unrecoverable — no Recovery Ladder.
- **endRepeat**: Termination condition that ends the loop gracefully. Evaluated after each major step alongside repeatFlag. When satisfied, the current step completes, then the loop exits without starting a new iteration.

## Task Syntax

Three composition patterns, freely combinable:

### 1. Slash command chaining

Semicolon-separated, sequential, left to right. Each must complete before the next begins.

```
task: `/next-todo; /simplify; /phase-closeout`
```

### 2. Sub-command arguments

Flags and directive arrays that scope a slash command's behavior for this invocation only.

```
/plan --auto-approve ["Build in correct order", "Use slush branch conventions"]
```

- **Flags** (`--flag-name`): Boolean on/off switches. Unrecognized flags are logged as warnings and ignored.
- **Directive arrays** (`["...", "..."]`): Plain-language instructions appended to the sub-command's mission for this invocation. Do not persist across iterations or carry to subsequent commands.

Positional: flags and directives attach to the slash command immediately preceding them.

### 3. Inline prose directives

Double-quoted strings between commands. Executed as standalone evaluation steps.

```
task: `/plan; "Verify the phase objective is genuinely met"; /phase-closeout`
```

- Must be evaluated honestly — not rubber-stamped.
- Treated as verification gates: if fail, do not proceed. Assess what needs to change.
- Logged with pass/fail, evidence, and reasoning in the Output Contract.

## Condition Categories

### Constraints

Absolute restrictions. Violations stop the loop immediately.

```
"Do not write to aiStrat/"
"No compound commands in bash (no &&)"
```

### Permissions

Explicit grants that override default caution — elevating certain actions from Propose to Autonomous.

```
"Full read/write access in /technomancy-codex"
"May merge task PRs without human approval"
```

Permissions cannot override safety constraints or Standing Orders.

### Behavioral directives

Approach and priority guidance. Lowest precedence — they shape judgment, not mandate.

```
"Prefer small commits over large ones"
"Use existing patterns from the codebase"
```

### When conditions conflict

Highest to lowest precedence: Standing Orders (safety) → constraints → sub-command contracts → permissions → behavioral directives. If unresolvable, escalate.

## Exit Strategy Contract

The exitStrategy must:

1. **Execute fully** between every iteration. Skipping is a hard violation (unless `endRepeat` terminates the loop).
2. **Leave a clean entry state** for the next iteration:
   - Branches from the completed iteration are merged or cleaned up.
   - Working tree is clean.
   - Next iteration's starting branch exists and is checked out.
3. **Follow branch policy** from `/next-todo` if creating branches.

If the exitStrategy fails: follow the Recovery Ladder. Do not start the next iteration with a dirty transition.

## endRepeat Evaluation

### Plain-language conditions

Evaluated honestly using available information. "All phases complete" → check `plan/todo/*.md` and `plan/ROADMAP.md`. "User says stop" → only by explicit interruption.

### Token/context conditions

For conditions like "less than 100000 tokens remain":
- Use conservative estimates — err toward graceful termination.
- Message compression is evidence that context is constrained.
- If `token_budget_tracker` reports ≥80% utilization, context-limit conditions are likely satisfied.

### Interaction with repeatFlag

- If `endRepeat` fires before repeatFlag: complete the current step, then exit. Do not force the repeatFlag.
- If both fire simultaneously: execute exitStrategy only if the next iteration is viable.
- If neither fires and the task chain completes: the repeatFlag should have fired but didn't. Investigate — did a sub-command fail silently?

## Iteration State

### Carries forward

- Iteration counter (N).
- `conditions` (immutable for the loop's lifetime).
- `endRepeat` (re-evaluated fresh each iteration).
- Git state (branches, commits, PRs).

### Resets each iteration

- Directive arrays and inline prose results.
- Sub-command internal state (each runs its own Session Continuity Protocol).
- Recovery Ladder position.

## Context Window Management

Long-running loops consume context. Three defenses:

1. **No iteration should consume more than 40% of remaining budget.** If an iteration approaches this, complete the current step, checkpoint, and evaluate whether to terminate.
2. **Rely on git state over conversation memory.** When context compresses, branches, commits, and PR state are the authoritative record.
3. **Preemptive termination.** If the current iteration can complete but the next one likely cannot, terminate gracefully: `REPEAT preemptive termination: context window insufficient for another full iteration`.

## Session Continuity

If interrupted mid-loop:

1. Sub-commands have their own continuity protocols (e.g., `/next-todo` Session Continuity).
2. Detect loop state from git: branches (`slush/`, `task/`), PR state (`gh pr list`), TODO completion in `plan/todo/*.md`, commit messages indicating iteration boundaries.
3. Resume from the interrupted point. Reconstruct iteration counter from completed work.
4. Report: `REPEAT resuming at iteration N (detected in-progress state from prior session)`.
5. If original parameters are lost (context gone), ask the Admiral to re-issue the command.

## Execution Algorithm

1. **Parse and validate.** All required parameters present. Parse conditions and endRepeat if provided.
2. **Log**: `REPEAT iteration N starting`.
3. **Check conditions** before each major step. Violation → immediate escalation.
4. **Execute the task chain** sequentially. Pass flags and directive arrays to sub-commands. Evaluate inline directives honestly.
5. **After each major step**, evaluate repeatFlag and endRepeat.
6. **On repeatFlag firing**: log it, execute exitStrategy per contract, log completion, start next iteration.
7. **On endRepeat firing**: complete current step, log `REPEAT terminated after iteration N: <reason>`, exit.
8. **On failure**: follow Recovery Ladder. If unrecoverable, escalate with iteration number, what failed, and whether it's safe to resume.

## What goes wrong during repeat loops

- **Exit strategy leaves dirty state.** Next iteration starts on the wrong branch or with uncommitted changes. The exit strategy contract exists to prevent this — if it fails, escalate rather than pushing forward.
- **repeatFlag never fires.** The task chain completes but the condition isn't met. Usually means a sub-command failed silently or the flag condition doesn't match what the task chain actually produces. Investigate before retrying.
- **Conditions conflict with sub-command behavior.** A condition says "no compound commands" but a sub-command tries to run one. The condition wins — the sub-command hits a hook block. This is expected behavior, not a bug.
- **Context window runs out mid-iteration.** The 40% rule and preemptive termination exist for this. If you're past 80% budget and mid-iteration, finish the current major step, checkpoint, and terminate.
- **Iteration drift.** Each iteration should produce roughly equivalent work (one phase, one task cycle). If iterations are getting smaller or shallower, it's likely context exhaustion or completion bias. Terminate and let a fresh session continue.

## Output Contract (per iteration)

```
REPEAT ITERATION N
STATUS: [Complete | Blocked | Terminated]
CONTINUITY: [FRESH START | RESUMING at N]

CONDITIONS: [all passing | violation details]

TASK EXECUTION:
1. [command/directive]: [result summary]
2. [command/directive]: [result summary]
...

REPEATFLAG: [condition] — [fired | not fired] — [evidence]
ENDREPEAT: [condition] — [fired | not fired | N/A] — [evidence]
EXIT STRATEGY: [executed — what was done | skipped — endRepeat fired]

NEXT: [iteration N+1 | termination reason]
ROUTING SUGGESTIONS: [work discovered outside loop scope]
```

## Examples

### Basic

```
/repeat {task: `/next-todo; /simplify; /phase-closeout`,
         exitStrategy: "create a new slush branch off main for the next phase",
         repeatFlag: /phase-closeout}
```

### Full

```
/repeat {task: `/next-todo; /plan --auto-approve ["Continue plan/todo/* work",
              "Build in correct order", "Use slush branch conventions",
              "Continue until the Phase is fully realized"];
              "Genuinely prove the phase is complete — not just tests and checklists";
              /simplify; /security-review; /phase-closeout`,
         exitStrategy: "create a new slush branch off the active slush branch and begin the next phase",
         repeatFlag: /phase-closeout,
         conditions: ["No compound commands in bash (no &&)",
                      "Full read/write access in /technomancy-codex",
                      "Do not write to aiStrat/"],
         endRepeat: "When the phase is complete and less than 100000 tokens remain"}
```

### Minimal with endRepeat

```
/repeat {task: `/next-todo`,
         exitStrategy: "commit progress and check out the next task branch",
         repeatFlag: "current task's PR is merged into the slush branch",
         endRepeat: "all tasks in the active phase are complete"}
```

## Non-Goals

- Do not invent new TODO items.
- Do not merge slush to main without Admiral approval.
- Do not run on a timer — use `/loop`.
- Do not use for one-shot tasks — just run the commands directly.
