# PART 7 — QUALITY

*How the fleet maintains standards and handles failure.*

*Strategy defines the target. The Brain persists what was learned. Execution produces the work. Quality is the feedback loop that closes the gap. These three sections define how work is verified, how failures are recovered, and a comprehensive catalog of the ways agent fleets systematically fail.*

> **Control Plane surface:** Quality gate results, failure mode frequency, and recovery ladder status are tracked in the Control Plane (CP2+). Operators see first-pass quality trends and can identify which failure modes are recurring vs. being eliminated.

-----

## Quality Assurance

> **TL;DR** — Self-healing quality loops (automated checks that fix their own failures) are more effective than multi-pass review. Reserve human-judgment review for what machines cannot check: logic correctness, design quality, architectural alignment.

### Verification Levels

Each level protects against a different class of failure. Self-Check catches mechanical errors (syntax, type violations, test failures). Peer Review catches logic and design errors invisible to the author. Adversarial Review catches systemic blind spots shared by a single model provider. Admiral Review catches strategic misalignment invisible to any agent. Escalating verification level costs more — the intent is to match the cost of verification to the cost of the failure it prevents.

| Level | What It Involves | When to Use | What It Catches |
|---|---|---|---|
| **Self-Check** | Agent reviews own output. Runs automated checks. Self-healing loop. | Low-risk Autonomous-tier tasks | Mechanical errors: syntax, types, lint, failing tests |
| **Peer Review** | Separate QA agent reviews. Pass/fail with specific issues. | Feature implementations, schema changes, API modifications | Logic errors, design issues, edge cases the author didn't consider |
| **Adversarial Review** | Same task through different model/provider. Each critiques the other. | High-stakes, security-sensitive, architectural decisions | Systemic blind spots shared by a single model provider |
| **Admiral Review** | Admiral reviews output, decision log, reasoning traces. | Architecture decisions, first implementations of new patterns | Strategic misalignment, taste, values, stakeholder considerations |

### Self-Healing as Primary QA

> **Note:** The self-healing loop is specified in Deterministic Enforcement (Part 3). This section covers its application to quality assurance.

```
Agent completes implementation
  → Type checker → Failures fed back → Agent fixes → Recheck
  → Linter → Failures fed back → Agent fixes → Recheck
  → Tests → Failures fed back → Agent fixes → Retest
  → All pass → QA agent receives clean output for review
```

QA focuses on what machines cannot check: logic correctness, design quality, edge case completeness, architectural alignment.

**Cycle detection in self-healing loops:** The runtime tracks `(check_name, error_signature)` tuples across iterations. If the same error recurs after a fix attempt, the loop breaks immediately — the agent is producing the same failure and further retries are wasteful. Maximum iterations per loop: configurable (see Deterministic Enforcement (Part 3) for the authoritative default and full implementation parameters). When the loop terminates without resolution, the agent moves to step 2 of the recovery ladder (fallback). See Deterministic Enforcement (Part 3) for the full hook execution model.

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
> CONFIDENCE: [Verified (≥2 independent test cases passing) | Assessed (≥50% of changed lines reviewed) | Assumed (≥10% of implementation spot-checked)]

> **ANTI-PATTERN: SYCOPHANTIC DRIFT** — Over long sessions, agents increasingly agree with established framing. QA finds fewer issues. After several review rounds where the orchestrator pushes back, the QA agent starts "finding" fewer issues. Ensure QA instructions state that finding zero issues is a red flag.

-----

## Failure Recovery

> **TL;DR** — Five-step recovery ladder: retry with variation, fallback to simpler approach, backtrack to last-known-good state, isolate and skip, escalate. No silent recoveries. Every recovery action is logged.

Without recovery protocols, agents loop indefinitely, silently produce garbage, or freeze.

### Standard Recovery Ladder

The ladder preserves agent autonomy for as long as possible and escalates only when autonomy is exhausted. **No skipping rungs.** An agent that jumps from retry to escalation has either insufficient context about fallback options (fix the context) or unclear authority boundaries (fix the Decision Authority (Part 3) tiers). The ladder is designed so that escalation reports contain evidence of genuine effort — the Admiral can see what was tried and why it failed, not just "I'm stuck."

1. **Retry with variation.** Meaningfully different alternative (not the same approach repeated). Max 2–3 retries. Log each.
2. **Fallback to simpler approach.** Known-safe fallback producing lesser but acceptable result. Defined in advance.
3. **Backtrack.** Roll back to last known-good state. Try a different path entirely. Distinct from retry — abandons the current approach.
4. **Isolate and skip.** Before isolating, call `brain_query` describing the failure — the Brain may surface a resolution from a prior session or project (see Failure Forensics, Part 5). If no precedent is found, mark task as blocked with structured report. Move to next task. Surface at checkpoint.
5. **Escalate to Admiral.** Before writing the escalation report, call `brain_query` if not already done at Step 4. Include a "Brain Consulted" section in the escalation report showing what was queried and what was found. Structured escalation report per [Escalation Protocol (Part 11)](part11-protocols.md) format. No further creative solutions.

