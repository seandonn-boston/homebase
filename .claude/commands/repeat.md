# /repeat

Run a task in an event-driven loop, re-triggering when specified criteria are met rather than on a timer.

## Mission

Execute a task repeatedly, where each iteration is triggered by a condition being satisfied — not by elapsed time. After each trigger, run an exit strategy (transition logic), then restart the task. The loop is the Orchestrator pattern applied to sequential phase execution: decompose into iterations, enforce contracts, checkpoint, and escalate when blocked.

## Inputs

- Required: `task`, `exitStrategy`, `repeatFlag` (see Parameters)
- Optional: `conditions`, `endRepeat` (see Parameters)
- Source of truth for iteration state: git branches, PR state, `plan/todo/*.md`
- Standing context: Standing Orders (all 16) remain in effect throughout the loop

## Definitions

- **Iteration**: One complete execution cycle of the task chain, from start through repeatFlag satisfaction. Analogous to a "chunk" in Work Decomposition (Part 6) — independently completable, independently verifiable, with explicit entry and exit states.
- **Major step**: A discrete unit of work within an iteration — one slash command execution, one inline prose directive evaluation, or one exitStrategy execution. Conditions, repeatFlag, and endRepeat are evaluated at major step boundaries. Major steps are the checkpoint granularity within an iteration.
- **Admiral**: The human operator or supervising authority. All escalations, blockers, and unrecoverable errors are reported to the Admiral per the Escalation Protocol (Part 11). The Admiral is the only entity that may approve slush→main merges.
- **Unrecoverable error**: A failure that persists after the Recovery Ladder (SO-06) has been exhausted: retry with variation → fallback → backtrack → isolate and skip → escalate. Includes: condition violations (immediate — no ladder), repeated tool failures after alternative approaches are exhausted, permission denials with no workaround, and missing prerequisites that no available action can satisfy.
- **Task chain**: The ordered sequence of slash commands, sub-command invocations, and inline prose directives specified in the `task` parameter.
- **Standing rule**: A constraint from `conditions` that is enforced continuously — analogous to Standing Orders but scoped to this loop invocation. Standing rules override conflicting sub-command behavior.
- **Checkpoint**: A structured record of iteration state (SO-07). Produced at major step boundaries and iteration boundaries to enable session continuity and recovery.

## Syntax

```
/repeat {task: `<commands>`,
         exitStrategy: "<what to do when repeatFlag fires>",
         repeatFlag: <condition>,
         conditions: [...],
         endRepeat: "<termination condition>"}
```

## Parameters

### Required

- **task**: The command chain to execute each iteration. May reference slash commands, sub-command arguments, and inline prose directives. See **Task Syntax** below.
- **repeatFlag**: The condition or event that signals the current iteration is complete.
  - **Slash command reference** (e.g., `/phase-closeout`): fires when that command completes successfully.
  - **Plain-language condition**: evaluated honestly after each major step. Must be genuinely satisfied — fabrication violates SO-04 (Context Honesty).
- **exitStrategy**: Instructions to execute when the repeatFlag fires, before starting the next iteration. This is the transition logic between iterations — branch creation, state reset, context advancement, etc. See **Exit Strategy Contract** below.

### Optional

- **conditions**: An array of standing rules enforced throughout every iteration. See **Condition Categories** below. Evaluated before each major step. Violation is an unrecoverable error — no Recovery Ladder, immediate escalation (conditions are hard enforcement, not advisory).
- **endRepeat**: A termination condition that ends the loop gracefully. Evaluated after each major step alongside the repeatFlag. When triggered, the current iteration completes its in-progress work, produces a final checkpoint, then the loop exits without starting a new iteration. If omitted, the loop runs indefinitely per default behavior.

## Task Syntax

The `task` parameter supports three composition patterns, which may be combined freely:

### 1. Slash command chaining

