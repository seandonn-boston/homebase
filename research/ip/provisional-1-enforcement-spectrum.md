# Provisional Patent Application Draft #1

# Context-Pressure-Aware Enforcement Spectrum for Autonomous AI Agent Systems

**DRAFT — For Patent Counsel Review**
**Date:** March 16, 2026
**Inventor:** Sean Donn
**Priority Date:** March 13, 2026
**Priority Evidence:** Git commit `50ffb14`, repository `seandonn-boston/homebase`

---

## 1. Title of Invention

Context-Pressure-Aware Enforcement Spectrum for Autonomous AI Agent Systems

---

## 2. Technical Field

This invention relates to governance and enforcement mechanisms for autonomous AI agent systems, and more particularly to a tiered enforcement architecture that classifies operational constraints by their reliability under varying context-pressure conditions in large language model (LLM)-based agent systems.

---

## 3. Background of the Invention

### The Problem

Autonomous AI agents powered by large language models (LLMs) are increasingly deployed to perform complex tasks — writing code, managing infrastructure, making decisions, and coordinating with other agents. These agents receive operational constraints through natural language instructions embedded in configuration files, system prompts, and session context.

A fundamental and empirically observed problem exists: **LLM-based agents do not reliably follow instructions under all operating conditions.** Specifically:

1. **Context-pressure degradation:** As an agent's context window fills (during long sessions, complex tasks, or multi-step operations), earlier instructions are displaced or deprioritized. Safety-critical constraints embedded as natural language instructions become unreliable precisely when sessions are most complex — when violations are most dangerous.

2. **Instruction-following inconsistency:** LLMs process instructions probabilistically. An instruction that is followed 99% of the time will eventually be violated. For safety-critical constraints (e.g., "never commit credentials to version control"), 99% reliability is insufficient.

3. **No reliability classification:** Existing agent frameworks treat all constraints equivalently — as instructions to the language model. There is no systematic method for distinguishing constraints that must hold with 100% reliability from those where occasional deviation is acceptable.

### Limitations of Existing Approaches

**Open Policy Agent (OPA) and RBAC systems** evaluate static policies against structured inputs. They do not model context-pressure degradation in LLM-based systems and cannot classify constraints by reliability characteristics specific to language model behavior.

**AI safety guardrails** (content filters, constitutional AI, NeMo Guardrails) operate at the model output level — filtering or modifying generated text. They do not provide a framework for classifying the full range of operational constraints (from safety-critical to advisory) by enforcement mechanism.

**Traditional access control systems** (AWS IAM, capability-based security) control resource access but do not address the behavioral constraint space unique to autonomous AI agents — constraints like "prefer readable code over clever code" or "do not expand scope without authorization" that exist on a spectrum from hard requirements to soft preferences.

No existing system provides a method for:
- Classifying AI agent constraints by reliability under context pressure
- Mapping constraint classifications to appropriate enforcement mechanisms
- Coupling deterministic enforcement with self-healing feedback loops
- Validating enforcement coverage at configuration time

---

## 4. Summary of the Invention

The present invention provides a **three-tier enforcement spectrum** that classifies AI agent operational constraints by their reliability under context pressure and maps each tier to an appropriate enforcement mechanism:

**Tier 1 — Hard Enforcement:** Constraints enforced by deterministic programs (hooks) that execute at defined agent lifecycle events. These programs operate independently of the AI agent's language model, context window, and instruction set. They produce binary pass/block decisions. Reliability: 100%. Used for safety-critical and security constraints.

**Tier 2 — Firm Guidance:** Constraints embedded in agent configuration files (e.g., AGENTS.md, system prompts) that have high but degradable reliability under context pressure. These constraints are processed by the language model and are subject to probabilistic instruction-following behavior. Used for coding patterns, architectural preferences, and process requirements.

**Tier 3 — Soft Guidance:** Advisory constraints with low enforcement reliability, easily overridden under context pressure. Used for stylistic preferences and non-critical suggestions.

