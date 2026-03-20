# Stream 14: Fleet Agent Definitions — Implementing All 71 Agent Roles

> *"The boring agents win." — Admiral Spec, Part 4*

**Scope:** The fleet spec defines 71 core agent roles across 12 categories plus 4 command & coordination agents, with an additional 34 extended agents. None are implemented as runnable agent configurations. This stream covers creating concrete, AGENTS.md-compatible definitions for every agent role, building the schema and tooling to validate them, and establishing a machine-readable capability registry so the Orchestrator can route tasks to the right specialist.

**Competitive context:** The Agent Spec Protocol (ASP) introduced in `aiStrat/admiral/spec/agent-spec-protocol/` defines the canonical format. Part 4 of the spec (updated) emphasizes starting with a core fleet of 11 roles — not 71 — to avoid coordination cost dominance. The competitive threat analysis shows no competitor has structured agent definitions with authority relationships, negative tool lists, and per-agent decision authority tiers. This is a defensible differentiator.

**Current state:** Agent definitions exist as prose descriptions in `fleet/agents/` markdown files. They describe roles, responsibilities, and "Does NOT Do" boundaries, but they are not structured for machine consumption. No agent definition schema exists. No validator ensures consistency. No registry maps capabilities to agents.

**Why this matters:** Without concrete agent definitions, the fleet spec is a design document, not an operational system. Routing rules reference agents that do not exist as deployable configurations. The Orchestrator cannot discover agent capabilities. Context injection has no structured target. Every downstream stream (routing, orchestration, MCP integration, platform adapters) depends on agents being defined in a consistent, machine-readable format.

---

## F-01: Command Layer Agents

- [ ] **F-01a: Orchestrator agent definition**
  - **Description:** Create a full AGENTS.md-compatible definition for the Orchestrator — the agent that decomposes goals, routes to specialists, manages progress, and enforces standards. Must include Identity, Authority (Autonomous/Propose/Escalate tiers), Constraints (Does NOT Do), tool registry (available and negative tool lists), model tier assignment (Tier 1 Flagship), context injection requirements, and interface contracts for handoffs to every specialist category.
  - **Done when:** Orchestrator definition file exists, passes schema validation (F-12), includes all five prompt anatomy sections (Identity, Authority, Constraints, Knowledge, Task), and covers routing logic, decomposition rules, and handoff protocols.
  - **Files:** `fleet/agents/definitions/orchestrator.md` (new), `fleet/agents/definitions/orchestrator.json` (new)
  - **Size:** L
  - **Spec ref:** Part 4 — Fleet Composition, Core Fleet table (Priority 1), `fleet/routing-rules.md`

- [ ] **F-01b: Triage Agent definition**
  - **Description:** Create a full definition for the Triage Agent — classifies incoming work, assigns priority and agent routing. Tier 3 Utility model. Must define the classification taxonomy, priority levels, and the structured output format the Orchestrator consumes.
  - **Done when:** Definition file exists, passes schema validation, taxonomy is explicit and machine-parseable, includes examples of classification decisions.
  - **Files:** `fleet/agents/definitions/triage.md` (new), `fleet/agents/definitions/triage.json` (new)
  - **Size:** M
  - **Spec ref:** Part 4 — Core Fleet (Priority 2), `fleet/model-tiers.md` (Tier 3)

- [ ] **F-01c: Mediator agent definition**
  - **Description:** Create a full definition for the Mediator — resolves conflicts between agents when they produce contradictory outputs or claim overlapping scope. Tier 1 Flagship model. Must define conflict detection criteria, resolution strategies, and escalation triggers.
  - **Done when:** Definition file exists, passes schema validation, conflict resolution protocol is explicit, includes interface contracts for receiving conflict reports and emitting resolutions.
  - **Files:** `fleet/agents/definitions/mediator.md` (new), `fleet/agents/definitions/mediator.json` (new)
  - **Size:** M
  - **Spec ref:** Part 4 — Fleet Composition, `fleet/model-tiers.md` (Tier 1)