> **Recovery progression rule:** Recovery records must advance exactly one rung at a time. A record at "retry" whose next step is "backtrack" (skipping "fallback") is invalid. A record whose next step points backward (e.g., fallback → retry) is also invalid. Enforce this at record creation, not as advisory guidance. The rule ensures escalation reports contain evidence of genuine effort at each rung.

### Backtracking

Effective backtracking requires:

- **Checkpoint before branching decisions.** Save state before committing to an approach.
- **Clean rollback.** Return to checkpoint without residual state from the failed path.
- **Path memory.** Record which paths were tried and why they failed.

> When backtracking invalidates downstream work (e.g., a schema change that affects API contracts and UI), review the Cascade Map (Strategic Adaptation (Part 8)) to identify affected artifacts. Backtracking without cascading is the recovery equivalent of "Patch Without Cascade" (Strategic Adaptation (Part 8) anti-pattern).

> **ESCALATION REPORT format:** See [Escalation Protocol (Part 11)](part11-protocols.md) for the authoritative escalation report template.

> **ANTI-PATTERN: SILENT FAILURE** — An agent encounters an error, works around it silently, delivers a subtly wrong result. This is completion bias overriding correctness. Require all agents to log every recovery action. No silent fallbacks.

-----

## Known Agent Failure Modes

> **TL;DR** — Twenty systematic failure modes cataloged with their primary defenses and warning signs. Use the Diagnostic Decision Tree when things go wrong.

### Failure Mode Catalog

| Failure Mode | Description | Primary Defense |
|---|---|---|
| **Premature Convergence** | Latches onto first viable solution without exploring alternatives | Failure Recovery: require multiple candidates for critical decisions |
| **Sycophantic Drift** | Increasingly agrees with established framing over time | Quality Assurance: zero findings is a red flag |
| **Completion Bias** | Delivers complete but degraded output rather than incomplete but excellent | Work Decomposition (Part 6): chunk sizing ensures full attention |
| **Confidence Uniformity** | All output presented with equal confidence regardless of certainty | Quality Assurance: require confidence levels |
| **Context Recency Bias** | Last-loaded context dominates; early constraints deprioritized | Context Profiles (Part 2): deliberate loading order |
| **Phantom Capabilities** | Assumes tools or access it does not have | Tool Registry (Part 4): explicit negative tool list |
| **Scope Creep via Helpfulness** | Adds unrequested features; each reasonable, collectively budget-blowing | Boundaries (Part 1): explicit non-goals |
| **Hierarchical Drift** | Specialists make orchestrator-level decisions | Fleet Composition (Part 4): explicit role boundaries |
| **Invocation Inconsistency** | Same context, different outputs across runs; naming drifts | Ground Truth (Part 2): explicit conventions |
| **Silent Failure** | Encounters error, works around it without logging | Failure Recovery: mandatory recovery logging |
| **Context Stuffing** | Overloaded context → shallow, unfocused output | Context Profiles (Part 2): curated profiles, <150 line rule |
| **Context Starvation** | Underloaded context → drifts from Mission, infers incorrectly | Context Profiles (Part 2): minimum viable context floor |
| **Instruction Decay** | Rules followed early, ignored as session lengthens | Deterministic Enforcement (Part 3): critical rules must be hooks |
| **Memory Poisoning** | False info in agent memory persists across sessions | Configuration Security (Part 3): audit memory files |
| **Configuration Injection** | Attacker modifies config to override constraints | Configuration Security (Part 3): CODEOWNERS, review requirements |
| **Tool Hallucination via MCP** | Assumes MCP server provides capabilities it does not | Tool Registry (Part 4): explicit MCP capability list |
| **Session Amnesia** | Loses critical context between sessions despite checkpointing | Institutional Memory (Part 8): structured persistence patterns |
| **Swarm Consensus Failure** | Agents reach consensus on an incorrect answer | Swarm Patterns (Part 6): adversarial review, multi-model cross-check |
| **Config Accretion** | Config files grow until agents ignore rules | Configuration File Strategy (Part 2): 150-line rule, regular refactoring |
| **Goodharting** | Optimizes tracked metrics rather than genuine outcomes | Fleet Health Metrics (Part 8): track in combination, rotate emphasis |

### Diagnostic Decision Tree

**Output quality declining:**
- Worse at end than beginning? → **Completion Bias** → Work Decomposition (Part 6): reduce chunk size.
- Uniformly lower? → **Context Starvation** or **Stuffing** → Context Profiles (Part 2).
- Rules followed early but not late? → **Instruction Decay** → Deterministic Enforcement (Part 3): convert to hooks.