Semicolon-separated commands executed sequentially, left to right. Each command must complete (success or handled failure) before the next begins. This is sequential execution, not parallel — per Part 6 Parallel Execution Strategy, serialize when tasks share state, and all commands in a `/repeat` task chain share the iteration's git state.

```
task: `/next-todo; /simplify; /phase-closeout`
```

### 2. Sub-command arguments

A slash command may receive **flags** and/or a **directive array** that scope its behavior for this invocation.

```
/plan --auto-approve ["Build in correct order", "Use slush branch conventions"]
```

- **Flags** (`--flag-name`): Boolean switches passed to the sub-command. The sub-command defines whether it recognizes the flag; unrecognized flags are logged as a warning and ignored. Flags do not take values — they are on/off.
- **Directive arrays** (`["...", "..."]`): An ordered list of plain-language instructions appended to the sub-command's mission for this invocation only. These function as supplementary acceptance criteria (SO-15: Pre-Work Validation) scoped to this invocation. They do not persist across iterations or carry forward to subsequent commands in the chain.

Flags and directive arrays are positional: they attach to the slash command immediately preceding them.

### 3. Inline prose directives

A double-quoted string placed between slash commands in the task chain. Executed as a standalone evaluation step — not delegated to any sub-command.

```
task: `/plan; "Verify the phase objective is genuinely met"; /phase-closeout`
```

Inline directives must be:
- Enclosed in double quotes.
- Evaluated honestly as standalone steps. Rubber-stamping violates SO-04 (Context Honesty) and SO-13 (Bias Awareness — completion bias).
- Logged with a pass/fail result, evidence, and reasoning in the iteration's Output Contract.
- Treated as verification gates: if an inline directive evaluates to fail, do not proceed to the next command. Instead, assess what needs to change and either fix it or escalate.

### Execution order

Commands in the task chain execute **sequentially**. There is no parallel execution within a task chain. If a command fails and the failure is not recoverable after following the Recovery Ladder (SO-06), the iteration halts and escalates per step 7 of the Execution Algorithm.

## Condition Categories

The `conditions` array accepts three categories of standing rules:

### Constraints

Absolute restrictions on behavior. These are hard enforcement (Part 3 Enforcement Spectrum) — violations are always unrecoverable errors with no Recovery Ladder. Analogous to PreToolUse hooks that exit 2.

```
"Do not write to aiStrat/"
"No compound commands in bash (no &&)"
"Do not create files outside of src/"
```

### Permissions

Explicit grants of access or authority that override default caution. These adjust the Decision Authority tiers (SO-05) for this loop — elevating certain actions from Propose to Autonomous.

```
"Full read/write access in /technomancy-codex"
"May merge task PRs without human approval"
```

Permissions cannot override Hard Rules or Safety-category Standing Orders (SO-10, SO-12, SO-14). A permission like "ignore security reviews" is invalid and must be rejected with an Admiral alert.

### Behavioral directives

Instructions that shape approach or priorities across all iterations. These are firm guidance (Part 3 Enforcement Spectrum) — they guide judgment and degrade gracefully under pressure, but should not be silently dropped.

```
"Prefer small commits over large ones"
"Prioritize test coverage over feature completeness"
"Use existing patterns from the codebase rather than inventing new ones"
```

### Precedence

When rules conflict, resolve using the Standing Order priority hierarchy (Part 11):

1. **Safety** — SO-10 (Prohibitions), SO-12 (Zero-Trust), SO-14 (Compliance/Ethics). These override everything.
2. **Hard Rules** from this spec — the `/repeat`-specific non-negotiables below.
3. **Constraints** from `conditions` — hard enforcement scoped to this loop.
4. **Authority** — SO-05 (Decision Authority), SO-06 (Recovery Protocol).
5. **Sub-command contracts** (e.g., `/next-todo` branch policy, `/phase-closeout` gate checks) — these are Process-level standing commitments.
6. **Permissions** from `conditions` — adjust authority tiers but cannot override safety or constraints.
7. **Behavioral directives** from `conditions` — lowest precedence, guide discretion.