- [ ] **F-01d: Context Curator agent definition**
  - **Description:** Create a full definition for the Context Curator — assembles context payloads for other agents, manages context budget allocation, and determines what knowledge each agent needs for its current task. Tier 2 Workhorse model. Must define the context assembly algorithm, budget allocation rules per priority tier, and the context sufficiency check (can the agent answer "what is my role?", "what may I decide?", "what must I not do?").
  - **Done when:** Definition file exists, passes schema validation, context assembly rules are explicit, budget allocation follows `fleet/context-injection.md` priority table.
  - **Files:** `fleet/agents/definitions/context-curator.md` (new), `fleet/agents/definitions/context-curator.json` (new)
  - **Size:** M
  - **Spec ref:** Part 4, `fleet/context-injection.md`, `fleet/prompt-anatomy.md`

---

## F-02: Engineering Agents

- [ ] **F-02a: Backend engineering agent definitions**
  - **Description:** Create AGENTS.md-compatible definitions for Backend Implementer, API Designer, Database Agent, Integration Agent, Queue & Messaging Agent, Cache Strategist, and Performance-related backend agents. Each definition must include Identity, Authority, Constraints, tool registry (with negative tool lists), model tier (all Tier 2), file ownership patterns, and interface contracts for handoffs with other engineering agents and QA.
  - **Done when:** All backend engineering agent definitions exist, pass schema validation, each has explicit "Does NOT Do" boundaries, file ownership patterns are defined, and interface contracts match `fleet/interface-contracts.md`.
  - **Files:** `fleet/agents/definitions/backend-implementer.{md,json}`, `fleet/agents/definitions/api-designer.{md,json}`, `fleet/agents/definitions/database-agent.{md,json}`, `fleet/agents/definitions/integration-agent.{md,json}`, `fleet/agents/definitions/queue-messaging.{md,json}`, `fleet/agents/definitions/cache-strategist.{md,json}` (all new)
  - **Size:** L
  - **Spec ref:** Part 4 — Fleet Composition, `fleet/routing-rules.md`, `fleet/interface-contracts.md`

- [ ] **F-02b: Frontend engineering agent definitions**
  - **Description:** Create definitions for Frontend Implementer, Interaction Designer, Accessibility Auditor, Responsive Layout Agent, State Management Agent, and Design Systems Agent. Each must define UI-specific tool access (browser preview, screenshot analysis), component-level file ownership, and handoff contracts with design and QA agents.
  - **Done when:** All frontend engineering agent definitions exist, pass schema validation, include UI-specific tool registries and accessibility requirements.
  - **Files:** `fleet/agents/definitions/frontend-implementer.{md,json}`, `fleet/agents/definitions/interaction-designer.{md,json}`, `fleet/agents/definitions/accessibility-auditor.{md,json}`, `fleet/agents/definitions/responsive-layout.{md,json}`, `fleet/agents/definitions/state-management.{md,json}`, `fleet/agents/definitions/design-systems.{md,json}` (all new)
  - **Size:** L
  - **Spec ref:** Part 4 — Fleet Composition, `fleet/routing-rules.md`

- [ ] **F-02c: Cross-cutting engineering agent definitions**
  - **Description:** Create definitions for Refactoring Agent, Dependency Manager, Technical Writer, and Diagram Agent. These agents span frontend and backend boundaries. Must define cross-boundary file ownership rules and collaboration contracts.
  - **Done when:** All cross-cutting agent definitions exist, pass schema validation, file ownership rules handle cross-boundary work without conflicts.
  - **Files:** `fleet/agents/definitions/refactoring-agent.{md,json}`, `fleet/agents/definitions/dependency-manager.{md,json}`, `fleet/agents/definitions/technical-writer.{md,json}`, `fleet/agents/definitions/diagram-agent.{md,json}` (all new)
  - **Size:** M
  - **Spec ref:** Part 4, `fleet/routing-rules.md`

- [ ] **F-02d: Infrastructure agent definitions**
  - **Description:** Create definitions for DevOps Agent, Infrastructure Agent, Containerization Agent, and Observability Agent. Each must define CI/CD tool access, infrastructure-as-code permissions, and deployment authority tiers (most deployment actions should be Propose or Escalate tier).
  - **Done when:** All infrastructure agent definitions exist, pass schema validation, deployment authority is appropriately restricted, tool registries include IaC-specific tools.
  - **Files:** `fleet/agents/definitions/devops-agent.{md,json}`, `fleet/agents/definitions/infrastructure-agent.{md,json}`, `fleet/agents/definitions/containerization-agent.{md,json}`, `fleet/agents/definitions/observability-agent.{md,json}` (all new)
  - **Size:** M
  - **Spec ref:** Part 4, `fleet/routing-rules.md`, `fleet/model-tiers.md` (Tier 2)

