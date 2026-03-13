<!-- Admiral Framework v0.3.0-alpha -->
# Admiral Framework — File Manifest

**97 files across 20 groups | Last modified: 2026-03-13**

This is the semantic catalog of every file in the Admiral Framework. Each entry describes what the file contains, verified against the source. Update this manifest when files are added, removed, renamed, or when their content changes materially.

---

## Admiral Doctrine (15 files)

```
index.md - admiral/doctrine - 2026-03-10:
Master index and entry point. Subtitled "A Workforce Toolkit for Autonomous AI Agent
Fleets." Defines four adoption levels (Disciplined Solo → Core Fleet → Governed Fleet
→ Full Framework) with time-to-value and graduation criteria. Links all 11 parts.

Minimum Viable Reading Path (~800 lines total):
  1. index.md — Glossary + Adoption Levels (shared vocabulary and roadmap)
  2. part1-strategy.md — Full file (Mission, Boundaries, Success Criteria)
  3. part3-enforcement.md — Full file (enforcement spectrum: hooks over instructions)
  4. part11-protocols.md — Section 36 only (Standing Orders: 15 non-negotiable rules)
  5. appendices.md — Appendix A only (Pre-Flight Checklist: go/no-go gate)

Also includes: operating model ("You are the Admiral" with intent engineering as
primary communication skill), glossary (~100 terms including intent engineering and
human inflection point), competitive comparison table, five unique contributions,
three-audience reading guide (humans, LLM agents, machines), full table of contents
(41 sections + 2 sub-sections + 7 appendices), and relationship map to
fleet/brain/monitor directories.
aiStrat/admiral/index.md
```

```
part1-strategy.md - admiral/doctrine - 2026-03-10:
Three sections forming a closed triangle: Mission (01) — project identity, success
state, stakeholders, phase, and Spec-First Pipeline entry point; Boundaries (02) —
non-goals, hard constraints, resource budgets, LLM-Last boundary with intent rationale
for each category; Success Criteria (03) — machine-verifiable definition of done with
failure scenario and judgment boundary criteria.
aiStrat/admiral/part1-strategy.md
```

```
part2-context.md - admiral/doctrine - 2026-03-10:
Four sections: Context Engineering (04) — five dimensions of context with intent
rationale per dimension, lineage table extended to intent engineering, cross-reference
to intent-engineering.md; Ground Truth (05) — ontology, naming, tech stack; Context
Window Strategy (06) — profiles, loading/sacrifice order with intent foundation
rationale, progressive disclosure, context stuffing defense via SO 11;
Configuration File Strategy (07) — AGENTS.md as canonical source, 150-line rule,
cross-tool portability, skills, path rules, Standing Orders loading precedence note.
aiStrat/admiral/part2-context.md
```

```
part3-enforcement.md - admiral/doctrine - 2026-03-10:
Three sections: Deterministic Enforcement (08) — the enforcement spectrum (hook /
instruction / guidance), hook lifecycle events, hook execution model, self-healing
loops with implementation parameters table (max retries, cycle detection, error
signatures), two-layer retry mechanism clarification (hook vs recovery ladder),
co-requirement note linking to Standing Orders (Section 36); Decision Authority (09) —
four tiers (Enforced, Autonomous, Propose, Escalate); Configuration Security (10) —
threat model, MCP server auditing, CODEOWNERS.
aiStrat/admiral/part3-enforcement.md
```

```
part4-fleet.md - admiral/doctrine - 2026-03-10:
Four sections: Fleet Composition (11) — agent roster, Core Fleet, "Does NOT Do"
boundaries, 5-12 agents, routing intent rationale; Tool & Capability Registry (12) —
per-agent tool lists including negative tool list with hallucination prevention
rationale; Model Selection (13) — tier assignment with failure mode reasoning for
mismatches; Protocol Integration (14) — MCP servers, A2A configuration.
aiStrat/admiral/part4-fleet.md
```

```
part5-brain.md - admiral/doctrine - 2026-03-08:
Three sections: Brain Architecture (15) — three maturity levels (file → SQLite →
Postgres+pgvector), "Start Simple" principle; Knowledge Protocol (16) — MCP tools,
zero-trust access control, identity tokens; Intelligence Lifecycle (17) — capture
triggers, review cadence, cross-project namespace.
aiStrat/admiral/part5-brain.md
```

```
part6-execution.md - admiral/doctrine - 2026-03-10:
Three sections: Work Decomposition (18) — 40% token budget rule with failure mode
rationale, "Quality > Completeness" value, Spec-First Pipeline, chunk entry/exit
states, completion bias defense via SO 8; Parallel Execution Strategy (19) —
coordination patterns with contract-first rationale, divergence detection; Swarm
Patterns (20) — advanced multi-agent topologies beyond hierarchical fleet.
aiStrat/admiral/part6-execution.md
```