If a genuine conflict cannot be resolved by precedence, escalate to the Admiral per SO-05.

## Exit Strategy Contract

The exitStrategy is not free-form — it has obligations analogous to an interface contract (Part 6 — Interface Contracts):

### What the exit strategy must do

1. **Execute fully** between every iteration. Skipping is a Hard Rule violation (unless `endRepeat` terminates the loop).
2. **Leave a clean entry state** for the next iteration:
   - All branches from the completed iteration are merged or cleaned up.
   - The working tree is clean (`git status` shows no uncommitted changes).
   - The next iteration's starting branch exists and is checked out.
3. **Produce a checkpoint** (SO-07): what was transitioned, branches created, state advanced.
4. **Respect all `conditions`** — the exitStrategy is not exempt from standing rules.
5. **Follow branch policy** — if creating branches, follow `/next-todo` branch naming and PR conventions.

### On exit strategy failure

If the exitStrategy cannot complete, follow the Recovery Ladder (SO-06):
1. Retry with variation (e.g., resolve merge conflict differently).
2. Fallback (e.g., skip branch cleanup, leave it for manual resolution).
3. Backtrack (e.g., revert the transition attempt).
4. Isolate (mark the transition as blocked).
5. Escalate — produce a structured Escalation Report (Part 11 format). Do not start the next iteration with a dirty transition.

## endRepeat Evaluation

The `endRepeat` condition is evaluated after each major step. Evaluation rules:

### Plain-language conditions

Evaluated honestly using available information. Honest evaluation means applying SO-04 (Context Honesty) and SO-13 (Bias Awareness) — do not fabricate satisfaction, and actively check for completion bias (the tendency to declare "done" prematurely).

Examples:
- "When all phases in the roadmap are complete" — check `plan/todo/*.md` and `plan/ROADMAP.md`.
- "When the user says stop" — only satisfied by explicit user interruption.

### Token/context conditions

Conditions referencing context window limits (e.g., "less than 100000 tokens remain") are evaluated by estimating remaining context capacity. The `token_budget_tracker` hook (PostToolUse, SO-08) provides budget utilization data. When exact token counts are unavailable:
- Use conservative estimates — err toward terminating gracefully.
- If the conversation has been running for many iterations and responses are being compressed, treat the condition as approaching satisfaction.
- If the `token_budget_tracker` reports ≥80% utilization, consider endRepeat conditions referencing context limits as likely satisfied.

### Interaction with repeatFlag

- `endRepeat` is checked **alongside** the repeatFlag after each major step.
- If `endRepeat` fires **before** the repeatFlag: complete the current in-progress major step, produce a final checkpoint, log termination, and exit. Do not attempt to force the repeatFlag.
- If `endRepeat` fires **at the same time** as the repeatFlag: execute the exitStrategy only if the next iteration would be viable (sufficient context, no blockers). If not, skip the exitStrategy and terminate.
- If `endRepeat` is never satisfied: the loop runs indefinitely (same as omitting it).

## Execution Algorithm

1. **Parse and validate** the `/repeat` invocation.
   - All three required parameters must be present. If missing, alert the Admiral with what's missing.
   - Parse `conditions` and `endRepeat` if provided.
   - Log any unrecognized flags or malformed parameters as warnings.
   - Validate that no `conditions` entry conflicts with Safety-category Standing Orders.

2. **Log iteration start**: `REPEAT iteration N starting`.

3. **Pre-Work Validation** (SO-15): before each major step, confirm:
   - All `conditions` entries are satisfied. If any condition is violated, proceed to step 7 (immediate — no Recovery Ladder for condition violations).
   - Sufficient context remains for the step (SO-11, SO-04).
   - The step is within scope (SO-03).

