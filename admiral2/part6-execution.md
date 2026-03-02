# PART 6 — EXECUTION

*How work gets planned, parallelized, and completed.*

*Strategy says what. Context says how agents know. Enforcement says what's mandatory. Fleet says who. The Brain persists what the fleet learns. Now: how does actual work flow? These three sections cover decomposition, parallelization, and advanced orchestration patterns.*

-----

## 18 — WORK DECOMPOSITION

> **TL;DR** — Break goals into chunks that each consume no more than 40% of an agent's token budget. Each chunk is independently completable, independently verifiable, with explicit entry and exit states.

AI agents do not naturally manage resource depletion. Given a large task, an agent produces high-quality work for the first 60% and rushes the remaining 40%.

### Chunking Principles

- **No single task should consume more than 40% of token budget.** Ensures resources for execution, self-review, and checkpointing.
- **Each chunk must be independently completable and independently verifiable.**
- **Chunks must have explicit entry state and exit state.**
- **Sequence chunks to front-load uncertainty.** Unknown complexity first, when resources are fresh.

### The Spec-First Pipeline

For significant features, each phase produces artifacts feeding the next:

1. **Requirements Spec:** What the feature must do. Acceptance criteria. Edge cases. Not how — what.
2. **Design Spec:** How it will be built. Architecture. Data models. API contracts. Components.
3. **Task Decomposition:** Design spec broken into chunks with entry/exit states and budgets.
4. **Implementation:** Each chunk executed by the appropriate specialist.

Each phase can be a separate session with clean context. The output of phase N becomes the input of phase N+1.

### Self-Healing Quality Integration

Every chunk includes automated quality gates:

```
Chunk complete
  → Type checker → Fix if failures → Recheck
  → Linter → Fix if failures → Recheck
  → Tests → Fix if failures → Retest
  → All pass → Checkpoint → Next chunk
```

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

> **ANTI-PATTERN: COMPLETION BIAS** — Agents would rather produce complete but mediocre output than incomplete but excellent output. If running low on budget, an agent silently drops quality. You get all 12 endpoints but the last 4 have no error handling. Define quality floor per chunk. Fewer chunks at full quality beats all chunks at degraded quality.

-----

## 19 — PARALLEL EXECUTION STRATEGY

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

**1. Contract-First Parallelism:** Define the interface contract first. Both agents work to it independently. Neither may unilaterally modify it.

**2. Checkpoint Synchronization:** Parallel agents checkpoint at intervals. Orchestrator reviews for assumption alignment.

**3. Ownership Isolation:** Each agent has exclusive write ownership of specific directories. Eliminates merge conflicts by construction.

**4. Git Worktree Isolation:** Each agent works in a separate worktree — a complete repository copy on a different branch. Integration happens through merge after completion.

### Assumption Divergence Detection

**Warning signs:** Agent makes a design decision not in the contract. Agent asks questions the contract should answer. Two agents produce outputs using different naming or data shapes.

**Resolution:** Pause both. Identify divergence point. Resolve with authority. Rebrief both.

> **ANTI-PATTERN: OPTIMISTIC PARALLELISM** — Parallel work dispatched without an interface contract. Each agent invents assumptions. Both produce excellent work. Neither is compatible with the other.

-----

## 20 — SWARM PATTERNS

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

**When to use swarms:** Tasks are numerous, similar, and parallelizable. The fleet needs to operate with minimal Admiral oversight for extended periods.

### Multi-Model Orchestration

- **Adversarial review:** Same task through two models from different providers. Each critiques the other. Different blind spots surface different errors.
- **Specialized routing:** Research model for gathering, code model for implementation, reasoning model for architecture — within one workflow.
- **Cost-optimized pipelines:** Economy-tier first draft, flagship-tier review. 80% of token volume at 1/30th the cost.

> **ANTI-PATTERN: PREMATURE SWARM** — A swarm deployed for a CRUD app. Consensus mechanisms and queen coordination add complexity exceeding the project's needs. A simple fleet with three specialists produces the same output at a fraction of the overhead.

-----