```
part7-quality.md - admiral/doctrine - 2026-03-10:
Three sections: Quality Assurance (21) — verification levels with "What It Catches"
rationale, self-healing loops; Failure Recovery (22) — recovery ladder with intent
framing (preserve autonomy, escalate only when exhausted, no skipping rungs), forward
reference to Section 37 escalation report format; Known Agent Failure Modes (23) —
comprehensive catalog of systematic fleet failure patterns with framework-level failure
modes and diagnostic decision tree.
aiStrat/admiral/part7-quality.md
```

```
part8-operations.md - admiral/doctrine - 2026-03-10:
Seven sections: Institutional Memory (24) — five session persistence patterns with
"Continuity > Velocity" value and false checkpointing judgment boundary; Adaptation
Protocol (25) — three change tiers with "Consistency > Velocity" cascade constraint;
Cost Management (26) — with cost transparency value; Fleet Health Metrics (27) — with
threshold rationale (why 75% first-pass quality); Fleet Scaling & Lifecycle (28);
Orchestrator Health Protocol (28b) — Standing Orders loss as highest-severity context
degradation signal, context amnesia detection expanded; Inter-Fleet Governance (29).
aiStrat/admiral/part8-operations.md
```

```
part9-platform.md - admiral/doctrine - 2026-03-10:
Four sections: Fleet Observability (30) — four pillars (logs, metrics, traces, agent
telemetry) with observability constraint and silent-retry failure mode; CI/CD &
Event-Driven Operations (31) — event-driven agent definitions, context bootstrapping
with headless authority narrowing as hard constraint; Fleet Evaluation & Benchmarking
(32) — A/B testing, baseline metrics, evaluation cadence; Multi-Modal & Extended
Capabilities (32b) — computer use, extended thinking, structured outputs, vision.
aiStrat/admiral/part9-platform.md
```

```
part10-admiral.md - admiral/doctrine - 2026-03-10:
Three sections: Admiral Self-Calibration (33) — bottleneck detection, trust calibration
per category, intent fluency as explicit skill, growth stages with "Why This Stage
Exists" rationale; Human-Expert Routing (34) — expert roster, routing triggers,
consultation template; Multi-Operator Governance (35) — three operator tiers
(Owner/Operator/Observer), conflict resolution, operator handoff.
aiStrat/admiral/part10-admiral.md
```

```
part11-protocols.md - admiral/doctrine - 2026-03-10:
Six protocol areas: Standing Orders (36) — 15 non-negotiable rules with Level 1
sequencing note (Standing Orders are Level 1 requirements despite Part 11 position);
Escalation Protocol (37) with forward reference from SO 6; Handoff Protocol (38);
Human Referral Protocol (39); Paid Resource Authorization Protocol (40); Data
Sensitivity Protocol (41). Concrete formats and decision ladders for each. Includes
implementation lesson from Admiral-builds-Admiral about Standing Orders deferral.
aiStrat/admiral/part11-protocols.md
```

```
intent-engineering.md - admiral/doctrine - 2026-03-10:
The shared dialect between Admirals and Brains. Defines intent engineering as the
evolution beyond prompt engineering (single call-and-response) and context engineering
(information flows): structuring instructions around outcomes, values, constraints,
failure modes, and judgment boundaries. Six elements of intent: Goal, Priority,
Constraints, Failure Modes, Judgment Boundaries, Values. Maps intent engineering to
every framework component (hooks, Brain, fleet routing, monitoring, token brokerage,
attack corpus). Defines human inflection points — moments requiring human judgment,
taste, ethics, or strategic context that agents must not work around. Includes full
worked example of an intent-engineered task assignment.
aiStrat/admiral/intent-engineering.md
```

```
appendices.md - admiral/doctrine - 2026-03-10:
Seven appendices: Pre-Flight Checklist (A) — per-section verification with intent
completeness check; Quick-Start Sequence (B) — four adoption levels with intent
framing (foundation → operational → governance → persistent), Level 1 time estimate
clarification (30 min config / 1-2 days build), config-first sequencing insight;
Worked Example: SaaS Task Manager (C) — mission through fleet roster with three
governance failure scenarios; Case Studies (D) — ungoverned sprint, over-engineered
fleet, security-first fleet, Admiral-builds-Admiral (Case Study 4: Phase 1 lessons);
Platform Integration Patterns (E) — Claude Code, Agent SDK, LangGraph/CrewAI/AutoGen,
Implementation Pitfalls section (build-order, Python-specific, general agent framework
pitfalls from reference implementation); Framework Versioning (F); Implementation
Status Map (G) — three implementation categories mapped to every component.
aiStrat/admiral/appendices.md
```

```
reference-constants.md - admiral/doctrine - 2026-03-13:
Implementer's reference card for the Admiral Framework. Tool token estimation
table (11 tools), context budget validation rule (must sum to 100%), hook
dependency cycle detection algorithm (DFS three-color), hook execution order
algorithm (Kahn's with registration-order tie-breaking), error signature
formulas (self-healing vs. loop detector — two distinct formulas), consecutive
error early-exit behavior, exit code conventions (0/1/2), session state
persistence format (.admiral/session_state.json), Standing Orders injection
mechanism, critical context section set (Identity/Authority/Constraints), hook
adapter pattern (three-handler architecture), minimum dependency set by adoption
level.
aiStrat/admiral/reference-constants.md
```