4. **Execute the task chain**: run commands in order per Task Syntax rules.
   - For each slash command: pass flags and directive arrays if present. Respect the sub-command's own contract (branch policy, output contracts, etc.).
   - For each inline prose directive: evaluate honestly, log pass/fail with evidence and reasoning. If fail, assess whether to fix and retry or escalate.
   - After each major step: produce a mini-checkpoint and evaluate repeatFlag and endRepeat (step 5).
   - Follow the Recovery Ladder (SO-06) for any failures within the task chain.

5. **Evaluate repeatFlag and endRepeat**:
   - If **endRepeat** is satisfied: complete the current major step, then proceed to step 6b.
   - If **repeatFlag** is satisfied: proceed to step 6a.
   - If neither: continue to the next major step in the task chain (return to step 3).
   - If the task chain completes without the repeatFlag firing: this is unexpected. Log a warning and evaluate:
     - Did a sub-command fail silently? Investigate.
     - Is the repeatFlag condition genuinely unmet? If so, the iteration's work was insufficient — assess whether to retry (SO-06 step 1) or escalate.

6. **On repeatFlag firing**:
   a. Log: `REPEAT flag fired: <repeatFlag> — executing exit strategy`.
   b. **If endRepeat is satisfied**: produce a final checkpoint, log `REPEAT terminated after iteration N: <endRepeat condition>`. Do not execute the exitStrategy. Stop the loop.
   c. Execute the exitStrategy per the Exit Strategy Contract.
   d. Produce an iteration checkpoint (SO-07).
   e. Log: `REPEAT iteration N complete — transitioning to iteration N+1`.
   f. Return to step 2 with N incremented.

7. **On failure or blocker**: produce a structured Escalation Report per Part 11 format:

```
ESCALATION REPORT
=================

AGENT: /repeat loop executor
TASK: REPEAT iteration N — [current major step]
SEVERITY: [Critical | High | Medium]

BLOCKER: [One sentence]

CONTEXT:
[What the iteration was trying to accomplish]

APPROACHES ATTEMPTED:
1. [Recovery Ladder step 1 — what was tried]
2. [Recovery Ladder step 2 — what was tried]
3. [etc.]

ROOT CAUSE ASSESSMENT:
[Best understanding of why the blocker exists]

WHAT'S NEEDED:
[Specific action, decision, or information required]

IMPACT:
[What iterations are blocked, what phase work is delayed]

RECOMMENDATION:
[Proposed resolution, including whether /repeat can safely resume and from which iteration]
```

## Decision Authority

Decisions within `/repeat` follow the four-tier model (SO-05):

| Decision | Tier | Notes |
|---|---|---|
| Increment iteration counter | **Autonomous** | Mechanical, no judgment |
| Execute task chain commands | **Autonomous** | Delegated to sub-command contracts |
| Evaluate repeatFlag / endRepeat | **Autonomous** | Honest evaluation per SO-04 |
| Execute exitStrategy (branch creation, state transition) | **Autonomous** | Per Exit Strategy Contract |
| Skip a blocked sub-command within the task chain | **Propose** | Requires justification — may affect iteration completeness |
| Modify conditions mid-loop | **Escalate** | Conditions are immutable once the loop starts |
| Override a condition violation | **Escalate** | Safety — conditions are hard enforcement |
| Terminate loop for reasons other than endRepeat | **Escalate** | Unless user interrupts directly |
| Resume after escalation | **Escalate** | Admiral must approve re-entry |

## Iteration State Tracking

State must be maintained between iterations to ensure continuity and enable recovery.

### What carries forward

- **Iteration counter** (N): incremented after each successful iteration.
- **`conditions`**: apply to every iteration unchanged. Conditions are immutable for the lifetime of the loop.
- **`endRepeat`**: evaluated fresh each iteration — it may become true as state accumulates.
- **Git state**: branches and commits from prior iterations persist. The exitStrategy is responsible for ensuring the correct branch is active.
- **Cumulative checkpoint log**: iteration numbers, phases/tasks completed, branches created/merged.

