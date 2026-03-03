# PART 7 — QUALITY

*How the fleet maintains standards and handles failure.*

*Strategy defines the target. The Brain persists what was learned. Execution produces the work. Quality is the feedback loop that closes the gap. These three sections define how work is verified, how failures are recovered, and a comprehensive catalog of the ways agent fleets systematically fail.*

-----

## 21 — QUALITY ASSURANCE

> **TL;DR** — Self-healing quality loops (automated checks that fix their own failures) are more effective than multi-pass review. Reserve human-judgment review for what machines cannot check: logic correctness, design quality, architectural alignment.

### Verification Levels

| Level | What It Involves | When to Use |
|---|---|---|
| **Self-Check** | Agent reviews own output. Runs automated checks. Self-healing loop. | Low-risk Autonomous-tier tasks |
| **Peer Review** | Separate QA agent reviews. Pass/fail with specific issues. | Feature implementations, schema changes, API modifications |
| **Adversarial Review** | Same task through different model/provider. Each critiques the other. | High-stakes, security-sensitive, architectural decisions |
| **Admiral Review** | Admiral reviews output, decision log, reasoning traces. | Architecture decisions, first implementations of new patterns |

### Self-Healing as Primary QA

```
Agent completes implementation
  → Type checker → Failures fed back → Agent fixes → Recheck
  → Linter → Failures fed back → Agent fixes → Recheck
  → Tests → Failures fed back → Agent fixes → Retest
  → All pass → QA agent receives clean output for review
```

QA focuses on what machines cannot check: logic correctness, design quality, edge case completeness, architectural alignment.

### QA Feedback Loop

> **TEMPLATE: QA ISSUE REPORT**
>
> ISSUE: [One sentence]
>
> SEVERITY: [Blocker | Major | Minor | Cosmetic]
>
> LOCATION: [File, line number, or component]
>
> EXPECTED: [Per acceptance criteria]
>
> ACTUAL: [What actually happens]
>
> CONFIDENCE: [Verified (tested) | Assessed (reviewed carefully) | Assumed (spot-checked)]

> **ANTI-PATTERN: SYCOPHANTIC DRIFT** — Over long sessions, agents increasingly agree with established framing. QA finds fewer issues. After several review rounds where the orchestrator pushes back, the QA agent starts "finding" fewer issues. Ensure QA instructions state that finding zero issues is a red flag.

-----

## 22 — FAILURE RECOVERY

> **TL;DR** — Five-step recovery ladder: retry with variation, fallback to simpler approach, backtrack to last-known-good state, isolate and skip, escalate. No silent recoveries. Every recovery action is logged.

Without recovery protocols, agents loop indefinitely, silently produce garbage, or freeze.

### Standard Recovery Ladder

1. **Retry with variation.** Meaningfully different alternative (not the same approach repeated). Max 2–3 retries. Log each.
2. **Fallback to simpler approach.** Known-safe fallback producing lesser but acceptable result. Defined in advance.
3. **Backtrack.** Roll back to last known-good state. Try a different path entirely. Distinct from retry — abandons the current approach.
4. **Isolate and skip.** Mark task as blocked with structured report. Move to next task. Surface at checkpoint.
5. **Escalate to Admiral.** Structured escalation report. No further creative solutions.

### Backtracking

Effective backtracking requires:

- **Checkpoint before branching decisions.** Save state before committing to an approach.
- **Clean rollback.** Return to checkpoint without residual state from the failed path.
- **Path memory.** Record which paths were tried and why they failed.