---

## Fleet Infrastructure (8 files)

```
README.md - fleet/infrastructure - 2026-03-10:
Fleet catalog index. 71 core agents (67 specialists + 4 command) plus 29 extended in
extras/. Organized into generalists and 12 specialist categories. Core Fleet minimum
of 11 agents. Quick-reference table. Governance agents qualified as "Always (Level 3+)"
to match adoption table. Core tenet: "Admiral is the engineering manual. Fleet is the
parts catalog."
aiStrat/fleet/README.md
```

```
prompt-anatomy.md - fleet/infrastructure - 2026-03-10:
Five-section system prompt assembly pattern: Identity → Authority → Constraints →
Knowledge → Task. Expanded ordering rationale with per-section intent reasoning and
cross-reference to intent-engineering.md. Assembly template and anti-patterns (skipping
identity, constraints after task with drift explanation, overloading knowledge, vague
tasks).
aiStrat/fleet/prompt-anatomy.md
```

```
routing-rules.md - fleet/infrastructure - 2026-03-10:
Task routing decision tree for the Orchestrator. Three strategies in priority order:
route by task type (~67 task types mapped to primary/fallback agents), route by file
ownership (project-specific), escalate ambiguous. Routing constraints with failure mode
reasoning (no self-review = conflict of interest prevention), judgment boundary for
ambiguous routing (decompose vs. escalate). Multi-agent pipeline patterns.
aiStrat/fleet/routing-rules.md
```

```
interface-contracts.md - fleet/infrastructure - 2026-03-10:
Sender-delivers/receiver-returns contracts for all major agent-to-agent handoff
patterns: engineering, quality, security, cross-category, governance, scale, lifecycle,
meta/autonomous, adversarial, and domain/data. Contract violation protocol with intent
rationale (why acceptance_criteria prevents scope drift, repeated violations signal
decomposition errors). 479 lines.
aiStrat/fleet/interface-contracts.md
```

```
model-tiers.md - fleet/infrastructure - 2026-03-10:
Four model tiers: Flagship (Tier 1, deepest reasoning), Workhorse (Tier 2, solid code
gen), Utility (Tier 3, fast/cheap), Economy (Tier 4, batch). Every agent assigned with
rationale. Promotion/demotion signals with intent rationale. Silent quality erosion
failure mode for demotion without measurement. Monitor external signal. Multi-model
patterns (flagship decomposition + workhorse execution, economy draft + flagship review,
cross-model adversarial review). API resilience section with provider abstraction layer,
per-tier degradation defaults, per-agent overrides, quality gates during degradation, and
recovery protocol.
aiStrat/fleet/model-tiers.md
```

```
context-injection.md - fleet/infrastructure - 2026-03-10:
Three-layer context stack: Fleet Context (stable), Project Context (per-project), Task
Context (per-task). Per-category checklists (all agents, engineering, quality, security,
governance, domain/data). Three injection patterns: configuration file,
skills/progressive disclosure, ground truth registry. Context budget guidelines with
priority allocation percentages. Enhanced sacrifice order rationale and context
sufficiency judgment boundary.
aiStrat/fleet/context-injection.md
```

```
generalists.md - fleet/infrastructure - 2026-03-08:
Defines the 4 generalist agents: Orchestrator, Triage Agent, Context Curator, Mediator.
Defines what makes a generalist: system-level view, routing authority, no domain
execution, escalation receiver. ASCII flow diagram showing generalist interactions.
aiStrat/fleet/generalists.md
```

```
specialists.md - fleet/infrastructure - 2026-03-08:
Defines the 67 specialist agents across 12 categories. Three defining traits: domain
depth with complementary awareness, collaborative instinct, and human professional
referral (with detailed analogies from plumbing, chemistry, electrical, and software).
Five operating principles.
aiStrat/fleet/specialists.md
```

---

## Agent Definitions — Command (4 files)

```
orchestrator.md - fleet/agents/command - 2026-03-08:
Full standalone definition for the Orchestrator. Tier 1 Flagship, continuous schedule.
Context profile, interface contracts (Admiral, Triage, Specialist, QA), decision
authority table (9 decisions across autonomous/propose/escalate), guardrails.
aiStrat/fleet/agents/command/orchestrator.md
```

```
triage-agent.md - fleet/agents/command - 2026-03-08:
Full standalone definition for the Triage Agent. Tier 3 Utility, continuous schedule.
Classifies incoming work by type/priority/complexity and routes to Orchestrator only.
Confidence-based decision authority (80%+ autonomous, 60-80% propose, <60% escalate).
aiStrat/fleet/agents/command/triage-agent.md
```

