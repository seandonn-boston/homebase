<!-- Admiral Framework v0.4.0-alpha -->
# PART 6 — EXECUTION

*How work gets planned, parallelized, and completed.*

*Strategy says what. Context says how agents know. Enforcement says what's mandatory. Fleet says who. The Brain persists what the fleet learns. Now: how does actual work flow? These three sections cover decomposition, parallelization, and advanced orchestration patterns.*

> **Control Plane surface:** Task decomposition trees and parallel execution status are visible in the Control Plane's Task Flow View (Level 2+). Operators can see how the Orchestrator broke down work, which chunks are assigned to which agents, and where tasks are blocked or queued.

-----

## Work Decomposition

> **TL;DR** — Break goals into chunks that each consume no more than 40% of an agent's token budget. Each chunk is independently completable, independently verifiable, with explicit entry and exit states.

AI agents do not naturally manage resource depletion. Given a large task, an agent produces high-quality work for the first 60% and rushes the remaining 40%.

### Chunking Principles

- **No single task should consume more than 40% of token budget.** The 40% ceiling exists because agents near resource depletion rush to finish — they drop error handling, skip edge cases, and produce shallow implementations. The remaining 60% covers execution overhead, self-healing loops, checkpointing, and the unexpected. If a chunk consistently uses less than 20%, it is over-decomposed and paying unnecessary context tax.
- **Each chunk must be independently completable and independently verifiable.**
- **Chunks must have explicit entry state and exit state.**
- **Sequence chunks to front-load uncertainty.** Unknown complexity first, when resources are fresh.

**Value: Quality > Completeness.** Incomplete excellent work beats complete mediocre work. An agent that delivers 3 of 5 endpoints with full error handling, tests, and documentation has produced more value than one that delivers 5 endpoints where the last 2 are untested and brittle. When budget pressure forces a choice, the agent should reduce scope and maintain quality — then report the reduced scope explicitly.

### The Spec-First Pipeline

For significant features, each phase produces artifacts feeding the next:

1. **Requirements Spec:** What the feature must do. Acceptance criteria. Edge cases. Not how — what.
2. **Design Spec:** How it will be built. Architecture. Data models. API contracts. Components.
3. **Task Decomposition:** Design spec broken into chunks with entry/exit states and budgets.
4. **Implementation:** Each chunk executed by the appropriate specialist.

Each phase can be a separate session with clean context. The output of phase N becomes the input of phase N+1.

### Self-Healing Quality Integration

Self-healing loops (specified in Deterministic Enforcement, Part 3) integrate with execution through the chunking model. Each chunk passes through the self-healing cycle before the next chunk begins.

> **TEMPLATE: TASK DECOMPOSITION**
>
> GOAL: [High-level objective]
>
> PIPELINE: [Requirements → Design → Tasks → Implementation] or [Tasks → Implementation]
>
> CHUNKS:
> 1. [Chunk] — Entry: [preconditions] — Exit: [deliverable + criteria] — Budget: [tokens/time] — Gates: [checks]
>
> SEQUENCE: [Ordered by uncertainty descending]

> **ANTI-PATTERN: COMPLETION BIAS** — Agents would rather produce complete but mediocre output than incomplete but excellent output. If running low on budget, an agent silently drops quality. You get all 12 endpoints but the last 4 have no error handling. Define quality floor per chunk. Fewer chunks at full quality beats all chunks at degraded quality. **Defense:** Standing Order 8 (Quality Standards) — never lower quality to meet a deadline or token budget.

-----

## Parallel Execution Strategy

> **TL;DR** — Parallelize when tasks share no state. Serialize when they share files. Always define the interface contract before dispatching parallel work. Thirty minutes on a contract saves hours on rework.

The power of fleet architecture lies in parallelism. But parallelism without coordination produces divergent work expensive to reconcile.

### When to Parallelize

| Condition | Strategy |
|---|---|
| No shared files, state, or interface dependency | **Parallelize** |
| Shared interface but not implementation | **Parallelize with contract** |
| Shared file ownership or overlapping state | **Serialize** |
| B depends on A's design decisions but not implementation | **Stagger** — start B once A's design checkpoints |
| Interface not yet defined | **Serialize** — parallelizing without a contract guarantees divergence |

### Coordination Patterns

**1. Contract-First Parallelism:** Define the interface contract first. Both agents work to it independently. Neither may unilaterally modify it. The contract is mandatory because assumption divergence between parallel agents costs hours of rework — and the rework cost always exceeds the thirty minutes the contract takes to define. An agent that encounters a contract gap must escalate to the Orchestrator, not fill the gap with an assumption.

**2. Checkpoint Synchronization:** Parallel agents checkpoint at intervals. Orchestrator reviews for assumption alignment.