**Tasks taking too long:**
- Sent back repeatedly? → **Unclear Success Criteria** → Success Criteria (Part 1).
- Frequent escalations? → **Narrow Autonomous Tier** → Decision Authority (Part 3).
- Retrying same approach? → **Phantom Capabilities** → Tool Registry (Part 4).

**Agents doing unrequested work:**
- Adding features? → **Scope Creep** → Boundaries (Part 1).
- Making architectural decisions? → **Hierarchical Drift** → Fleet Composition (Part 4).
- Modifying files outside scope? → Deterministic Enforcement (Part 3): add scope hook.

**Work from different agents doesn't integrate:**
- Working in parallel? → **Optimistic Parallelism** → Contract-First Parallelism (Part 6): define contracts first.
- Different naming for same concept? → **Invocation Inconsistency** → Ground Truth (Part 2).

### Remediation Playbook

When a failure mode is diagnosed, follow these remediation steps:

**Context Starvation** (most common)
1. Check the agent's context profile against what was actually loaded (trace the Context Curator's assembly).
2. Compare the agent's working context size against the 15-25% standing context budget — if standing context is overweight, it is crowding out task context.
3. Identify the missing information. Is it in Ground Truth but not loaded? Is it in the Brain but not retrieved? Or does it not exist?
4. Fix: Update the context profile, adjust the sacrifice order, or add the missing information to Ground Truth.

**Sycophantic Drift**
1. Check the agent's recent outputs for declining finding counts (a **>30% decrease session-over-session** flags a drift check) or softening language (any "suggestion" replacing a previous "blocking issue" triggers review).
2. Compare against the Bias Sentinel's detection log — if no drift was flagged, the Bias Sentinel's thresholds may need tightening.
3. Run the same task through a separate agent (Adversarial Review) to get an independent assessment.
4. Fix: Reset the agent's session, tighten the quality floor in the task specification, or deploy the Devil's Advocate for the next cycle.

**Completion Bias**
1. Check whether the agent declared completion before all acceptance criteria were verified.
2. Review the task specification — are acceptance criteria machine-verifiable? If not, the agent has no objective completion signal.
3. Check the self-healing loop — did it run? Did the agent "pass" itself without meaningful verification?
4. Fix: Add explicit acceptance criteria hooks (Deterministic Enforcement (Part 3)). Make criteria machine-checkable. Add a post-completion verification step to the self-healing loop.

**Scope Creep via Helpfulness**
1. Compare the agent's output against the task specification's Boundaries and Does NOT Do list.
2. Identify the extra work — was it requested by another agent, self-initiated, or triggered by ambiguous requirements?
3. Check whether the routing rules correctly scoped the task, or whether the Orchestrator's decomposition was too broad.
4. Fix: Tighten the task specification boundaries, add a scope-check hook, or re-decompose with narrower chunks.

**Hallucination (Fabricated Details)**
1. Cross-reference the agent's claims against Ground Truth and Brain entries.
2. Check the retrieval confidence level — did the agent cite sources, or did it generate without grounding?
3. Determine the hallucination type: factual (wrong version number), structural (nonexistent API), or logical (invalid reasoning chain).
4. Fix: Add RAG grounding requirements to the task context, tighten Standing Order 4 (Context Honesty) enforcement, or add a post-output fact-checking hook.

### Framework-Level Failure Modes

The failure modes above describe individual agent behavior. The following catalog addresses failures of the framework itself — when the governance, enforcement, or architectural structures fail to deliver their intended value. These are meta-failures: the system designed to prevent agent failures is itself failing.

| Framework Failure Mode | Description | Symptom |
|---|---|---|
| **Governance Theater** | Governance agents deployed but not connected to enforcement. Reports generated, never acted on. | Governance agent logs show findings; agent behavior unchanged. Governance reports accumulate without corresponding configuration changes. |
| **Hook Erosion** | Hooks disabled "temporarily" for velocity, never re-enabled. Enforcement gap grows silently. | Hook execution logs show decreasing coverage over time. Constraints classified as "Hard enforcement" in Deterministic Enforcement (Part 3) are no longer firing. |
| **Brain Write-Only** | Brain accumulates entries that are never queried. Knowledge captured but never reused. | `brain_status` shows growing entry counts with near-zero `access_count` values. Agents make decisions without consulting relevant precedent. |
| **Adoption Profile Mismatch** | Framework deployed at Production profile for a project that needs Starter. Overhead exceeds value. | More time spent on framework governance than on productive work. Orchestrator spends >40% of budget on routing and coordination. |
| **Standing Order Drift** | Standing Orders in agent context diverge from the canonical source. Different agents operate under different rules. | Agents cite different versions of the same Standing Order. Behavioral inconsistencies between agents that should follow identical constraints. |
| **Quarantine Bypass** | External content reaches the Brain without passing through quarantine. May be architectural (missing integration) or operational (manual override normalized). | Brain entries with no quarantine audit trail. Entries from external sources with `approved: true` but no Admiral review record. |
| **Recovery Ladder Collapse** | Agents skip recovery ladder steps, jumping from retry to escalate. Middle steps (fallback, backtrack, isolate) atrophy. | Escalation reports with no fallback or backtrack attempts logged. Recovery ladder steps 2-4 never appear in audit trails. |
| **Specification-Implementation Divergence** | The specification (this document) evolves but deployed fleet configurations do not track changes. | Fleet behavior contradicts current specification. Configuration files reference deprecated section numbers or removed concepts. |