---

## F-03: Quality Agents

- [ ] **F-03: Quality agent definitions**
  - **Description:** Create definitions for QA Agent, Unit Test Writer, E2E Test Writer, Performance Tester, Chaos Agent, and Regression Guardian. The QA Agent is the most critical — it must never review its own work (routing constraint). Each quality agent needs explicit acceptance criteria formats, test infrastructure requirements, and handoff contracts for rejection flows (QA Agent -> Implementer rejection format per `fleet/interface-contracts.md`).
  - **Done when:** All quality agent definitions exist, pass schema validation, QA conflict-of-interest constraint is explicit in each definition, rejection handoff contracts match interface-contracts.md.
  - **Files:** `fleet/agents/definitions/qa-agent.{md,json}`, `fleet/agents/definitions/unit-test-writer.{md,json}`, `fleet/agents/definitions/e2e-test-writer.{md,json}`, `fleet/agents/definitions/performance-tester.{md,json}`, `fleet/agents/definitions/chaos-agent.{md,json}`, `fleet/agents/definitions/regression-guardian.{md,json}` (all new)
  - **Size:** L
  - **Spec ref:** Part 4 — Fleet Composition (routing constraints: never route QA to implementer), `fleet/interface-contracts.md` (Quality Handoffs)

---

## F-04: Governance Agents

- [ ] **F-04: Governance agent definitions**
  - **Description:** Create definitions for Token Budgeter, Drift Monitor, Hallucination Auditor, Bias Sentinel, Loop Breaker, Context Health Monitor, and Contradiction Detector. Governance agents monitor other agents — they need read access to fleet telemetry, Brain query access, and structured output formats for findings. Each must define the specific failure modes it detects (per `fleet/agents/governance.md`), the handoff contract for reporting findings to the Orchestrator, and the conditions under which it escalates vs. auto-resolves.
  - **Done when:** All governance agent definitions exist, pass schema validation, each defines its failure mode detection criteria, handoff contracts match `fleet/interface-contracts.md` (Governance Handoffs section), and escalation triggers are explicit.
  - **Files:** `fleet/agents/definitions/token-budgeter.{md,json}`, `fleet/agents/definitions/drift-monitor.{md,json}`, `fleet/agents/definitions/hallucination-auditor.{md,json}`, `fleet/agents/definitions/bias-sentinel.{md,json}`, `fleet/agents/definitions/loop-breaker.{md,json}`, `fleet/agents/definitions/context-health-monitor.{md,json}`, `fleet/agents/definitions/contradiction-detector.{md,json}` (all new)
  - **Size:** L
  - **Spec ref:** Part 4, `fleet/agents/governance.md`, `fleet/interface-contracts.md` (Governance Handoffs), `fleet/model-tiers.md`

---

## F-05: Lifecycle Agents

- [ ] **F-05: Lifecycle agent definitions**
  - **Description:** Create definitions for Release Orchestrator, Incident Response Agent, Feature Flag Strategist, Migration Agent, and related lifecycle agents. The Incident Response Agent is Tier 1 (Flagship) — production incidents require deep judgment under pressure. Release Orchestrator must define the release checklist handoff to DevOps. Each must define trigger conditions (event-driven vs. on-demand), authority tiers appropriate for production-impacting decisions, and API resilience policies.
  - **Done when:** All lifecycle agent definitions exist, pass schema validation, Incident Response Agent is Tier 1, Release Orchestrator handoff contract matches `fleet/interface-contracts.md` (Lifecycle Handoffs), event-driven trigger patterns follow Part 9 templates.
  - **Files:** `fleet/agents/definitions/release-orchestrator.{md,json}`, `fleet/agents/definitions/incident-response.{md,json}`, `fleet/agents/definitions/feature-flag-strategist.{md,json}`, `fleet/agents/definitions/migration-agent.{md,json}` (all new)
  - **Size:** M
  - **Spec ref:** Part 4, Part 9 — Event-Driven Operations, `fleet/interface-contracts.md` (Lifecycle Handoffs), `fleet/model-tiers.md`

---

## F-06: Security Agents