```
context-curator.md - fleet/agents/command - 2026-03-08:
Full standalone definition for the Context Curator. Tier 2 Workhorse, triggered.
Manages context payloads: compression, load order, sacrifice order. Escalates when
sacrificing Authority/Constraints sections or loading context for security-sensitive
agents.
aiStrat/fleet/agents/command/context-curator.md
```

```
mediator.md - fleet/agents/command - 2026-03-08:
Full standalone definition for the Mediator. Tier 1 Flagship, triggered on conflicts.
Resolves conflicting outputs between agents. Autonomous for clear Mission alignment,
escalates security vs. functionality trade-offs and recurring conflicts.
aiStrat/fleet/agents/command/mediator.md
```

---

## Agent Definitions — Command Templates (4 files)

```
orchestrator.md-example - fleet/agents/command/templates - 2026-03-07:
Project-customization template for the Orchestrator. Same structure as orchestrator.md
with curly-brace placeholders for project-specific values. Includes expanded guardrails
with RAG grounding requirements.
aiStrat/fleet/agents/command/orchestrator.md-example
```

```
triage-agent.md-example - fleet/agents/command/templates - 2026-03-07:
Project-customization template for the Triage Agent. Placeholders for project-specific
taxonomies and classification concerns.
aiStrat/fleet/agents/command/triage-agent.md-example
```

```
context-curator.md-example - fleet/agents/command/templates - 2026-03-07:
Project-customization template for the Context Curator. Placeholders for project-
specific artifact registries and context sources.
aiStrat/fleet/agents/command/context-curator.md-example
```

```
mediator.md-example - fleet/agents/command/templates - 2026-03-07:
Project-customization template for the Mediator. Placeholders for project-specific
mediation concerns and conflict resolution priorities.
aiStrat/fleet/agents/command/mediator.md-example
```

---

## Agent Definitions — Category Templates (2 files)

```
agent-example.md - fleet/agents/templates - 2026-03-08:
Template for creating a single standalone agent definition. Full section structure:
Context Profile, Interface Contracts, Decision Authority, Context Discovery, Guardrails.
Placeholder guidance for each section.
aiStrat/fleet/agents/agent-example.md
```

```
agents-example.md - fleet/agents/templates - 2026-03-08:
Template for creating a multi-agent category file. Lighter structure: identity, scope,
does-not-do, output routing, context discovery, guardrails, prompt anchor. Optional
summary table for 5+ agents.
aiStrat/fleet/agents/agents-example.md
```

---

## Agent Definitions — Engineering (4 files)

```
agents.md - fleet/agents/engineering/frontend - 2026-03-08:
5 Frontend agents: Frontend Implementer, Interaction Designer, Accessibility Auditor,
Responsive Layout Agent, State Management Agent. All Tier 2. Covers UI components,
a11y, responsive breakpoints, and client-side state.
aiStrat/fleet/agents/engineering/frontend/agents.md
```

```
agents.md - fleet/agents/engineering/backend - 2026-03-08:
5 Backend agents: Backend Implementer, API Designer, Database Agent, Queue & Messaging
Agent, Cache Strategist. All Tier 2. Database Agent has guardrails for DDL review and
destructive migration prevention.
aiStrat/fleet/agents/engineering/backend/agents.md
```

```
agents.md - fleet/agents/engineering/infrastructure - 2026-03-08:
4 Infrastructure agents: DevOps Agent, Infrastructure Agent, Containerization Agent,
Observability Agent. All Tier 2. Infrastructure Agent has guardrails requiring human
approval for production changes.
aiStrat/fleet/agents/engineering/infrastructure/agents.md
```

```
agents.md - fleet/agents/engineering/cross-cutting - 2026-03-08:
5 Cross-Cutting agents: Architect (Tier 1), Integration Agent, Migration Agent,
Refactoring Agent, Dependency Manager. Architect is the only Tier 1 in engineering,
making structural decisions that constrain all downstream implementation.
aiStrat/fleet/agents/engineering/cross-cutting/agents.md
```

---

## Agent Definitions — Specialist Categories (8 files)

```
quality.md - fleet/agents/specialists - 2026-03-08:
6 Quality & Testing agents: QA Agent, Unit Test Writer, E2E Test Writer, Performance
Tester, Chaos Agent, Regression Guardian. All Tier 2. Chaos Agent requires Admiral
approval for production runs.
aiStrat/fleet/agents/quality.md
```

```
security.md - fleet/agents/specialists - 2026-03-08:
4 Security & Compliance agents: Security Auditor, Penetration Tester, Compliance Agent,
Privacy Agent. All Tier 2. Privacy Agent handles GDPR/CCPA data classification, consent
flows, and data residency.
aiStrat/fleet/agents/security.md
```

```
governance.md - fleet/agents/specialists - 2026-03-08:
7 Governance agents: Token Budgeter, Drift Monitor, Hallucination Auditor, Bias
Sentinel, Loop Breaker, Context Health Monitor, Contradiction Detector. Includes
Authoritative Ownership Table mapping ~20 failure modes to their authoritative owner,
conflict resolution protocol, and alert deduplication. Marked "always deploy." Largest
agent file (547 lines).
aiStrat/fleet/agents/governance.md
```

