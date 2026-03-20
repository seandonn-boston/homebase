# Counsel Review Package — Admiral Framework IP Portfolio

**Prepared for:** Patent & Trademark Counsel
**Prepared by:** Sean Donn
**Date:** March 16, 2026
**Repository:** `seandonn-boston/helm` (GitHub, private)

---

## How to Use This Document

This is a **single-file review package** consolidating all IP filing materials for the Admiral Framework. It contains:

1. **Cover Memo** — Strategy overview, competitive landscape, budget (p. 1)
2. **Provisional Patent #1** — Enforcement Spectrum (HIGHEST priority)
3. **Provisional Patent #2** — Brain Architecture (HIGH priority)
4. **Provisional Patent #3** — Intent Engineering (HIGH priority)
5. **Trademark Checklist #1** — ADMIRAL FRAMEWORK
6. **Trademark Checklist #2** — INTENT ENGINEERING
7. **Appendix A** — Invention Date Evidence (priority date documentation)

The individual source files are also available in `research/ip/` for reference. The complete specification (114 files) is in `aiStrat/admiral/spec/` within the repository.

### Key Dates

| Deadline | Date | Action |
|---|---|---|
| **Priority date (earliest)** | March 13, 2026 | Established by git commit `50ffb14` |
| **Non-provisional conversion** | March 13, 2027 | 12 months from earliest priority date |
| **Recommended filing** | April 2026 | Provisionals #1 and #2 (highest competitive risk) |

---

# PART 1: COVER MEMO

---

## Overview

The Admiral Framework is a comprehensive, model-agnostic specification for autonomous AI agent fleet orchestration. It defines how organizations structure, secure, coordinate, and govern fleets of AI agents operating with increasing autonomy. The framework comprises 114 specification files across 22 groups, with working reference implementations.

This memo accompanies **three provisional patent application drafts** and **two trademark filing checklists** for counsel review.

---

## Filing Summary

### Provisional Patents

| # | Title | Priority Date | Commit | Filing Priority |
|---|---|---|---|---|
| 1 | Context-Pressure-Aware Enforcement Spectrum for AI Agent Systems | 2026-03-13 | `50ffb14` | HIGHEST — File first |
| 2 | Progressive Institutional Memory Architecture for AI Agent Fleets | 2026-03-14 | `49bd0db` | HIGH — File second |
| 3 | Intent Engineering: Structured Methodology for Human-to-AI Instruction Decomposition | 2026-03-14 | `701258d` | HIGH — File third |

### Trademarks

| Mark | Classes | Filing Basis |
|---|---|---|
| ADMIRAL FRAMEWORK | 42, 41 | Intent-to-use (1(b)) |
| INTENT ENGINEERING | 42, 41 | Intent-to-use (1(b)) |

---

## Priority Date Evidence

All invention dates are documented via git history analysis (see Appendix A). Each patent opportunity maps to a specific git commit hash with timestamp, providing verifiable priority date evidence. The git repository is hosted on GitHub at `seandonn-boston/helm` with continuous commit history from March 13, 2026 onward.

---

## Competitive Landscape

Filing urgency is elevated by three competitive developments:

1. **McKinsey "Agentic Organization" Framework (March 2026)** — Five-pillar governance model with embedding control agents. Conceptual overlap but no implementable specification, no enforcement spectrum, no institutional memory architecture. Threat level: VERY HIGH for idea-level competition.

2. **Singapore IMDA Model AI Governance Framework (January 2026)** — Action-space risk framing overlaps with Admiral's capability declarations. Guidelines only, not operational specification. Threat level: HIGH for regulatory momentum.

3. **Google A2A Protocol, OpenAI Agents SDK, Microsoft Agent Framework** — Agent runtime competition. These build/run agents but do not address governance, enforcement, or institutional memory. Threat level: MEDIUM for market attention capture.

No competitor has filed patents in the specific intersection of: context-pressure-aware enforcement + fleet-wide institutional memory + formal decision authority taxonomy + structured intent engineering methodology.

---

## Patent Strategy

### Recommended Filing Order

**Month 1 (immediate):** Provisionals #1 (Enforcement Spectrum) and #2 (Brain Architecture) — strongest novelty, most concrete implementations, highest competitive risk.

**Month 2:** Provisional #3 (Intent Engineering) — establishes priority on an emerging professional discipline before competitors name and claim it.