- [ ] **F-06: Security agent definitions**
  - **Description:** Create definitions for Security Auditor, Penetration Tester, Compliance Agent, and Privacy Agent. Security Auditor is Tier 2 with a **Blocked** degradation policy (no fallback to lower tier — security review quality cannot be silently reduced). Each must define OWASP classification familiarity, vulnerability reporting format (file, line, severity, CWE/CVE reference), and the handoff contract for sending findings to implementers.
  - **Done when:** All security agent definitions exist, pass schema validation, Security Auditor has Blocked degradation policy, vulnerability reporting format matches `fleet/interface-contracts.md` (Security Handoffs), each defines trust boundary awareness requirements.
  - **Files:** `fleet/agents/definitions/security-auditor.{md,json}`, `fleet/agents/definitions/penetration-tester.{md,json}`, `fleet/agents/definitions/compliance-agent.{md,json}`, `fleet/agents/definitions/privacy-agent.{md,json}` (all new)
  - **Size:** M
  - **Spec ref:** Part 4, `fleet/interface-contracts.md` (Security Handoffs), `fleet/model-tiers.md` (Tier 2, Blocked override), `fleet/context-injection.md` (Security agent context)

---

## F-07: Scale Agents

- [ ] **F-07: Scale agent definitions**
  - **Description:** Create definitions for the 12 scale agents defined in `fleet/agents/scale.md`. All are Tier 1 (Flagship) except Capacity Horizon Scanner (Tier 2). Scale agents perform inhuman-scale analysis — codebase-wide pattern detection, cross-system dependency mapping, architectural erosion detection. Each must define the common output schema (analysis_type, scope, findings, confidence_level, methodology, limitations, recommendations, audit_trail) and the handoff contract to the Orchestrator.
  - **Done when:** All 12 scale agent definitions exist, pass schema validation, all use the common output schema, tier assignments match `fleet/model-tiers.md`, handoff contracts match `fleet/interface-contracts.md` (Scale Agent Handoffs).
  - **Files:** `fleet/agents/definitions/scale/` directory with 12 definition files (all new)
  - **Size:** L
  - **Spec ref:** Part 4, `fleet/agents/scale.md`, `fleet/interface-contracts.md` (Scale Agent Handoffs), `fleet/model-tiers.md` (Tier 1)

---

## F-08: Meta Agents