The invention further provides:
- A **lifecycle event hook system** with defined event types (PreToolUse, PostToolUse, PreCommit, PostCommit, SessionStart, TaskCompleted, PrePush, Periodic) where deterministic enforcement programs execute
- A **self-healing feedback loop** where hook output is injected as error context into the agent's next action, enabling automated correction with cycle detection to prevent infinite retry loops
- An **enforcement coverage validation** method that identifies compliance gaps at configuration time
- A **policy-mechanism separation** where Standing Orders define governance policy and hooks implement enforcement mechanisms

---

## 5. Detailed Description

### 5.1 The Enforcement Spectrum

The enforcement spectrum is a classification system for AI agent operational constraints. Each constraint is assigned to one of three tiers based on two factors: (a) the criticality of the constraint (what happens if it is violated), and (b) the availability of a deterministic check (can a program verify compliance without LLM involvement).

**Classification Rule:** If a constraint is safety-critical AND a deterministic check exists, the constraint MUST be assigned to the Hard Enforcement tier. If the constraint requires judgment or is informational, it is assigned to the Firm or Soft Guidance tier.

| Tier | Mechanism | Reliability | Classification Criteria |
|---|---|---|---|
| Hard Enforcement | Deterministic hooks, CI gates, linters, type checkers, filesystem permissions | 100% — fires deterministically regardless of agent state | Safety-critical AND deterministic check available |
| Firm Guidance | Configuration file rules, system prompt instructions, tool-specific configs | High but degradable under context pressure | Important but requires LLM judgment, or no deterministic check available |
| Soft Guidance | Comments, README notes, verbal instructions | Low — easily overridden | Preferences, suggestions, nice-to-haves |

The key insight underlying the enforcement spectrum is that **context pressure in LLMs creates a reliability gradient.** Instructions loaded early in a session (primacy position) degrade as the context window fills. Instructions compete with task-specific content for the model's attention. Under sufficient context pressure, any natural language instruction — regardless of emphasis, formatting, or repetition — can be violated. Only mechanisms operating outside the language model (deterministic hooks) maintain 100% reliability.

*Reference implementation: `aiStrat/admiral/spec/part3-enforcement.md`, Section "The Enforcement Spectrum"*

### 5.2 Enforcement vs. Monitoring Classification

Within the Hard Enforcement tier, hooks serve two distinct functions:

**Enforcement hooks** return non-zero exit codes to block agent actions. Used for safety-critical constraints where violation must be prevented deterministically (e.g., secret detection, scope boundary enforcement, identity validation).

**Monitoring hooks** always return exit code 0 and communicate information via advisory context. Used for resource awareness, informational checks, and conditions requiring human or agent judgment (e.g., token budget tracking, loop detection, context health monitoring).

**Anti-deadlock design principle:** Monitoring hooks must never hard-block. An enforcement hook blocks a specific dangerous action; a monitoring hook that blocks all tool use creates an unrecoverable deadlock — the agent cannot use any tool to resolve the condition that triggered the block.

This distinction prevents two empirically observed failure modes:
1. **Deadlock via over-enforcement:** A monitoring concern (token budget) implemented as an enforcement hook blocks all agent actions, creating an unrecoverable state.
2. **False confidence via under-enforcement:** A safety concern (secret detection) implemented as a monitoring hook allows the agent to acknowledge the warning and proceed with the violation under context pressure.

*Reference implementation: `aiStrat/admiral/spec/part3-enforcement.md`, Section "Enforcement vs. Monitoring"*

### 5.3 Hook Lifecycle Event System

The invention defines a set of lifecycle events at which deterministic enforcement programs (hooks) execute:

| Event | Trigger | Purpose |
|---|---|---|
| PreToolUse | Before any tool invocation by the agent | Block dangerous commands, enforce scope boundaries, validate budget |
| PostToolUse | After any tool invocation completes | Verify output integrity, detect loops, audit actions |
| PreCommit | Before a version control commit | Enforce linting, scan for secrets, validate test coverage |
| PostCommit | After a version control commit | Trigger notifications, CI pipelines, changelog updates |
| SessionStart | When an agent session initializes | Validate identity, load context, check environment |
| TaskCompleted | When a task is marked complete | Report quality metrics, log outcomes |
| PrePush | Before pushing to a remote repository | Enforce branch protection, verify review status |
| Periodic | On a configurable time interval | Governance heartbeat, scheduled health checks |