```
design.md - fleet/agents/specialists - 2026-03-08:
5 Documentation & Design agents: UX Researcher, Design Systems Agent, Copywriter,
Technical Writer, Diagram Agent. All Tier 2. Covers non-code creative and documentation
concerns.
aiStrat/fleet/agents/design.md
```

```
lifecycle.md - fleet/agents/specialists - 2026-03-08:
6 Release & Developer Platform agents: Release Orchestrator, Incident Response Agent
(Tier 1), Feature Flag Strategist, SDK & Dev Experience Agent, Monorepo Coordinator,
Contract Test Writer. All Tier 2 except Incident Response (Tier 1 due to production
pressure).
aiStrat/fleet/agents/lifecycle.md
```

```
meta.md - fleet/agents/specialists - 2026-03-08:
4 Meta & Autonomous agents: Pattern Enforcer (Tier 3), Dependency Sentinel (Tier 3),
SEO Crawler (Tier 3), Role Crystallizer (Tier 1). Operate on the fleet/codebase itself,
not product features. Role Crystallizer detects roster gaps and proposes new agents
backed by evidence.
aiStrat/fleet/agents/meta.md
```

```
adversarial.md - fleet/agents/specialists - 2026-03-08:
4 Simulation & Adversarial agents: Simulated User (Tier 2), Devil's Advocate (Tier 1),
Red Team Agent (Tier 1), Persona Agent (Tier 2). The fleet's challenge layer — stress-
tests assumptions, surfaces weaknesses, provides adversarial review.
aiStrat/fleet/agents/adversarial.md
```

```
scale.md - fleet/agents/specialists - 2026-03-08:
12 Inhuman-Scale Analysis agents across 6 sub-categories: Failure & Resilience (3),
Temporal & Decay (2), Combinatorial (2), Signal Propagation (2), Schema & Semantic (2),
Capacity (1). All Tier 1 except Capacity Horizon Scanner (Tier 2). Cross-cutting
standards: confidence calibration, common output JSON schema, audit logging, read-only
access, secrets handling.
aiStrat/fleet/agents/scale.md
```

---

## Agent Definitions — Extras / Reserve (4 files)

```
README.md - fleet/agents/extras - 2026-03-08:
Index for reserve agent definitions. Lists 3 extras files with agent counts and 5-step
activation checklist (copy, update README counts, add routing rules, assign tier,
register in Orchestrator).
aiStrat/fleet/agents/extras/README.md
```

```
domain.md - fleet/agents/extras - 2026-03-08:
7 Domain Specialization agents: Internationalization, Authentication & Identity
Specialist, Search & Relevance, Payment & Billing, Real-time Systems, Media Processing,
Notification Orchestrator. All Tier 2. Payment & Billing has PCI compliance guardrails.
Held in reserve for domain-specific projects.
aiStrat/fleet/agents/extras/domain.md
```

```
data.md - fleet/agents/extras - 2026-03-08:
5 Data & Analytics agents: Data Engineer, Analytics Implementer, ML Engineer, Data
Validator (Tier 3), Visualization Agent. Held in reserve for projects with data
pipeline, ML, or analytics requirements.
aiStrat/fleet/agents/extras/data.md
```

```
scale-extended.md - fleet/agents/extras - 2026-03-08:
17 supplementary scale agents across 7+ sub-categories: Planetary (3),
Temporal/Archaeology (2), Signal/Boundary (1), Emergent Behavior (2),
Resource/Economic (2), Schema/Semantic (2), Threat/Resilience (1), Cognitive (1),
Regulatory (1), Transformation/Pipeline (2). 8 of 17 marked [Exploratory].
aiStrat/fleet/agents/extras/scale-extended.md
```

---

## Brain / Knowledge System (6 files)

```
README.md - brain/architecture - 2026-03-10:
Architecture overview for the Brain — the fleet's durable semantic memory. Postgres +
pgvector. MCP server with 8 tools (brain_record, brain_query, brain_retrieve,
brain_strengthen, brain_supersede, brain_status, brain_audit, brain_purge) with full
parameter/return/error contracts. Ranking signal rationale (four of eight signals have explicit failure-mode
rationale: similarity, recency, usefulness, provenance weight). Zero-trust access control, sensitivity classification, pluggable embedding
interface. Enhanced data sensitivity rationale.
aiStrat/brain/README.md
```

```
level1-spec.md - brain/maturity-levels - 2026-03-10:
Level 1 Brain: file-based JSON knowledge store. Filesystem + git only, no
infrastructure. Entry format (7 required fields), directory structure (.brain/project/),
naming convention (timestamp-category-slug.json), shell wrapper, grep-based retrieval.
Silent knowledge loss failure mode for no semantic search. Graduate to Level 2 when
missed retrievals exceed 30% over 2 weeks. Includes compatibility mapping to Level 3
Postgres columns.
aiStrat/brain/level1-spec.md
```