**Diagnostic Decision Tree (Framework Level):**

- Governance agents produce reports but nothing changes? → **Governance Theater** → Wire governance outputs to hooks or Orchestrator action items. Each governance finding must map to a concrete configuration change, threshold adjustment, or Admiral decision.
- Enforcement coverage declining? → **Hook Erosion** → Audit hook configurations against the enforcement classification (Deterministic Enforcement (Part 3)). Re-enable disabled hooks. Add hook-presence verification to the pre-flight checklist (Appendix A).
- Brain growing but retrieval rate flat? → **Brain Write-Only** → Check agent context for `brain_query` instructions. Verify agents have the Brain MCP tools in their tool registry. Add pre-decision query hooks or standing instructions to query before Propose-tier decisions.
- Framework overhead consuming more time than productive work? → **Adoption Profile Mismatch** → Drop to the appropriate profile. Re-evaluate graduation criteria. See Appendix B for profile-appropriate configurations.
- Agents behaving inconsistently on the same rules? → **Standing Order Drift** → Diff each agent's loaded Standing Orders against the canonical source (Standing Orders (Part 11)). Automate standing context injection via SessionStart hooks.
- External intelligence in Brain without audit trail? → **Quarantine Bypass** → Audit all Brain entries with external `source_agent` values. Verify the quarantine layer is active and integrated with all ingestion paths. Close any manual override workflows.
- Escalations without recovery attempts? → **Recovery Ladder Collapse** → Review escalation reports for evidence of steps 2-4 (fallback, backtrack, isolate). Add recovery-step verification to the escalation template. Consider a PostToolUse hook that requires recovery step evidence before accepting an escalation.
- Fleet behavior contradicts spec? → **Specification-Implementation Divergence** → Establish a version-check process. When the framework version increments, diff the changelog against deployed configurations. Add framework version to fleet metadata and alert when they diverge.

**Remediation Principles:**

Framework-level failures are harder to detect than agent-level failures because they manifest as *absence* — the absence of enforcement, the absence of retrieval, the absence of governance action. The primary diagnostic tool is the audit log: if a framework mechanism exists but the audit log shows no evidence of it executing, the mechanism has failed. Periodic framework health audits (quarterly or after each major project phase) should verify that every specified mechanism is actually operational, not just deployed.

### Failure Chains

Individual failure modes rarely occur in isolation. They cascade — one failure creates conditions that trigger the next. Understanding these chains enables early intervention: catching the upstream failure prevents the entire downstream sequence.

**Chain 1: Context Starvation → Hallucination → Sycophantic Drift → Governance Theater**

The agent lacks sufficient context (Context Starvation). Without grounding, it fills gaps with fabricated details (Hallucination). As the session progresses, it increasingly aligns with the established (hallucinated) framing rather than challenging it (Sycophantic Drift). Governance agents review but don't catch the drift because they share the same blind spots (Governance Theater). *Early intervention: context health check hook detects starvation before hallucination begins. See Case Study 1 (Appendix D).*

**Chain 2: Over-Decomposition → Orchestrator Overhead → Cost Overrun → Fleet Collapse**

Work is split into too many small chunks (Over-Decomposition). The Orchestrator spends more tokens on routing, handoffs, and coordination than on productive work (Orchestrator Overhead, reaching the 60% level documented in Case Study 2). Token costs exceed budget (Cost Overrun). The fleet is shut down or drastically reduced before completing the work (Fleet Collapse). *Early intervention: monitor the 20% chunk budget floor and the orchestrator overhead graduated thresholds.*

**Chain 3: Trust Miscalibration → Rubber-Stamp Approvals → Security Breach → Emergency Halt**

The Admiral widens Autonomous tier too aggressively or stops reviewing Propose-tier decisions carefully (Trust Miscalibration). Approvals become rubber-stamps — the Admiral approves without reviewing (Rubber-Stamp Approvals). An agent makes a security-critical decision autonomously that should have been caught (Security Breach). The fleet is halted pending investigation (Emergency Halt). *Early intervention: the Admiral's bottleneck detection signals (Part 10) identify rubber-stamping before it causes harm. See Case Study 3 (Appendix D).*

-----