**3. Ownership Isolation:** Each agent has exclusive write ownership of specific directories. Eliminates merge conflicts by construction.

**4. Git Worktree Isolation:** Each agent works in a separate worktree — a complete repository copy on a different branch. Integration happens through merge after completion.

### Assumption Divergence Detection

**Warning signs:** Agent makes a design decision not in the contract. Agent asks questions the contract should answer. Two agents produce outputs using different naming or data shapes.

**Resolution:** Pause both. Identify divergence point. Resolve with authority. Rebrief both.

> **ANTI-PATTERN: OPTIMISTIC PARALLELISM** — Parallel work dispatched without an interface contract. Each agent invents assumptions. Both produce excellent work. Neither is compatible with the other.

-----

## Swarm Patterns

> **TL;DR** — Hierarchical fleets (orchestrator + specialists) handle most projects. Swarms and multi-model orchestration extend capabilities for scale and adversarial quality — but add complexity. Don't reach for them unless you need them.

### When Hierarchical Fleets Are Sufficient

Most projects. A single orchestrator coordinating five to ten specialists handles the majority of software development work.

### Swarm Intelligence

Agents self-organize rather than following top-down orchestration. A queen coordinates, prevents drift, reaches consensus even when agents fail.

```
Queen Agent
  ├── Worker A (frontend)
  ├── Worker B (backend)
  ├── Worker C (testing)
  └── Worker D (database)
```

| Hierarchical Fleet | Swarm |
|---|---|
| Orchestrator assigns tasks | Queen coordinates; workers self-select |
| Fixed routing rules | Dynamic routing by capacity |
| Single point of coordination | Consensus mechanisms |
| Failure requires orchestrator intervention | Self-heals around failed agents |

**When to Use Swarms:**

| Condition | Recommendation |
|---|---|
| Fewer than 10 similar tasks | Hierarchical fleet. Swarm overhead exceeds benefit. |
| 10-100 similar, parallelizable tasks | Swarm with a queen coordinator. |
| Tasks require shared state or sequential dependencies | Hierarchical fleet. Swarms assume independence. |
| Fleet must operate for extended periods without Admiral oversight | Swarm with consensus and self-healing. |
| Tasks require diverse specialist knowledge | Hierarchical fleet. Swarms work best with homogeneous workers. |

### Swarm Failure Models

Swarms introduce failure modes that hierarchical fleets avoid:

**Queen failure:** If the queen agent fails (crash, budget exhaustion, context corruption):
- Workers continue their current tasks to completion but do not accept new work.
- A standby queen activates with the last-known task manifest and worker status.
- If no standby exists, workers checkpoint and halt. The fleet enters recovery mode.

**Worker failure:** If a worker fails:
- The queen detects missing heartbeat after configurable timeout (default: 60 seconds).
- Failed worker's incomplete task is reassigned to the next available worker.
- The failed worker's partial output is preserved for the replacement to build on (if salvageable) or discarded (if corrupt).

**Consensus failure:** When workers produce contradictory results:
- The queen collects all results and identifies the contradiction.
- If a majority agrees, the majority result is accepted and the minority result is flagged for review.
- If no majority exists, the queen escalates to the Admiral with all results and the contradiction analysis.
- Workers never resolve contradictions among themselves — consensus is the queen's responsibility.

**Cascade failure prevention:**
- Workers are isolated from each other. One worker's failure cannot propagate to others.
- The queen monitors aggregate error rates. If more than 30% of workers fail on the same task type, the queen halts the swarm and escalates — the task specification is likely flawed.
- Budget exhaustion in one worker does not affect other workers' budgets.

### Swarm Consensus Mechanisms

When multiple workers produce outputs that must be reconciled:

**Majority vote:** For tasks with discrete outcomes (pass/fail, choice A/B/C), the queen takes the majority. Ties escalate.

**Quality-weighted merge:** For tasks producing artifacts (code, text, analysis), the queen evaluates each output against acceptance criteria and selects the highest-quality result. If multiple pass, the queen merges non-conflicting improvements.

**Adversarial reconciliation:** Each worker reviews another worker's output. Disagreements are surfaced to the queen. This catches errors that majority vote misses (when most workers make the same mistake).

### Multi-Model Orchestration

- **Adversarial review:** Same task through two models from different providers. Each critiques the other. Different blind spots surface different errors.
- **Specialized routing:** Research model for gathering, code model for implementation, reasoning model for architecture — within one workflow.
- **Cost-optimized pipelines:** Economy-tier first draft, flagship-tier review. 80% of token volume at 1/30th the cost.

> **ANTI-PATTERN: PREMATURE SWARM** — A swarm deployed for a CRUD app. Consensus mechanisms and queen coordination add complexity exceeding the project's needs. A simple fleet with three specialists produces the same output at a fraction of the overhead.

-----