```
level2-spec.md - brain/maturity-levels - 2026-03-10:
Level 2 Brain: SQLite + embeddings. Vector similarity search without infrastructure.
Full SQLite schema (entries, entry_links, audit_log), embedding generation examples
(OpenAI text-embedding-3-small or local MiniLM), cosine similarity retrieval with 0.7
threshold rationale and judgment boundary, Level 1 migration script. Graduate on
concurrent access contention, cross-project needs, >500ms retrieval latency, multi-hop
retrieval needs, or access control requirements.
aiStrat/brain/level2-spec.md
```

```
001_initial.sql - brain/schema - 2026-03-08:
Production Postgres + pgvector schema. Three tables: entries (UUID PK, project,
category, title, content, vector(1536), JSONB metadata, provenance, sensitivity,
strengthening signals, purge support), entry_links (typed: supports/contradicts/
supersedes/elaborates/caused_by), audit_log (append-only with rules blocking
UPDATE/DELETE). HNSW index, GIN index, sensitive data guard trigger (rejects emails,
SSNs, AWS keys, connection strings, PII metadata keys), updated_at trigger.
aiStrat/brain/schema/001_initial.sql
```

```
test_schema.sql - brain/schema - 2026-03-08:
Test-adapted schema without pgvector (no embedding column or HNSW index). Everything
else identical to 001_initial.sql including sensitive data guard trigger. For
environments without the pgvector extension installed.
aiStrat/brain/schema/test_schema.sql
```

```
test_sensitive_data_guard.sql - brain/schema - 2026-03-08:
Comprehensive test suite for the Brain schema. ~60 tests across 12 parts: normal use
cases (17 should-succeed), sensitive data rejection (17 should-fail for emails/SSNs/AWS
keys/connection strings/metadata keys), edge cases (false positives, special
characters), update path, schema constraints (invalid category/sensitivity/
authority_tier, nulls), entry links, audit log immutability, supersession chains,
cascade behavior, updated_at trigger, defaults, and purge support. Uses helper
functions for structured pass/fail tracking. (919 lines.)
aiStrat/brain/schema/test_sensitive_data_guard.sql
```

---

## Monitor / Ecosystem Intelligence (1 file)

```
README.md - monitor/architecture - 2026-03-10:
Architecture spec for the Continuous AI Landscape Monitor. Automated ecosystem
surveillance with a five-layer immune system (quarantine) with layer ordering rationale
(load-bearing defenses must be LLM-free): Structural (schema enforcement), Injection
(70+ regex patterns with encoding normalization), Deterministic Semantic (TF-IDF +
Bayesian classifier, LLM-airgapped), LLM Advisory (can only REJECT, never approve),
Antibodies (converts attacks into Brain FAILURE entries). "Fail-open for discovery,
fail-closed for ingestion" principle. Intelligence sources: 11+ model providers, 20+
tracked repos, RSS feeds. Daily/weekly/manual scan cadence.
aiStrat/monitor/README.md
```

---

## Handoff Schema (1 file)

```
handoff/v1.schema.json - handoff/schema - 2026-03-09:
Canonical JSON Schema for the handoff protocol (Section 38). Defines required fields
(from, to, via, task, deliverable, acceptance_criteria) and optional fields (context_files,
constraints, assumptions, open_questions, metadata for domain extensions, session_handoff).
Dual-format: JSON is canonical for validation; text rendering for human/agent consumption.
Interface contracts extend the base schema via the metadata field using $ref.
aiStrat/handoff/v1.schema.json
```

---

## Attack Corpus (19 files)

```
attack-corpus/README.md - attack-corpus/specification - 2026-03-10:
Attack corpus specification and seed scenarios. Entry schema for corpus entries with fields:
id, category, source, trigger, expected/actual behavior, severity, defenses, testing
metadata. 18 seed scenarios covering authority spoofing (4), credential fabrication (3),
behavior manipulation (3), prompt injection (3), failure scenarios (3), and chaos scenarios
(2) — ordered by descending leverage with rationale. Three-source feedback pipeline (Red
Team Agent, Incident Response Agent, Chaos Agent). Storage strategy for Level 1 (file-based)
and Level 2+ (Brain `failure` category with attack corpus metadata tag).
aiStrat/attack-corpus/README.md
```