- [ ] **F-08: Meta agent definitions**
  - **Description:** Create definitions for Pattern Enforcer, Dependency Sentinel, SEO Crawler, Role Crystallizer, Devil's Advocate, Red Team Agent, Simulated User, Persona Agent, and UX Researcher. Pattern Enforcer and Dependency Sentinel are Tier 3 (Utility). Devil's Advocate and Red Team Agent are Tier 1 (Flagship) — adversarial reasoning requires strongest reasoning. Role Crystallizer is Tier 1 — fleet evolution requires system-level pattern recognition.
  - **Done when:** All meta agent definitions exist, pass schema validation, tier assignments match `fleet/model-tiers.md`, adversarial agents (Devil's Advocate, Red Team) have explicit rules for constructive challenge vs. obstruction, handoff contracts match `fleet/interface-contracts.md` (Meta & Autonomous Handoffs, Adversarial Handoffs).
  - **Files:** `fleet/agents/definitions/pattern-enforcer.{md,json}`, `fleet/agents/definitions/dependency-sentinel.{md,json}`, `fleet/agents/definitions/seo-crawler.{md,json}`, `fleet/agents/definitions/role-crystallizer.{md,json}`, `fleet/agents/definitions/devils-advocate.{md,json}`, `fleet/agents/definitions/red-team.{md,json}`, `fleet/agents/definitions/simulated-user.{md,json}`, `fleet/agents/definitions/persona-agent.{md,json}`, `fleet/agents/definitions/ux-researcher.{md,json}` (all new)
  - **Size:** L
  - **Spec ref:** Part 4, `fleet/model-tiers.md`, `fleet/interface-contracts.md`

---

## F-09: Data Agents

- [ ] **F-09: Data agent definitions (extended)**
  - **Description:** Create definitions for the extended data agents: Data Engineer, Analytics Implementer, ML Engineer, Data Validator, and Visualization Agent. These live in `fleet/agents/extras/` and are deployed only when a project has data pipeline needs. Data Validator is Tier 3 (schema and constraint checking). All others are Tier 2. Must define data-specific tool registries (database access, pipeline tools) and domain-specific context requirements per `fleet/context-injection.md` (Domain & Data Agents).
  - **Done when:** All data agent definitions exist in extras/, pass schema validation, tier assignments correct, context injection requirements match the Domain & Data checklist.
  - **Files:** `fleet/agents/definitions/extras/data-engineer.{md,json}`, `fleet/agents/definitions/extras/analytics-implementer.{md,json}`, `fleet/agents/definitions/extras/ml-engineer.{md,json}`, `fleet/agents/definitions/extras/data-validator.{md,json}`, `fleet/agents/definitions/extras/visualization-agent.{md,json}` (all new)
  - **Size:** M
  - **Spec ref:** Part 4, `fleet/routing-rules.md` (Data pipeline routing), `fleet/model-tiers.md`, `fleet/context-injection.md`

---

## F-10: Domain Agents

- [ ] **F-10: Domain specialization agent definitions (extended)**
  - **Description:** Create definitions for extended domain agents: Auth & Identity Specialist, Payment & Billing Agent, Search & Relevance Agent, Real-time Systems Agent, Media Processing Agent, Notification Orchestrator, Internationalization Agent, SDK & Dev Experience Agent, and Monorepo Coordinator. All are Tier 2. These are opt-in agents deployed when domain-specific expertise is needed. Must define domain-specific compliance requirements (PCI for payments, GDPR for auth/privacy) and integration points.
  - **Done when:** All domain agent definitions exist in extras/, pass schema validation, domain-specific compliance requirements are explicit, handoff contracts with Backend Implementer are defined per `fleet/interface-contracts.md` (Domain & Data Handoffs).
  - **Files:** `fleet/agents/definitions/extras/auth-identity.{md,json}`, `fleet/agents/definitions/extras/payment-billing.{md,json}`, `fleet/agents/definitions/extras/search-relevance.{md,json}`, `fleet/agents/definitions/extras/real-time-systems.{md,json}`, `fleet/agents/definitions/extras/media-processing.{md,json}`, `fleet/agents/definitions/extras/notification-orchestrator.{md,json}`, `fleet/agents/definitions/extras/internationalization.{md,json}`, `fleet/agents/definitions/extras/sdk-dev-experience.{md,json}`, `fleet/agents/definitions/extras/monorepo-coordinator.{md,json}` (all new)
  - **Size:** L
  - **Spec ref:** Part 4, `fleet/routing-rules.md`, `fleet/interface-contracts.md` (Domain & Data Handoffs)

---

## F-11: Ecosystem Agents

- [ ] **F-11: Ecosystem agent definitions**
  - **Description:** Create definitions for Copywriter, Contract Test Writer, and any remaining agents not covered by F-01 through F-10. Verify that every agent in the `fleet/README.md` catalog has a corresponding definition file. Produce a coverage report showing defined vs. undefined agents.
  - **Done when:** Every agent in the fleet catalog has a definition file. Coverage report shows 100% of the 71 core agents and 34 extended agents are defined. No agent in the routing table references an undefined agent.
  - **Files:** Remaining agent definition files, `fleet/agents/definitions/coverage-report.md` (new)
  - **Size:** M
  - **Spec ref:** Part 4, `fleet/README.md`

---

## F-12: Agent Definition Schema and Validator

- [ ] **F-12a: Agent definition JSON schema**
  - **Description:** Create a JSON Schema that formally defines the structure of an agent definition. The schema must capture: Identity (name, role, description), Authority (autonomous/propose/escalate decision tiers), Constraints (Does NOT Do list), Tool Registry (available tools, MCP servers, negative tool list with disjoint validation), Model Tier (tier assignment, degradation policy), Context Injection (required context items per `fleet/context-injection.md`), Interface Contracts (input/output schemas per agent pair), File Ownership (directory patterns), API Resilience (primary, degraded, blocked policies), and Prompt Anatomy metadata (the five-section assembly order).
  - **Done when:** JSON Schema file exists, validates all agent definitions created in F-01 through F-11, enforces required fields, validates tool list disjointness (available intersection denied = empty), enforces model tier is one of {1,2,3,4}.
  - **Files:** `fleet/agents/schema/agent-definition.schema.json` (new)
  - **Size:** L
  - **Spec ref:** Part 4 — Tool & Capability Registry (tool permission validation), `fleet/prompt-anatomy.md`

- [ ] **F-12b: Agent definition validator**
  - **Description:** Create a validation tool that checks all agent definition files against the JSON Schema. Should run as a CI check. Must validate: schema compliance, tool list disjointness, model tier validity, routing table consistency (every agent referenced in routing-rules.md has a definition), and interface contract completeness (every handoff in interface-contracts.md has both sender and receiver definitions).
  - **Done when:** Validator runs in CI, catches schema violations, produces clear error messages with file and field references, all existing definitions pass validation.
  - **Files:** `fleet/agents/schema/validate.sh` (new) or `fleet/agents/schema/validate.ts` (new), `.github/workflows/fleet-validation.yml` (new)
  - **Size:** M
  - **Spec ref:** Part 4 — Tool & Capability Registry (tool permission validation)
  - **Depends on:** F-12a

---

## F-13: Agent Capability Registry

- [ ] **F-13: Machine-readable agent capability registry**
  - **Description:** Create a consolidated, machine-readable registry of all agent capabilities. The Orchestrator uses this registry at routing time to match task requirements to agent capabilities. The registry must include: agent name, capabilities (list of task types it handles), tool permissions (available and denied), model tier requirement, file ownership patterns, and availability status. Must be generated from the individual agent definition files (single source of truth) rather than maintained separately.
  - **Done when:** Registry generation script produces a single JSON file from all agent definitions. Registry includes all 71+ agents. Orchestrator can query the registry to find agents matching a capability requirement. Registry regenerates automatically when any agent definition changes.
  - **Files:** `fleet/agents/registry/generate-registry.sh` (new) or `fleet/agents/registry/generate-registry.ts` (new), `fleet/agents/registry/agent-registry.json` (generated), `fleet/agents/registry/README.md` (new)
  - **Size:** M
  - **Spec ref:** Part 4 — Tool & Capability Registry, `fleet/routing-rules.md`
  - **Depends on:** F-12a, F-12b

---

## F-14: Agent Template Generator

## F-15: Agent Spec Protocol (ASP) Alignment

- [ ] **F-15: Align agent definitions with ASP format**
  - **Description:** The Agent Spec Protocol (`aiStrat/admiral/spec/agent-spec-protocol/`) defines a canonical format for agent definitions with 12 sections (Identity, Scope, Boundaries, Output Routing, Context Profile, Interface Contracts, Decision Authority, Context Discovery, Guardrails, Prompt Anchor, Liveness & Failover — only 4 required). All agent definitions created in F-01 through F-11 should conform to ASP format rather than ad-hoc markdown. ASP introduces key concepts not in the current schema: authority relationships (who can command/suggest/escalate), negative tool lists (what agents explicitly cannot do), `extends` for inheritance to avoid spec duplication, and per-agent Decision Authority (same agent may be Autonomous for formatting but Propose for architecture). Leverage ASP templates (minimal, standard, production) from `aiStrat/admiral/spec/agent-spec-protocol/templates/`.
  - **Done when:** F-12a schema is updated to validate ASP-compliant definitions. At least 3 agent definitions (Orchestrator, QA Agent, Security Auditor) are converted to full ASP format. ASP validation schemas (`asp.schema.json`, `asp-minimal.schema.json`) are integrated into the F-12b validator. Negative tool lists are enforced — agents cannot assume tools they don't have.
  - **Files:** `fleet/agents/schema/agent-definition.schema.json` (update to align with ASP), `fleet/agents/definitions/orchestrator.asp.md` (new), `fleet/agents/definitions/qa-agent.asp.md` (new), `fleet/agents/definitions/security-auditor.asp.md` (new)
  - **Size:** L
  - **Spec ref:** `aiStrat/admiral/spec/agent-spec-protocol/README.md`, `aiStrat/admiral/spec/agent-spec-protocol/validation/asp.schema.json`
  - **Depends on:** F-12a

---

## F-14: Agent Template Generator

- [ ] **F-14: Agent definition template generator**
  - **Description:** Create a tool that scaffolds a new agent definition from the template. Given an agent name and category, it generates both the markdown and JSON definition files with all required sections pre-populated with placeholder values and guidance comments. This lowers the barrier for adding new agents and ensures consistency across all definitions.
  - **Done when:** Running the generator with an agent name and category produces valid definition files that pass schema validation (with placeholder values filled in). Generated files include all required sections from the schema. Generator is documented in CONTRIBUTING.md.
  - **Files:** `fleet/agents/schema/generate-agent.sh` (new) or `fleet/agents/schema/generate-agent.ts` (new)
  - **Size:** S
  - **Spec ref:** Part 4
  - **Depends on:** F-12a