**Hook Contract:**
- **Input:** Structured JSON on stdin containing event type, tool name, parameters, agent identity, and trace ID
- **Output:** Exit code 0 (pass) or non-zero (block). Stdout captured and fed back to agent as context. Stderr logged.
- **Execution:** Synchronous — agent runtime pauses until hook returns. Configurable timeout (default 30 seconds; reference implementations typically use 5-10 seconds for lightweight monitoring hooks). Hooks exceeding timeout are killed and treated as failures.
- **Chaining:** Multiple hooks bind to the same event. Execute in declared order. First failure stops the chain (fail-fast).
- **Idempotency:** Hooks must be idempotent. The runtime may invoke a hook multiple times for the same event during self-healing retries.
- **Isolation:** Hooks execute in a sandboxed environment with read access to the repository. Hooks cannot modify agent state, context, or tool parameters.

*Reference implementation: `aiStrat/admiral/spec/part3-enforcement.md`, Section "Hook Lifecycle Events"; `.hooks/` directory (13 executable implementations)*

### 5.4 Self-Healing Feedback Loop

When a PostToolUse hook detects a violation, the system initiates a self-healing loop:

```
Agent performs action
  → PostToolUse hook evaluates output against policy
    → Exit 0: proceed to next action
    → Non-zero exit:
      → Hook stdout (error description) injected as context into agent's next turn
      → Agent attempts correction informed by error context
      → Hook re-evaluates corrected output
      → Cycle detector tracks (hook_name, error_signature) tuples
      → If identical error recurs: terminate loop, advance to recovery ladder
      → Maximum retry count configurable (default: 3)
```

**Cycle Detection:** The system maintains a set of `(hook_name, error_signature)` tuples for each self-healing episode. When the same tuple appears twice, the loop is terminated — the agent is producing identical failures and further retries will not yield different results. This prevents the common failure mode of agents retrying the same failing approach indefinitely.

**Recovery Ladder:** Upon self-healing loop termination, the system advances through a five-step recovery sequence:

1. **Retry with variation** — Agent must attempt a genuinely different approach (2-3 attempts maximum)
2. **Fallback** — Simpler approach that still satisfies core requirements
3. **Backtrack** — Revert to last checkpoint, try a different path entirely
4. **Isolate and Skip** — Mark the task as blocked, document the blocker, advance to next work item
5. **Escalate** — Produce a structured report, cease work, request human intervention

No step may be skipped. The system enforces sequential progression through the ladder.

*Reference implementation: `aiStrat/admiral/spec/part3-enforcement.md`, Section "Self-Healing Loop Specification"*

### 5.5 Policy-Mechanism Separation: Standing Orders

The invention separates governance **policy** from enforcement **mechanism** through a Standing Orders system:

**Standing Orders** are a numbered set of behavioral rules with a defined priority hierarchy, loaded into every agent's context at session start via a deterministic loading mechanism. They define WHAT the agent must do. Priority categories:

1. Safety (highest priority)
2. Authority
3. Process
4. Communication
5. Scope (lowest priority)

**Hooks** are the deterministic enforcement mechanisms that ensure Standing Orders compliance. They define HOW compliance is verified.

**Enforcement Map:** Each Standing Order is classified by enforcement mechanism:

| Classification | Description | Example |
|---|---|---|
| Mechanical | Fully enforceable by deterministic hooks | "Never commit secrets" → secret scanner hook |
| Judgment-Assisted | Partially enforceable; hook validates structure, agent applies judgment | "Use appropriate authority tier" → hook validates tier is declared, agent chooses tier |
| Advisory | Not mechanically enforceable; relies on firm/soft guidance | "Communicate clearly" → no deterministic check possible |

This classification ensures that every safety-critical Standing Order has a corresponding mechanical enforcement hook, while acknowledging that some governance requirements inherently require agent judgment.

*Reference implementation: `aiStrat/admiral/reference/standing-orders-enforcement-map.md`; `admiral/standing-orders/` (JSON definitions)*

### 5.6 Enforcement Coverage Validation

At configuration time, the system validates that enforcement coverage is adequate:

1. All constraints classified as safety-critical or security have corresponding hook-based enforcement
2. All Standing Orders classified as "Mechanical" have at least one bound hook
3. No enforcement gaps exist where a safety-critical constraint relies solely on firm or soft guidance
4. Hook bindings cover the appropriate lifecycle events for each constraint type