```
ATK-0001.yaml through ATK-0018.yaml - attack-corpus/scenarios - 2026-03-10:
18 individual YAML attack scenario files. Each contains: id, category, source, title,
trigger, expected_behavior, actual_behavior, severity, defenses, testing metadata
(last_tested, times_passed, times_failed), created_by, created_at, superseded_by.

  Authority Spoofing (4, Critical/High):
    ATK-0001: Admiral approval claim | ATK-0002: Standing Order override attempt
    ATK-0003: Authority tier self-escalation | ATK-0004: Fabricated governance consensus

  Credential Fabrication (3, High/Medium):
    ATK-0005: Invented certification claim | ATK-0006: False provenance
    ATK-0007: Fabricated tool output

  Behavior Manipulation (3, Critical/High):
    ATK-0008: Instruction override via injected content
    ATK-0009: Role reassignment attempt
    ATK-0010: Constraint relaxation via helpfulness

  Prompt Injection (3, Critical/High):
    ATK-0011: Indirect prompt injection via external content
    ATK-0012: Payload smuggling via encoding
    ATK-0013: Context window poisoning via large payload

  Failure Scenarios (3, Medium/High):
    ATK-0014: Network partition during Brain write
    ATK-0015: Model API timeout mid-task
    ATK-0016: Context window exhaustion during critical operation

  Chaos Scenarios (2, Medium):
    ATK-0017: Clock skew between agents
    ATK-0018: Resource exhaustion during parallel execution

aiStrat/attack-corpus/ATK-0001.yaml through ATK-0018.yaml
```

---

## Hook Ecosystem (2 files)

```
hooks/README.md - hooks/specification - 2026-03-10:
Hook ecosystem specification. Manifest-first design with rationale (deterministic
enforcement fires every time regardless of context pressure): every hook ships with
hook.manifest.json. Directory convention (hooks/[hook-name]/), runtime lifecycle
(discovery, dependency resolution with manifest-first rationale, execution order),
contract versioning, future extension path to schema registry (v0.3.0+). Reference
manifests for 8 core hooks.
aiStrat/hooks/README.md
```

```
hooks/manifest.schema.json - hooks/schema - 2026-03-09:
JSON Schema for hook manifest files. Validates name (lowercase alphanumeric), version
(semver), events (PreToolUse, PostToolUse, PreCommit, PostCommit, SessionStart,
TaskCompleted, PrePush, Periodic), timeout_ms (100-300000), requires (dependency list),
input_contract (version string), description, and async flag. Used by runtime for hook
discovery and dependency resolution at SessionStart.
aiStrat/hooks/manifest.schema.json
```

---

## Hook Manifests (8 files)

```
hook.manifest.json - hooks/context_baseline - 2026-03-10:
Manifest for context_baseline hook. SessionStart event. Measures initial context window
utilization and records baseline metrics for comparison. No dependencies. 10s timeout.
aiStrat/hooks/context_baseline/hook.manifest.json
```

```
hook.manifest.json - hooks/context_health_check - 2026-03-10:
Manifest for context_health_check hook. PostToolUse event. Monitors context health by
checking utilization thresholds and critical context presence. Requires context_baseline.
10s timeout.
aiStrat/hooks/context_health_check/hook.manifest.json
```

```
hook.manifest.json - hooks/governance_heartbeat_monitor - 2026-03-10:
Manifest for governance_heartbeat_monitor hook. Periodic event (async). Tracks governance
agent heartbeats and alerts Admiral on missed beats or low confidence. No dependencies.
10s timeout.
aiStrat/hooks/governance_heartbeat_monitor/hook.manifest.json
```

```
hook.manifest.json - hooks/identity_validation - 2026-03-10:
Manifest for identity_validation hook. SessionStart event. Validates agent identity token
and auth configuration artifact at session start. Independent of Auth & Identity
Specialist availability. No dependencies. 10s timeout.
aiStrat/hooks/identity_validation/hook.manifest.json
```

```
hook.manifest.json - hooks/loop_detector - 2026-03-10:
Manifest for loop_detector hook. PostToolUse event. Detects retry loops by tracking error
signature recurrence across invocations. No dependencies. 5s timeout.
aiStrat/hooks/loop_detector/hook.manifest.json
```

```
hook.manifest.json - hooks/tier_validation - 2026-03-10:
Manifest for tier_validation hook. SessionStart event. Validates instantiated model
against agent tier assignment and consults degradation policy on failure. No dependencies.
10s timeout.
aiStrat/hooks/tier_validation/hook.manifest.json
```

```
hook.manifest.json - hooks/token_budget_gate - 2026-03-10:
Manifest for token_budget_gate hook. PreToolUse event. Blocks tool invocations that would
exceed the session token budget. Requires token_budget_tracker. 5s timeout.
aiStrat/hooks/token_budget_gate/hook.manifest.json
```

```
hook.manifest.json - hooks/token_budget_tracker - 2026-03-10:
Manifest for token_budget_tracker hook. PostToolUse event. Tracks cumulative token
consumption per session and emits warnings at 80% and 90% utilization. No dependencies.
5s timeout.
aiStrat/hooks/token_budget_tracker/hook.manifest.json
```

---

## Configuration (3 files)

```
AGENTS.md - project/config - 2026-03-09:
Canonical, model-agnostic instruction file for any AI coding agent. Contains project
overview, three-pillar repository structure, key entry points table (12 use-case → file
mappings), versioning rules, working conventions, and 7 design principles (hooks over
instructions, zero-trust, defense in depth, context is currency, progressive adoption,
specification as product, tool-agnostic by default). This is the single source of truth
for project instructions — tool-specific files (CLAUDE.md, etc.) point here.
aiStrat/AGENTS.md
```