### What resets

- **Sub-command directive arrays**: apply only to their invocation, not future iterations.
- **Inline prose directive results**: logged but not carried forward as assumptions.
- **Sub-command internal state**: each slash command starts fresh per its own contract (e.g., `/next-todo` runs its Session Continuity Protocol independently each iteration).
- **Recovery Ladder position**: resets to step 1 at the start of each iteration.

### Checkpointing (SO-07)

Each iteration produces a checkpoint at completion. The checkpoint records:

- Iteration number.
- Phase and task worked on.
- Branches created/merged.
- Sub-command output contract summaries.
- repeatFlag and endRepeat evaluation results.
- Conditions status (all passing, or violation details).
- Resources consumed (approximate token usage if available from `token_budget_tracker`).
- Decisions made and assumptions held.

Checkpoints are how the loop survives session boundaries. They are produced in the Output Contract, committed in git history (via commit messages), and recoverable from git state.

## Context Window Management

Long-running `/repeat` loops consume context. Sustainable operation requires active management per Part 6 Work Decomposition principles.

### The 40% Rule

No single iteration should consume more than 40% of the remaining context budget (Part 6 chunking principle). If an iteration approaches this threshold:
1. Complete the current major step.
2. Produce a checkpoint.
3. Evaluate whether `endRepeat` should fire.
4. If the next iteration cannot fit within remaining budget, terminate gracefully.

### Compression signals

When the system compresses prior messages:
- This is direct evidence that context is constrained.
- Rely on git state (branches, commits, PRs) as the authoritative record — not compressed conversation history.
- If `endRepeat` references token limits, message compression is strong evidence the condition is approaching satisfaction.

### Preemptive termination

If context is tight and the current iteration can complete but the next one likely cannot, terminate after the current iteration:
- Log: `REPEAT preemptive termination: context window insufficient for another full iteration`.
- Produce a full checkpoint.
- This is an Autonomous decision — it preserves work quality (SO-08: never lower quality to meet a deadline or token budget).

## Admiral Escalation Protocol

Escalations from `/repeat` follow the Part 11 Escalation Protocol with loop-specific additions.

### When to escalate

Per SO-06, escalate when the Recovery Ladder is exhausted. Additionally, escalate immediately (no ladder) for:
- Condition violations (hard enforcement — no retry).
- Safety concerns (SO-10, SO-12, SO-14 — always immediate).
- Scope changes detected mid-iteration (SO-03 — the task requires work outside defined Boundaries).

### Escalation routing

| Severity | Route To | Response Expectation |
|---|---|---|
| **Critical** | Admiral directly | Immediate — loop is stopped |
| **High** | Admiral | Within current work cycle — loop may continue on independent work |
| **Medium** | Admiral at next iteration boundary | Non-blocking if independent work remains |

### After escalating

Per Part 11 post-escalation protocol:
- **Stop work on the blocked step.** Do not continue making assumptions.
- **Continue work on independent steps** within the current iteration if they exist.
- **Document the escalation** in the iteration checkpoint.
- **Do not re-escalate the same issue** unless new information changes the analysis.

### Do not escalate for

- Recoverable errors (follow the Recovery Ladder first — SO-06).
- Expected sub-command behavior (e.g., `/next-todo` skipping a blocked task per its own policy).
- Information discoverable by reading the codebase (SO-11: Context Discovery).

## Quality Integration

Each iteration integrates with the Quality Assurance framework (Part 7):

### Self-healing loops

Sub-commands within the task chain (e.g., `/next-todo`, `/simplify`) run their own self-healing cycles: type checker → linter → tests → fix → recheck. The `/repeat` loop does not duplicate this — it trusts sub-command contracts.

### Verification level