> **TEMPLATE: ESCALATION REPORT**
>
> BLOCKER: [One sentence]
>
> CONTEXT: [What task was being attempted]
>
> ATTEMPTED: [Approaches tried, in order, with outcomes]
>
> ROOT CAUSE (if known): [Best assessment]
>
> NEEDED: [What would unblock this]
>
> IMPACT: [Downstream tasks affected]
>
> RECOMMENDATION: [Agent's suggested resolution]

> **ANTI-PATTERN: SILENT FAILURE** — An agent encounters an error, works around it silently, delivers a subtly wrong result. This is completion bias overriding correctness. Require all agents to log every recovery action. No silent fallbacks.

-----

## 23 — KNOWN AGENT FAILURE MODES

> **TL;DR** — Twenty systematic failure modes cataloged with their primary defenses and warning signs. Use the Diagnostic Decision Tree when things go wrong.

### Failure Mode Catalog

| Failure Mode | Description | Primary Defense |
|---|---|---|
| **Premature Convergence** | Latches onto first viable solution without exploring alternatives | Recovery (22): require multiple candidates for critical decisions |
| **Sycophantic Drift** | Increasingly agrees with established framing over time | QA (21): zero findings is a red flag |
| **Completion Bias** | Delivers complete but degraded output rather than incomplete but excellent | Decomposition (18): chunk sizing ensures full attention |
| **Confidence Uniformity** | All output presented with equal confidence regardless of certainty | QA (21): require confidence levels |
| **Context Recency Bias** | Last-loaded context dominates; early constraints deprioritized | Context Strategy (06): deliberate loading order |
| **Phantom Capabilities** | Assumes tools or access it does not have | Tool Registry (12): explicit negative tool list |
| **Scope Creep via Helpfulness** | Adds unrequested features; each reasonable, collectively budget-blowing | Boundaries (02): explicit non-goals |
| **Hierarchical Drift** | Specialists make orchestrator-level decisions | Fleet Composition (11): explicit role boundaries |
| **Invocation Inconsistency** | Same context, different outputs across runs; naming drifts | Ground Truth (05): explicit conventions |
| **Silent Failure** | Encounters error, works around it without logging | Recovery (22): mandatory recovery logging |
| **Context Stuffing** | Overloaded context → shallow, unfocused output | Context Strategy (06): curated profiles, <150 line rule |
| **Context Starvation** | Underloaded context → drifts from Mission, infers incorrectly | Context Strategy (06): minimum viable context floor |
| **Instruction Decay** | Rules followed early, ignored as session lengthens | Enforcement (08): critical rules must be hooks |
| **Memory Poisoning** | False info in agent memory persists across sessions | Security (10): audit memory files |
| **Configuration Injection** | Attacker modifies config to override constraints | Security (10): CODEOWNERS, review requirements |
| **Tool Hallucination via MCP** | Assumes MCP server provides capabilities it does not | Tool Registry (12): explicit MCP capability list |
| **Session Amnesia** | Loses critical context between sessions despite checkpointing | Memory (24): structured persistence patterns |
| **Swarm Consensus Failure** | Agents reach consensus on an incorrect answer | Swarm (20): adversarial review, multi-model cross-check |
| **Config Accretion** | Config files grow until agents ignore rules | Config Strategy (07): 150-line rule, regular refactoring |
| **Goodharting** | Optimizes tracked metrics rather than genuine outcomes | Metrics (27): track in combination, rotate emphasis |

### Diagnostic Decision Tree

**Output quality declining:**
- Worse at end than beginning? → **Completion Bias** → Decomposition (18): reduce chunk size.
- Uniformly lower? → **Context Starvation** or **Stuffing** → Context Strategy (06).
- Rules followed early but not late? → **Instruction Decay** → Enforcement (08): convert to hooks.

**Tasks taking too long:**
- Sent back repeatedly? → **Unclear Success Criteria** → Criteria (03).
- Frequent escalations? → **Narrow Autonomous Tier** → Decision Authority (09).
- Retrying same approach? → **Phantom Capabilities** → Tool Registry (12).

**Agents doing unrequested work:**
- Adding features? → **Scope Creep** → Boundaries (02).
- Making architectural decisions? → **Hierarchical Drift** → Fleet Composition (11).
- Modifying files outside scope? → Enforcement (08): add scope hook.

**Work from different agents doesn't integrate:**
- Working in parallel? → **Optimistic Parallelism** → Parallel Execution (19): define contracts first.
- Different naming for same concept? → **Invocation Inconsistency** → Ground Truth (05).

-----