**Months 3-6:** Consider additional provisionals on Agent Identity (#9), Quarantine Immune System (#10), and Decision Authority Taxonomy (#3) — all with strong novelty assessments. See `research/patent-opportunity-analysis.md` for full 23-opportunity analysis.

**Month 10-11:** Convert provisionals to full utility patents with expanded dependent claims from related innovations.

### Dependent Claims Strategy

Each provisional includes dependent claims that draw from related innovations:

- Patent #1 (Enforcement Spectrum) includes dependent claims from Self-Healing Governance Loops (#4) and Standing Orders (#5)
- Patent #2 (Brain Architecture) includes dependent claims from Five-Layer Quarantine Immune System (#10)
- Patent #3 (Intent Engineering) includes dependent claims linking to the enforcement spectrum and Brain knowledge protocol

### Defensive Patent Pledge Consideration

Two strategic paths are under evaluation:

1. **Doctrine-as-product (ITIL/TOGAF model):** Broad defensive pledge — no assertion against non-asserting entities. Revenue from consulting, certification, and ecosystem licensing.
2. **Full platform (SaaS/runtime):** Narrower pledge — open spec for internal use, licenses for commercial implementations building on patented mechanisms.

Counsel guidance requested on pledge strategy.

---

## Trademark Strategy

Both marks are currently in active use in pre-commercial documentation, specifications, and sales materials. Neither has been offered commercially as a service yet, warranting intent-to-use filings.

**Clearance search recommendation:** Commission full clearance searches for both marks before filing. "Admiral" has existing registrations in unrelated classes; "Intent Engineering" appears to be unregistered as a mark.

---

## Budget Estimate

| Item | Estimated Cost |
|---|---|
| 3 provisional patents (counsel prep + filing) | $4,500–$9,000 |
| 2 trademark applications (2 classes each, intent-to-use) | $1,000–$2,000 |
| Trademark clearance searches (2 marks) | $600–$1,200 |
| **Total estimated range** | **$6,100–$12,200** |

---

## Questions for Counsel

1. Claims breadth — are the independent claims appropriately scoped for provisionals?
2. Defensive pledge — which path (doctrine-as-product vs. full platform) better serves the IP strategy?
3. Filing entity — file as individual now or wait for entity incorporation (planned Phase 5)?
4. Additional provisionals — which of the remaining 20 innovations warrant near-term filing?
5. "Intent Engineering" descriptiveness — what is the realistic probability of a 2(e)(1) refusal?

---
---

# PART 2: PROVISIONAL PATENT #1 — ENFORCEMENT SPECTRUM

---

## Title of Invention

Context-Pressure-Aware Enforcement Spectrum for Autonomous AI Agent Systems

**Inventor:** Sean Donn
**Priority Date:** March 13, 2026
**Priority Evidence:** Git commit `50ffb14`, repository `seandonn-boston/helm`

---

## Technical Field

This invention relates to governance and enforcement mechanisms for autonomous AI agent systems, and more particularly to a tiered enforcement architecture that classifies operational constraints by their reliability under varying context-pressure conditions in large language model (LLM)-based agent systems.

---

## Background of the Invention

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

## Summary of the Invention

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

## Detailed Description

### 5.1 The Enforcement Spectrum

The enforcement spectrum is a classification system for AI agent operational constraints. Each constraint is assigned to one of three tiers based on two factors: (a) the criticality of the constraint (what happens if it is violated), and (b) the availability of a deterministic check (can a program verify compliance without LLM involvement).

**Classification Rule:** If a constraint is safety-critical AND a deterministic check exists, the constraint MUST be assigned to the Hard Enforcement tier. If the constraint requires judgment or is informational, it is assigned to the Firm or Soft Guidance tier.

| Tier | Mechanism | Reliability | Classification Criteria |
|---|---|---|---|
| Hard Enforcement | Deterministic hooks, CI gates, linters, type checkers, filesystem permissions | 100% — fires deterministically regardless of agent state | Safety-critical AND deterministic check available |
| Firm Guidance | Configuration file rules, system prompt instructions, tool-specific configs | High but degradable under context pressure | Important but requires LLM judgment, or no deterministic check available |
| Soft Guidance | Comments, README notes, verbal instructions | Low — easily overridden | Preferences, suggestions, nice-to-haves |

The key insight underlying the enforcement spectrum is that **context pressure in LLMs creates a reliability gradient.** Instructions loaded early in a session (primacy position) degrade as the context window fills. Instructions compete with task-specific content for the model's attention. Under sufficient context pressure, any natural language instruction — regardless of emphasis, formatting, or repetition — can be violated. Only mechanisms operating outside the language model (deterministic hooks) maintain 100% reliability.

### 5.2 Enforcement vs. Monitoring Classification

Within the Hard Enforcement tier, hooks serve two distinct functions:

**Enforcement hooks** return non-zero exit codes to block agent actions. Used for safety-critical constraints where violation must be prevented deterministically (e.g., secret detection, scope boundary enforcement, identity validation).

**Monitoring hooks** always return exit code 0 and communicate information via advisory context. Used for resource awareness, informational checks, and conditions requiring human or agent judgment (e.g., token budget tracking, loop detection, context health monitoring).

**Anti-deadlock design principle:** Monitoring hooks must never hard-block. An enforcement hook blocks a specific dangerous action; a monitoring hook that blocks all tool use creates an unrecoverable deadlock — the agent cannot use any tool to resolve the condition that triggered the block.

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
- **Execution:** Synchronous — agent runtime pauses until hook returns. Configurable timeout (default 30 seconds). Hooks exceeding timeout are killed and treated as failures.
- **Chaining:** Multiple hooks bind to the same event. Execute in declared order. First failure stops the chain (fail-fast).
- **Idempotency:** Hooks must be idempotent. The runtime may invoke a hook multiple times for the same event during self-healing retries.
- **Isolation:** Hooks execute in a sandboxed environment with read access to the repository. Hooks cannot modify agent state, context, or tool parameters.

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

**Cycle Detection:** The system maintains a set of `(hook_name, error_signature)` tuples for each self-healing episode. When the same tuple appears twice, the loop is terminated — the agent is producing identical failures and further retries will not yield different results.

**Recovery Ladder:** Upon self-healing loop termination, the system advances through a five-step recovery sequence:

1. **Retry with variation** — Agent must attempt a genuinely different approach (2-3 attempts maximum)
2. **Fallback** — Simpler approach that still satisfies core requirements
3. **Backtrack** — Revert to last checkpoint, try a different path entirely
4. **Isolate and Skip** — Mark the task as blocked, document the blocker, advance to next work item
5. **Escalate** — Produce a structured report, cease work, request human intervention

No step may be skipped. The system enforces sequential progression through the ladder.

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

### 5.6 Enforcement Coverage Validation

At configuration time, the system validates that enforcement coverage is adequate:

1. All constraints classified as safety-critical or security have corresponding hook-based enforcement
2. All Standing Orders classified as "Mechanical" have at least one bound hook
3. No enforcement gaps exist where a safety-critical constraint relies solely on firm or soft guidance
4. Hook bindings cover the appropriate lifecycle events for each constraint type

---

## Claims

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

## Prior Art Differentiation

| System/Approach | What It Does | What It Lacks vs. This Invention |
|---|---|---|
| Open Policy Agent (OPA) | Evaluates structured policies against structured inputs | No context-pressure awareness; no self-healing loops; no enforcement spectrum classification |
| AWS IAM / RBAC | Controls resource access via roles and permissions | No behavioral constraint enforcement; no concept of guidance tiers; no self-healing |
| OpenAI Content Filters | Filters model output for harmful content | Single-tier (block/allow); no enforcement spectrum; no lifecycle event hooks |
| Anthropic Constitutional AI | Uses principles to guide model behavior | Operates within the language model; subject to context-pressure degradation; no deterministic hook layer |
| NeMo Guardrails (NVIDIA) | Programmable guardrails for LLM conversations | Conversational guardrails, not fleet-level governance; no self-healing with cycle detection |
| CrewAI / LangGraph / AutoGen | Multi-agent orchestration frameworks | No enforcement tier classification; no hook lifecycle system; constraints all at instruction level |

---

## Figures Required

1. **Figure 1:** The Enforcement Spectrum — Three-tier diagram with reliability gradient
2. **Figure 2:** Hook Lifecycle Event Flow — Sequence diagram
3. **Figure 3:** Self-Healing Loop with Cycle Detection — Flowchart
4. **Figure 4:** Recovery Ladder — Five-step sequential diagram
5. **Figure 5:** Policy-Mechanism Separation — Two-layer Standing Orders + Hooks diagram
6. **Figure 6:** Enforcement Coverage Validation — Configuration-time validation flow

## Specification References

| Component | Repository Path |
|---|---|
| Core specification | `aiStrat/admiral/spec/part3-enforcement.md` |
| Standing Orders enforcement map | `aiStrat/admiral/reference/standing-orders-enforcement-map.md` |
| Hook implementations (13 scripts) | `.hooks/` |
| Standing Order definitions | `admiral/standing-orders/` |
| Self-healing specification | `aiStrat/admiral/spec/part3-enforcement.md` |
| Recovery ladder specification | `aiStrat/admiral/spec/part7-quality.md` |

---
---

# PART 3: PROVISIONAL PATENT #2 — BRAIN ARCHITECTURE

---

## Title of Invention

Progressive Institutional Memory Architecture for Autonomous AI Agent Fleets

**Inventor:** Sean Donn
**Priority Date:** March 14, 2026
**Priority Evidence:** Git commit `49bd0db`, repository `seandonn-boston/helm`

---

## Technical Field

This invention relates to knowledge management systems for autonomous AI agent fleets, and more particularly to a progressive multi-level knowledge architecture with semantic retrieval, knowledge lifecycle signals, and a defense system for protecting institutional memory from adversarial external intelligence.

---

## Background of the Invention

### The Problem

Autonomous AI agents powered by large language models are fundamentally **amnesiac** — they lose all session context when a session ends. This creates three critical problems in fleet operations:

1. **Session amnesia:** An agent that spent 2 hours learning a codebase's architecture starts from zero in the next session. Lessons learned, decisions made, and failures encountered are lost.

2. **Cross-agent knowledge silos:** In a multi-agent fleet, Agent A may discover that "Prisma migrations fail silently when the database URL contains special characters." Agent B has no access to this lesson.

3. **No semantic retrieval:** When persistent storage exists, retrieval is keyword-based. A query for "How did we handle authentication?" will not find entries about "login flow," "auth middleware," or "JWT implementation."

### Limitations of Existing Approaches

**RAG systems** retrieve documents but lack typed knowledge entries, inter-entry relationships, lifecycle signals, or defense against adversarial content injection.

**Vector databases** (Pinecone, Weaviate, Chroma) are storage engines, not knowledge management systems. They lack entry categorization, provenance tracking, or quarantine systems.

**Enterprise knowledge bases** (Confluence, SharePoint) store human-authored documents. They do not support automated AI agent capture, semantic retrieval, or concurrent multi-agent access.

**File-based persistence** breaks down with concurrent access, cross-project queries, and scale.

---

## Summary of the Invention

A **three-level progressive institutional memory architecture** for AI agent fleets:

**Level B1 (File-Based):** JSON files in `.brain/`, git-tracked. Keyword retrieval. Zero infrastructure. Validates the persistent memory hypothesis.

**Level B2 (SQLite + Vector Embeddings):** Single-file SQLite with vector columns for semantic search via cosine similarity. No server required. Adds semantic retrieval and usefulness scoring.

**Level B3 (Postgres + pgvector):** Full enterprise knowledge system with HNSW vector indexes, typed inter-entry relationships (supports, contradicts, supersedes, elaborates, caused_by), zero-trust access control, and a five-layer quarantine system.

Advancement is governed by **measured metrics**, not organizational maturity:
- B1 → B2: keyword search misses semantically relevant entries >30% of the time
- B2 → B3: concurrent agent access causes lock contention or cross-project queries are needed
- Minimum 2 weeks at each level before advancement

---

## Detailed Description

### Knowledge Entry Schema

Each entry contains: Classification (decision/outcome/lesson/context/failure/pattern), Title, Content with rationale, Vector Embedding, Provenance (agent identity, session, project, timestamp), Sensitivity classification, Entry Links (typed relationships), Strengthening Score, Decay Tracking, and Supersession Chain.

**Intent-rich capture:** "We chose Postgres over MongoDB because we valued transactional consistency over schema flexibility" — not just "We chose Postgres."

### Semantic Retrieval via Vector Embeddings

Vector search matches meaning, not text. A query for "authentication" also returns entries about "login flow," "auth middleware," "JWT implementation," and "OAuth consideration we rejected."

**Multi-signal retrieval pipeline (B3):** Combines semantic similarity, recency, strengthening score, and role-relevance for ranked results with confidence levels.

### Knowledge Lifecycle: Strengthening and Decay

- **Strengthening:** Retrieval + confirmed successful use increases score. Useful knowledge becomes more discoverable.
- **Decay:** Unretrieved entries receive decay warnings (not deletion). Signals staleness for review.
- **Supersession chains:** Updated knowledge creates a new entry linked to what it supersedes. Preserves history.

### Recursion Prevention: The Mobius Loop

Architectural separation prevents infinite recursion: demand signals → `_demand/`, knowledge scans → `{project}/`, self-instrumentation → `_meta/`. No circular path exists by structure.

### Five-Layer Quarantine Immune System

| Layer | Method | LLM Involved? |
|---|---|---|
| 1. Structural Validation | Schema conformance, size limits | No |
| 2. Injection Pattern Detection | 70+ regex patterns for AI-specific attacks | No |
| 3. LLM-Airgapped Semantic Analysis | Bayesian classification, TF-IDF scoring | No |
| 4. LLM Advisory Layer | Reject-only authority (can never approve) | Yes, but constrained |
| 5. Antibody Generation | Converts attacks into FAILURE entries | No |

**Critical design principle:** Layers 1-3 are LLM-free. Content designed to manipulate LLMs cannot influence its own admission.

---

## Claims

### Independent Claims

**Claim 1.** A knowledge management system for autonomous AI agent fleets, comprising:
- (a) a progressive multi-level architecture with at least three implementation levels of increasing capability, wherein each level provides a superset of the previous level's functionality;
- (b) measurable graduation criteria governing advancement between levels, including at least: a retrieval miss rate threshold for advancing from keyword-based to semantic retrieval, and a concurrent access threshold for advancing from single-file to server-based storage;
- (c) a minimum operational period requirement at each level before advancement is permitted;
- wherein infrastructure complexity scales only when empirically justified by measured metrics.

**Claim 2.** A knowledge lifecycle management method for AI agent fleets, comprising:
- (a) recording knowledge entries with typed classifications (at least: decision, outcome, lesson, failure, pattern) and vector embeddings capturing semantic meaning;
- (b) increasing a strengthening score for entries upon retrieval and confirmed successful use;
- (c) generating decay warnings for entries not retrieved within a configurable time period;
- (d) maintaining supersession chains wherein updated knowledge creates a new entry linked to the entry it supersedes;
- wherein the knowledge system exhibits biological-like properties of strengthening through use and weakening through disuse.

**Claim 3.** A defense system for protecting AI agent knowledge bases from adversarial external intelligence, comprising:
- (a) a first validation layer performing deterministic structural checks without AI involvement;
- (b) a second validation layer performing pattern-based injection detection without AI involvement;
- (c) a third validation layer performing semantic analysis using statistical methods without any large language model engagement;
- (d) a fourth validation layer using a large language model with reject-only authority;
- (e) an antibody generation mechanism that converts detected adversarial content into knowledge entries;
- wherein the load-bearing security layers (a), (b), and (c) operate without LLM involvement, breaking the circular dependency where an AI judges content designed to manipulate AIs.

### Dependent Claims

**Claim 4.** The system of Claim 1, wherein: the first level comprises file-based storage with one JSON file per entry, git-tracked; the second level comprises a single-file database with vector embedding columns; the third level comprises a server-based relational database with vector indexes, typed inter-entry relationships, and zero-trust access control.

**Claim 5.** The method of Claim 2, further comprising: typed inter-entry relationships (supports, contradicts, supersedes, elaborates, caused_by); knowledge graph traversal for multi-hop retrieval; confidence levels based on semantic similarity, recency, strengthening score, and role-relevance.

**Claim 6.** The method of Claim 2, wherein entries capture intent-rich content: decisions with rationale and alternatives considered; failures with diagnosis and resolution; patterns with measured impact.

**Claim 7.** The system of Claim 1, further comprising: multi-signal retrieval pipeline; cross-agent, cross-project retrieval with identity-bound access control; append-only audit log.

**Claim 8.** The defense system of Claim 3, wherein injection detection includes AI-agent-specific patterns: prompt injection, authority spoofing, role override, system prompt extraction, meta-level instruction manipulation.

**Claim 9.** The system of Claim 1, further comprising recursion prevention wherein demand signals, knowledge scans, and self-instrumentation write to separate directories with no circular I/O paths.

**Claim 10.** The defense system of Claim 3, wherein antibody generation extracts attack signatures, creates failure-type entries, and makes them available to future quarantine evaluations.

---

## Prior Art Differentiation

| System/Approach | What It Lacks vs. This Invention |
|---|---|
| RAG Systems (LangChain, LlamaIndex) | No typed entries, lifecycle signals, relationships, quarantine, or progressive architecture |
| Vector Databases (Pinecone, Weaviate) | Storage only — no knowledge management, lifecycle, or defense system |
| Enterprise Knowledge Bases (Confluence) | No AI agent capture, semantic retrieval, or multi-agent concurrent access |
| File-Based Persistence | No concurrent access, cross-project queries, semantic retrieval, or lifecycle |
| Knowledge Graphs (Neo4j) | No vector embeddings, lifecycle signals, progressive architecture, or quarantine |

## Specification References

| Component | Repository Path |
|---|---|
| Core specification | `aiStrat/admiral/spec/part5-brain.md` |
| B1/B2/B3 level specs | `aiStrat/brain/level1-spec.md`, `level2-spec.md`, `level3-spec.md` |
| Postgres schema | `aiStrat/brain/schema/001_initial.sql` |
| Brain CLI tools | `admiral/bin/brain_record`, `brain_query`, `brain_retrieve`, `brain_audit` |
| Injection detection library | `admiral/lib/injection_detect.sh` |

---
---

# PART 4: PROVISIONAL PATENT #3 — INTENT ENGINEERING

---

## Title of Invention

Intent Engineering: Structured Methodology for Human-to-AI Agent Instruction Decomposition

**Inventor:** Sean Donn
**Priority Date:** March 14, 2026
**Priority Evidence:** Git commit `701258d`, repository `seandonn-boston/helm`

---

## Technical Field

This invention relates to methods for structuring human instructions to autonomous AI agent systems, and more particularly to a formalized six-element decomposition methodology that transforms unstructured human intent into verifiable agent objectives with explicit failure mode definitions, judgment boundaries, and value alignment specifications.

---

## Background of the Invention

### The Problem

1. **Output-oriented instructions:** Current practice tells agents WHAT to produce without specifying what must NOT happen, what to do when plans fail, or where agents must stop and request human judgment.

2. **Implicit failure handling:** Most instructions assume success. Without explicit failure instructions, agents default to workarounds that compound into larger failures.

3. **Missing judgment boundaries:** Without explicit boundaries, agents act confidently in domains requiring human taste, ethics, strategy, or stakeholder judgment — where LLM responses are systematically unreliable.

### Limitations of Existing Approaches

- **Prompt engineering** optimizes single interactions, not multi-step operations with failure recovery
- **Context engineering** designs information flows but doesn't address intent communication
- **Template systems** (LangChain, CrewAI, AutoGen) standardize format without standardizing the content dimensions that prevent failures

---

## Summary of the Invention

**Intent Engineering** — a formalized methodology decomposing human intent into six structured elements:

1. **Goal** — The outcome to achieve (not the steps)
2. **Priority** — How this work ranks against competing concerns
3. **Constraints** — What must not happen, regardless of circumstances
4. **Failure Modes** — What to do when things go wrong
5. **Judgment Boundaries** — Where agent authority ends and human judgment begins
6. **Values** — Principles guiding decisions in ambiguous territory

The methodology represents the **third generation** in a lineage:
- **Prompt Engineering** (Gen 1): Optimizes a single prompt for a single agent
- **Context Engineering** (Gen 2): Designs information flows across a system
- **Intent Engineering** (Gen 3): Structures outcomes, values, constraints, and judgment boundaries across an entire system

Each generation subsumes the previous.

---

## Detailed Description

### The Six Elements

**Goal:** "Verify that the authentication flow works end-to-end before we ship to staging" vs. "Run the test suite."

**Priority:** "Fix this bug. It is blocking the release, so it takes precedence over the refactoring work."

**Constraints:** "Deploy to production. Do not skip tests, do not bypass CI, do not acquire credentials beyond what is available."

**Failure Modes:** "If deployment fails, rollback immediately and notify the Admiral. Do not attempt alternative paths without authorization."

**Judgment Boundaries:** "If accomplishing a subtask requires violating a constraint, stop and ask." This identifies **Human Inflection Points** — decisions requiring taste, ethics, strategy, or stakeholder judgment.

**Values:** "Favor readability over cleverness. Prefer reversible changes. When in doubt, do less and explain."

### System-Wide Application

Intent engineering operates across every component: hook rationales, knowledge entries (decisions with rationale), fleet routing (task intent), monitoring (metric + intent context), cost management, and task assignments.

### Verification Against Intent

The six-element decomposition enables per-element verification: Goal achieved? Priority respected? Constraints held? (binary) Failure modes followed? Judgment boundaries respected? Values reflected?

### Portable Format

```
Goal: [outcome]
Priority: [ranking]
Constraints:
  - [what must not happen]
Failure modes:
  - [if X, do Y]
Judgment boundaries:
  - [stop and ask when...]
Values:
  - [principle]
```

Agent-runtime-agnostic by design — specifies WHAT and HOW TO JUDGE, not HOW TO PROCESS.

---

## Claims

### Independent Claims

**Claim 1.** A method for structuring instructions to autonomous AI agents, comprising:
- (a) decomposing human intent into at least six structured elements: goal, priority, constraints, failure modes, judgment boundaries, and values;
- (b) validating that the instruction explicitly addresses each element or consciously omits specific elements with documented rationale;
- (c) transmitting the structured instruction to an AI agent system;
- wherein the agent receives sufficient context to either make informed decisions or recognize that human judgment is required.

**Claim 2.** A method for verifying AI agent output against structured intent specifications, comprising per-element evaluation where constraint compliance is binary and judgment boundary compliance is verified by checking escalation points triggered human consultation.

**Claim 3.** A portable intent specification format that is agent-runtime-agnostic by design, applied system-wide across hooks, knowledge entries, routing, assignments, and monitoring.

### Dependent Claims

**Claim 4.** Human Inflection Points — identifying decisions requiring human judgment and encoding them as judgment boundaries.

**Claim 5.** Constraints mapping to a tiered enforcement spectrum (hard/firm/soft enforcement).

**Claim 6.** Failure modes connecting to a predefined recovery ladder.

**Claim 7.** System-wide application: hook rationales, knowledge entry context, routing intent, monitoring diagnostics.

**Claim 8.** Automated verification of constraint and judgment boundary compliance; human-assisted verification of goals and values.

**Claim 9.** Generational lineage: Prompt Engineering → Context Engineering → Intent Engineering, each subsumes previous.

---

## Prior Art Differentiation

| System/Approach | What It Lacks |
|---|---|
| Prompt Engineering | No structured decomposition, failure modes, or judgment boundaries; single-prompt scope |
| LangChain Templates | Format only; no required failure modes, boundaries, or values |
| CrewAI Roles | Role-level, not task-level; no failure modes or judgment boundaries |
| Constitutional AI | Training-time, not instruction-time; model-internal, not explicit |
| OpenAI Function Calling | Structures tool I/O, not human-agent intent |

## Specification References

| Component | Repository Path |
|---|---|
| Core specification | `aiStrat/admiral/extensions/intent-engineering.md` |
| Context engineering | `aiStrat/admiral/spec/part2-context.md` |
| Enforcement spectrum | `aiStrat/admiral/spec/part3-enforcement.md` |
| Recovery ladder | `aiStrat/admiral/spec/part7-quality.md` |

---
---

# PART 5: TRADEMARK CHECKLIST — ADMIRAL FRAMEWORK

---

## Mark Information

| Field | Value |
|---|---|
| **Mark** | ADMIRAL FRAMEWORK |
| **Mark Type** | Standard character mark |
| **Owner** | Sean Donn (individual; entity TBD) |
| **Filing Basis** | Intent-to-use — Section 1(b) |

## Classes

**Class 42 — Scientific and Technological Services:** Computer software consultation; SaaS for AI agent fleet orchestration and governance; software design and development in AI agent governance; technical consulting in AI agent fleet operations.

**Class 41 — Education and Entertainment Services:** Training courses, workshops, certification programs in AI agent fleet governance; online educational resources in autonomous AI agent operations.

## Prior Mark Search

- "ADMIRAL" has existing registrations in unrelated classes (clothing, beverages, financial). None in Class 42/41 for AI/software.
- "ADMIRAL FRAMEWORK" — no existing registrations found.
- Recommendation: Commission full clearance search before filing.

## Filing Details

| Item | Detail |
|---|---|
| Filing method | USPTO TEAS Plus |
| Fee per class | $250–$350 |
| Number of classes | 2 |
| Estimated cost | $500–$700 |
| Statement of Use deadline | 6 months from NOA (extendable 3 years) |

## Action Items for Counsel

- [ ] Commission full clearance search in Classes 42, 41
- [ ] Review/refine goods/services descriptions
- [ ] Advise on filing as individual vs. entity
- [ ] File intent-to-use application upon clearance
- [ ] Calendar Statement of Use deadline

---
---

# PART 6: TRADEMARK CHECKLIST — INTENT ENGINEERING

---

## Mark Information

| Field | Value |
|---|---|
| **Mark** | INTENT ENGINEERING |
| **Mark Type** | Standard character mark |
| **Owner** | Sean Donn (individual; entity TBD) |
| **Filing Basis** | Intent-to-use — Section 1(b) |

## Classes

**Class 42:** Software methodology for structuring human-to-AI agent instructions; consultation in AI agent instruction design; technical consulting in structured intent communication for autonomous AI systems.

**Class 41:** Training courses, workshops, seminars, certification programs in intent engineering for AI agent systems; publication of educational materials in structured human-to-AI instruction methodology.

## Prior Mark Search

- "INTENT ENGINEERING" — no existing registrations found.
- The term appears unregistered as a trademark.
- Descriptiveness risk exists but arguments for distinctiveness are available.

## Descriptiveness Risk

**Arguments for distinctiveness:**
1. Novel combination naming a specific methodology
2. Defined six-element methodology, not generic activity
3. Follows naming pattern of "Prompt Engineering" (established discipline)

**Fallback:** Supplemental Register → build secondary meaning → Principal Register after 5 years.

## Filing Details

Same as Admiral Framework: TEAS Plus, 2 classes, $500-$700.

## Action Items for Counsel

- [ ] Commission clearance search in Classes 42, 41
- [ ] Assess descriptiveness risk, prepare arguments
- [ ] Review/refine goods/services descriptions
- [ ] Advise on filing as individual vs. entity
- [ ] File intent-to-use application upon clearance
- [ ] If descriptiveness refusal, advise on Supplemental Register strategy

---
---

# APPENDIX A: INVENTION DATE EVIDENCE

---

## Summary

Priority dates for all 23 patentable innovations documented via git history analysis. Full methodology: `research/extract-invention-dates.sh`.

## Priority Dates for Filed Patents

| # | Innovation | Priority Date | Commit | Evidence |
|---|---|---|---|---|
| **1** | Enforcement Spectrum | 2026-03-13 | `50ffb14` | Merge PR #67 — admiral control plane MVP |
| **2** | Institutional Memory (Brain) | 2026-03-14 | `49bd0db` | Sales pitch reframe around human visibility/control |
| **3** | Intent Engineering | 2026-03-14 | `701258d` | Reorganize admiral/ into spec/extensions/reference |

## Priority Dates for Additional Innovations (Future Filing Candidates)

| # | Innovation | Tier | Priority | Date | Commit |
|---|---|---|---|---|---|
| 3 | Decision Authority Taxonomy | 1 | HIGH | 2026-03-14 | `fa42d6a` |
| 4 | Self-Healing Governance Loops | 1 | MEDIUM | 2026-03-15 | `10beba1` |
| 5 | Standing Orders | 1 | MEDIUM | 2026-03-14 | `0bd066f` |
| 6 | Closed-Loop Data Ecosystem | 1 | MEDIUM | 2026-03-13 | `46281a2` |
| 7 | Progressive Component Scaling | 1 | LOW | 2026-03-14 | `f073fdf` |
| 9 | Agent Identity (Non-Delegable Tokens) | 2 | HIGH | 2026-03-15 | `420925f` |
| 10 | Five-Layer Quarantine Immune System | 2 | HIGH | 2026-03-15 | `420925f` |
| 11 | Context Window Stratification | 2 | MEDIUM-HIGH | 2026-03-15 | `420925f` |
| 12 | A2A Protocol with Agent Cards | 2 | MEDIUM | 2026-03-15 | `ad6e7fd` |
| 13 | Fleet Catalog with Role Architecture | 2 | MEDIUM | 2026-03-14 | `ad291a2` |
| 14 | Governance Agents | 2 | MEDIUM-HIGH | 2026-03-13 | `f5a2be7` |
| 15 | Multi-Agent Handoff Protocol | 2 | MEDIUM | 2026-03-15 | `10beba1` |
| 16 | Orchestrator Degradation | 2 | MEDIUM | 2026-03-15 | `ad6e7fd` |
| 17 | Metered Service Broker | 3 | LOW-MEDIUM | — | — |
| 18 | AI Landscape Monitor | 3 | LOW-MEDIUM | 2026-03-15 | `ad6e7fd` |
| 19 | Spec-First Pipeline | 3 | LOW | 2026-03-15 | `10beba1` |
| 20 | Strategic Adaptation Protocol | 3 | LOW-MEDIUM | — | — |
| 21 | Agentic Engineering Ladder | 3 | MEDIUM | 2026-03-13 | `f5a2be7` |
| 22 | Fleet Pause/Resume Protocol | 3 | LOW | 2026-03-15 | `ad6e7fd` |
| 23 | Execution Trace Forest Builder | 3 | LOW | 2026-03-13 | `f5a2be7` |

---

*End of Counsel Review Package*
*Source files: `research/ip/` — Individual drafts available for separate review*
*Complete specification: `aiStrat/admiral/spec/` — 114 files across 22 groups*
*Repository: `seandonn-boston/helm` (GitHub, private)*