- **Individual sub-commands**: Self-Check (each sub-command verifies its own output per SO-08).
- **Inline prose directives**: Admiral Review equivalent — honest evaluation requiring judgment, not just automated checks.
- **Iteration as a whole**: the Output Contract serves as the Peer Review artifact — it must contain enough information for an external reviewer to verify the iteration's work.

### Completion bias defense (SO-13)

The loop structure is inherently vulnerable to completion bias — the tendency to declare iterations complete prematurely to advance the counter. Defenses:
- Inline prose directives that require honest evaluation ("Genuinely approve the phase is complete — prove it").
- The repeatFlag must be genuinely satisfied, not rubber-stamped.
- `/phase-closeout` has its own multi-dimensional Completion Assessment (9 evaluation dimensions) — trust its rigor.

## Hard Rules

1. `aiStrat/` is read-only. Never modify files under `aiStrat/`. (SO-03, enforced by `scope_boundary_guard.sh`)
2. Each iteration must produce a complete Output Contract from whatever slash commands it invokes. (SO-07, SO-09)
3. Do not skip the exitStrategy — it is mandatory between iterations (unless `endRepeat` terminates the loop).
4. Do not fabricate repeatFlag or endRepeat satisfaction. Conditions must genuinely be met. (SO-04)
5. If the exitStrategy includes branch creation, follow all existing branch policies from `/next-todo`. (SO-03)
6. The loop runs indefinitely until interrupted by the user, an Admiral, an unrecoverable error, or the `endRepeat` condition.
7. Do not get blocked. Follow the Recovery Ladder (SO-06): retry → fallback → backtrack → isolate → escalate. No looping at any rung.
8. `conditions` entries are enforced on every action, every iteration. A condition violation stops the loop immediately — no Recovery Ladder. (Hard enforcement, Part 3)
9. Sub-command directive arrays apply only to the invocation they are attached to. Do not carry directives forward to subsequent commands or iterations.
10. Inline prose directives must be evaluated honestly as standalone steps. Do not skip or rubber-stamp them. (SO-04, SO-13)
11. Do not start a new iteration if the exitStrategy failed or left a dirty state. (SO-12: zero-trust)
12. Never lower quality to advance the iteration counter. Fewer iterations at full quality beats more iterations at degraded quality. (SO-08, Part 6 value principle)
13. Escalation is always available. No combination of conditions, failures, or resource exhaustion may prevent producing an Escalation Report. (Privileged Escalation Guarantee, Part 3)

## Session Continuity

If a session is interrupted mid-repeat:

1. **Sub-command continuity**: The current iteration's slash commands have their own continuity protocols (e.g., `/next-todo` Session Continuity Protocol).
2. **Detect loop state from git**:
   - Check git branches: `git branch -a | grep slush/` and `git branch -a | grep task/` to determine phase and task progress.
   - Check PR state: `gh pr list --state all` to see merged vs. open PRs.
   - Check `plan/todo/*.md` for phase/task completion state.
   - Check recent git log for commit messages that indicate iteration boundaries.
3. **Resume from the interrupted point**, not from scratch. Reconstruct the iteration counter from completed work.
4. **Report**: `REPEAT resuming at iteration N (detected in-progress state from prior session)`.
5. **Re-parse the original `/repeat` parameters**. If unavailable (context lost), ask the Admiral to re-issue the command.
6. **Re-validate conditions**: ensure all conditions still hold in the current state before resuming execution.

## Output Contract (per iteration)

Every iteration produces a structured output following SO-09 (Communication Format):