```
CLAUDE.md - project/config - 2026-03-09:
Claude Code entry point. Slim pointer to AGENTS.md plus Claude Code-specific
configuration: .claude/ directory conventions, skills, path-scoped rules, agent
definitions, hooks, and subagent usage. Exists because Claude Code does not natively
read AGENTS.md (as of March 2026). ~20 lines.
aiStrat/CLAUDE.md
```

```
settings.local.json - project/config - 2026-03-05:
Claude Code local settings. Whitelists bash commands: wc, grep, xargs cat, find.
aiStrat/.claude/settings.local.json
```

---

## Sales & Positioning (1 file)

```
sales-pitch-30min-guide.md - sales/guide - 2026-03-10:
30-minute conversation guide for presenting the Admiral Framework. Structured as:
30-second pitch → 8-10 min market context → 12-15 min product pitch → 5-7 min
status/roadmap → Q&A cheat sheet. References v0.3.0-alpha status, 71 agent definitions,
15,000+ lines of spec. Includes objection handling for "just a spec" and "why not
LangGraph/CrewAI" concerns.
aiStrat/sales-pitch-30min-guide.md
```

---

## Research (5 files) — *Pending relocation to repo root*

> These files are strategy and market research documents, not specification
> artifacts. They will be moved from `aiStrat/research/` to the repository root
> (`research/`) and excluded from the spec versioning policy.

```
AI-MODELS-TIMELINE.md - research/timeline - 2026-03-10:
Comprehensive AI timeline from 2010 to March 2026. ~1,469 lines covering major model
releases, company milestones, benchmark results, and industry events organized
chronologically. Includes GPT series, Claude series, Gemini, Llama, and 50+ other
model families.
aiStrat/research/AI-MODELS-TIMELINE.md
```

```
hinton-et-al-ai-pioneers.md - research/people - 2026-03-10:
Chronological profiles of 20+ AI pioneer figures: Hopfield, Hinton, LeCun, Bengio,
Fei-Fei Li, Goodfellow, Sutskever, Karpathy, Amodei siblings, Hassabis, and others.
Covers career arcs, key contributions, institutional affiliations, and 2024-2025
Nobel/QE Prize recognition. ~430 lines.
aiStrat/research/hinton-et-al-ai-pioneers.md
```

```
research-cutting-edge-usecases-mar-2026.md - research/usecases - 2026-03-10:
Cutting-edge projects utilizing AI agent fleets as of March 2026. Categories:
autonomous vehicles (Waymo, Tesla, Figure AI), drug discovery (Recursion, Insilico,
NVIDIA BioNeMo), and other frontier applications. ~473 lines.
aiStrat/research/research-cutting-edge-usecases-mar-2026.md
```

```
research-llm-agents-mar-2026.md - research/agents - 2026-03-10:
State of the art in LLM agents and AI coding tools as of March 2026. Covers GPT-5.4,
Claude 4.6, Cursor 2.5, MCP ecosystem, A2A protocol, Codex CLI, and 30+ other agent
projects. Evaluated on ingenuity, effectiveness, integrity, security, creativity.
~547 lines.
aiStrat/research/research-llm-agents-mar-2026.md
```

```
research-top-agent-toolkits-mar-2026.md - research/toolkits - 2026-03-10:
Top AI agent tool suites, workflows, configurations, and production setups as of
March 2026. Covers everything-claude-code, awesome-claude-code-toolkit, Trail of Bits
security configs, Ruflo enterprise orchestration, and 20+ other toolkit projects.
~532 lines.
aiStrat/research/research-top-agent-toolkits-mar-2026.md
```

---

## Thesis (3 files) — *Pending relocation to repo root*

> These files are investment and strategy thesis documents, not specification
> artifacts. They will be moved from `aiStrat/thesis/` to the repository root
> (`thesis/`) and excluded from the spec versioning policy.

```
ai-fundamental-truths.md - thesis/strategy - 2026-03-08:
Foundational truths about AI that inform Admiral's design philosophy. Covers: why
agents are neither employees nor code, why governance must be designed from scratch,
why deterministic enforcement outperforms advisory constraints. ~224 lines.
aiStrat/thesis/ai-fundamental-truths.md
```

```
ai-internet-acceleration.md - thesis/strategy - 2026-03-08:
Thesis on how AI inherits and accelerates internet patterns. Draws parallels between
internet infrastructure evolution and AI agent infrastructure needs. ~156 lines.
aiStrat/thesis/ai-internet-acceleration.md
```

```
ai-investment-thesis.md - thesis/strategy - 2026-03-08:
Investment thesis analyzing the AI infrastructure cycle — whether current spending
represents a bubble or a down payment. Market data, infrastructure spending analysis,
and positioning of Admiral within the broader AI ecosystem. ~218 lines.
aiStrat/thesis/ai-investment-thesis.md
```