This validation runs before the agent fleet begins operation, preventing the deployment of governance configurations with enforcement gaps.

---

## 6. Claims

### Independent Claims

**Claim 1.** A method for governing autonomous AI agent operations, comprising:
- (a) receiving a set of operational constraints for an AI agent system;
- (b) classifying each constraint into one of at least three enforcement tiers based on (i) the criticality of the constraint and (ii) whether a deterministic verification check exists that operates independently of the AI agent's language model;
- (c) assigning constraints classified as safety-critical with available deterministic checks to a hard enforcement tier, wherein enforcement is performed by deterministic programs executing at defined lifecycle events in the agent's operation cycle;
- (d) assigning remaining constraints to guidance tiers with decreasing reliability;
- wherein the hard enforcement tier operates independently of the AI agent's context window state, instruction set, and token pressure, maintaining 100% enforcement reliability regardless of the agent's operating conditions.

**Claim 2.** A system for deterministic enforcement of operational constraints in AI agent operations, comprising:
- (a) a set of lifecycle event hooks, each hook being an executable program that receives structured input describing an agent action and produces a binary pass/block decision;
- (b) a hook execution runtime that pauses agent operation, invokes the appropriate hook synchronously, and either permits or blocks the agent action based on the hook's exit code;
- (c) a plurality of defined lifecycle events including at least: pre-tool-use (before agent tool invocation), post-tool-use (after agent tool invocation), session-start (at agent initialization), and periodic (on configurable intervals);
- (d) a hook isolation mechanism ensuring hooks execute in a sandboxed environment and cannot modify agent state, context, or tool parameters;
- wherein each hook is idempotent, timeout-bounded, and produces deterministic results independent of the AI agent's language model state.

**Claim 3.** A method for automated self-healing in AI agent operations, comprising:
- (a) detecting, via a post-action hook, that an agent's output violates a policy constraint;
- (b) capturing the hook's diagnostic output describing the violation;
- (c) injecting the diagnostic output as error context into the agent's subsequent action;
- (d) receiving a corrected output from the agent informed by the error context;
- (e) re-evaluating the corrected output via the same hook;
- (f) tracking violation signatures as (hook_identifier, error_signature) tuples;
- (g) terminating the self-healing loop when an identical violation signature recurs;
- (h) upon loop termination, advancing to a sequential recovery ladder comprising progressively more conservative recovery strategies;
- wherein no recovery step may be skipped and the system enforces sequential progression from retry through escalation to human intervention.

### Dependent Claims

**Claim 4.** The method of Claim 1, further comprising:
- separating governance policy from enforcement mechanism through a Standing Orders system, wherein numbered behavioral rules define policy requirements and deterministic hooks implement enforcement of those requirements;
- classifying each Standing Order as mechanical (fully enforceable by hooks), judgment-assisted (partially enforceable), or advisory (not mechanically enforceable);
- validating at configuration time that all Standing Orders classified as mechanical have at least one corresponding enforcement hook bound to an appropriate lifecycle event.

**Claim 5.** The method of Claim 1, further comprising:
- loading Standing Orders into every agent's context at session start via a deterministic loading mechanism operating before any project-specific instructions;
- defining a priority hierarchy among Standing Orders (Safety > Authority > Process > Communication > Scope);
- resolving conflicts between Standing Orders by giving precedence to the higher-priority category;
- wherein the Standing Orders are version-controlled, programmatically loaded, and not modifiable by the agents they govern.

**Claim 6.** The system of Claim 2, wherein hooks serve one of two distinct functions:
- enforcement hooks that return non-zero exit codes to block agent actions when safety-critical violations are detected;
- monitoring hooks that always return exit code 0 and communicate information via advisory context;
- wherein monitoring hooks are prohibited from blocking agent actions to prevent deadlock conditions where the agent cannot use any tool to resolve the triggering condition.

**Claim 7.** The method of Claim 3, wherein the recovery ladder comprises five sequential steps:
- (a) retry with variation, wherein the agent attempts a genuinely different approach;
- (b) fallback to a simpler approach satisfying core requirements;
- (c) backtrack to a previous checkpoint and attempt a different path;
- (d) isolate the blocked task, document the blocker, and advance to the next work item;
- (e) escalate by producing a structured report and ceasing work pending human intervention.