```
REPEAT ITERATION N
===================

AGENT: /repeat loop executor
STATUS: [Complete | Blocked | Terminated]
CONTINUITY: [FRESH START | RESUMING at iteration N | REPEAT iteration N]

CONDITIONS CHECK:
[All conditions evaluated — all passing, or violation details]

TASK EXECUTION:
1. [Sub-command]: [Output contract summary]
2. [Inline directive]: [Pass/Fail — evidence and reasoning]
3. [Sub-command]: [Output contract summary]
...

REPEATFLAG EVALUATION:
- Condition: [what was checked]
- Result: [fired | not fired]
- Evidence: [how this was determined]

ENDREPEAT EVALUATION:
- Condition: [what was checked]
- Result: [fired | not fired | N/A]
- Evidence: [how this was determined]

EXIT STRATEGY:
[Execution summary — branches created, state transitioned, or "skipped (endRepeat fired)"]

CHECKPOINT:
- Phase/task completed: [identifier]
- Branches: [created/merged/active]
- Resources consumed: [approximate]
- Decisions made: [list]
- Assumptions held: [list]

NEXT: [Iteration N+1 plan | Termination reason]
ROUTING SUGGESTIONS: [Work discovered that belongs outside this loop, if any]
OUTPUT GOES TO: [Admiral | next iteration | termination summary]
```

## Examples

### Basic (required parameters only)

```
/repeat {task: `/next-todo; /simplify; /phase-closeout`,
         exitStrategy: "create a new slush branch off main for the next phase and begin building it",
         repeatFlag: /phase-closeout}
```

This runs the build-simplify-closeout cycle. When `/phase-closeout` succeeds, it creates the next phase's slush branch and starts the cycle again on the next phase.

### Full (with conditions, endRepeat, sub-command arguments, and inline directives)

```
/repeat {task: `/next-todo; /plan --auto-approve ["Continue the work of plan/todo/*",
              "Build everything in the correct order",
              "Use the established slush branch conventions",
              "Continue until the active Phase is fully realized"];
              "Genuinely approve the phase is complete — prove it in meaningful ways beyond tests or completed checklists";
              /simplify; /security-review; /phase-closeout`,
         exitStrategy: "upon successful /phase-closeout, create a new slush branch off the active slush branch and begin the next phase",
         repeatFlag: /phase-closeout,
         conditions: ["No compound commands in bash (no &&)",
                      "Full read/write access in /technomancy-codex",
                      "Do not write to aiStrat/"],
         endRepeat: "When the phase is complete and less than 100000 tokens remain in the context window"}
```

This runs a full autonomous build cycle with sub-command directives, inline verification steps, standing constraints, and a graceful termination condition for context window limits.

### Minimal with endRepeat

```
/repeat {task: `/next-todo`,
         exitStrategy: "commit progress and check out the next task branch",
         repeatFlag: "current task's PR is merged into the slush branch",
         endRepeat: "all tasks in the active phase are complete"}
```

This grinds through tasks one at a time, stopping when the phase is done rather than looping forever.

## Non-Goals

- Do not modify `aiStrat/`.
- Do not invent new TODO items.
- Do not merge slush to main without Admiral approval (defer to `/phase-closeout` policy).
- Do not run on a timer — that is what `/loop` is for.
- Do not use `/repeat` for one-shot tasks. If it only needs to run once, just run the commands directly.
- Do not use `/repeat` as a substitute for parallelism. If tasks are independent and share no state, use parallel agents (Part 6) instead of sequential iteration.

## See Also

- [`next-todo.md`](next-todo.md) — Task execution, branch policy, Session Continuity Protocol
- [`phase-closeout.md`](phase-closeout.md) — Phase verification, gate checks, merge flow
- `aiStrat/admiral/spec/part6-execution.md` — Work Decomposition, chunking, parallel execution
- `aiStrat/admiral/spec/part7-quality.md` — Quality Assurance, Recovery Ladder, failure modes
- `aiStrat/admiral/spec/part11-protocols.md` — Standing Orders, Escalation Protocol, Handoff Protocol
- `aiStrat/admiral/spec/part3-enforcement.md` — Enforcement Spectrum, Privileged Escalation Guarantee
- `admiral/templates/escalation-report.md` — Escalation Report template
- `admiral/templates/decision-authority.md` — Decision Authority tiers and escalation routing