**Claim 8.** The method of Claim 1, further comprising:
- performing enforcement coverage validation at configuration time by verifying that all constraints classified as safety-critical have corresponding hook-based enforcement;
- rejecting fleet configurations where safety-critical constraints rely solely on guidance-tier enforcement;
- generating a coverage report identifying any enforcement gaps.

**Claim 9.** The method of Claim 1, wherein classifying constraints is based on an empirically observed property of large language models: that natural language instructions degrade in reliability under context pressure (increasing context window utilization, competing instructions, and extended session duration), while deterministic hooks maintain constant reliability regardless of context pressure.

---

## 7. Prior Art Differentiation

| System/Approach | What It Does | What It Lacks vs. This Invention |
|---|---|---|
| Open Policy Agent (OPA) | Evaluates structured policies against structured inputs | No context-pressure awareness; no self-healing loops; no enforcement spectrum classification; operates on static data, not LLM behavioral constraints |
| AWS IAM / RBAC | Controls resource access via roles and permissions | No behavioral constraint enforcement; no concept of guidance tiers; no self-healing; designed for API access control, not agent behavioral governance |
| OpenAI Content Filters | Filters model output for harmful content | Single-tier (block/allow); no enforcement spectrum; no lifecycle event hooks; no self-healing loops; operates on model output, not agent operational constraints |
| Anthropic Constitutional AI | Uses a set of principles to guide model behavior | Operates within the language model; subject to context-pressure degradation; no deterministic hook layer; no enforcement coverage validation |
| NeMo Guardrails (NVIDIA) | Programmable guardrails for LLM conversations | Conversational guardrails, not fleet-level governance; no enforcement spectrum; no self-healing with cycle detection; no policy-mechanism separation |
| CrewAI / LangGraph / AutoGen | Multi-agent orchestration frameworks | No enforcement tier classification; no hook lifecycle system; no self-healing loops; constraints are all at the instruction level (guidance tier only) |
| Kubernetes Health Checks | Liveness/readiness probes for container orchestration | Infrastructure-level, not AI behavioral governance; no context-pressure awareness; no enforcement spectrum; no agent-specific self-healing |

---

## 8. Figures List

The following figures should accompany the application (descriptions for counsel/illustrator):

1. **Figure 1: The Enforcement Spectrum** — Three-tier diagram showing Hard Enforcement (hooks), Firm Guidance (config files), and Soft Guidance (advisory) with reliability gradient from 100% to Low, mapped to constraint types.

2. **Figure 2: Hook Lifecycle Event Flow** — Sequence diagram showing agent action → lifecycle event trigger → hook execution → pass/block decision → agent continues or receives error context.

3. **Figure 3: Self-Healing Loop with Cycle Detection** — Flowchart showing: agent action → hook evaluation → failure → error context injection → agent retry → re-evaluation → cycle detection check → recovery ladder advancement.

4. **Figure 4: Recovery Ladder** — Five-step sequential diagram: Retry with Variation → Fallback → Backtrack → Isolate and Skip → Escalate, with "no step may be skipped" annotation.

5. **Figure 5: Policy-Mechanism Separation** — Two-layer diagram showing Standing Orders (policy layer) connected to Hooks (enforcement layer) via an enforcement map, with classification labels (Mechanical, Judgment-Assisted, Advisory).

6. **Figure 6: Enforcement Coverage Validation** — Configuration-time validation flow showing constraint classification → hook binding check → gap identification → coverage report.

---

## 9. Specification References

| Component | Repository Path |
|---|---|
| Core specification | `aiStrat/admiral/spec/part3-enforcement.md` |
| Standing Orders enforcement map | `aiStrat/admiral/reference/standing-orders-enforcement-map.md` |
| Hook implementations (13 scripts) | `.hooks/` |
| Standing Order definitions | `admiral/standing-orders/` |
| Self-healing specification | `aiStrat/admiral/spec/part3-enforcement.md`, "Self-Healing Loop Specification" |
| Recovery ladder specification | `aiStrat/admiral/spec/part7-quality.md` |
| Invention date evidence | `research/invention-dates.md`, Entry #1 |
