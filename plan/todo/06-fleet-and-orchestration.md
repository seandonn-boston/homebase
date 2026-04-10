# TODO: Fleet & Orchestration

Source streams: **Stream 14 (Fleet Agent Definitions, F-01 to F-14)** | **Stream 15 (Fleet Routing & Orchestration, O-01 to O-10)**

---

## Agent Definition Schema

- [x] **F-12a** — Agent definition JSON Schema (`fleet/agents/schema/agent-definition.schema.json`): Identity, Authority, Constraints, Tool Registry (disjoint validation), Model Tier, Context Injection, Interface Contracts, File Ownership, API Resilience, Prompt Anatomy metadata
- [x] **F-12b** — Agent definition validator (`fleet/agents/schema/validate.sh` or `.ts`): CI check for schema compliance, tool list disjointness, model tier validity, routing table consistency, interface contract completeness
- [x] **F-14** — Agent definition template generator (`fleet/agents/schema/generate-agent.sh` or `.ts`): scaffold md + json from name and category with all required sections

## Command Layer Agents

- [x] **F-01a** — Orchestrator agent definition: Tier 1 Flagship, routing logic, decomposition rules, handoff protocols for all specialist categories
- [x] **F-01b** — Triage Agent definition: Tier 3 Utility, classification taxonomy, priority levels, structured output format
- [x] **F-01c** — Mediator agent definition: Tier 1 Flagship, conflict detection criteria, resolution strategies, escalation triggers
- [x] **F-01d** — Context Curator agent definition: Tier 2 Workhorse, context assembly algorithm, budget allocation rules, sufficiency check

## Engineering Agents

- [x] **F-02a** — Backend engineering agent definitions: Backend Implementer, API Designer, Database Agent, Integration Agent, Queue & Messaging, Cache Strategist (all Tier 2)
- [x] **F-02b** — Frontend engineering agent definitions: Frontend Implementer, Interaction Designer, Accessibility Auditor, Responsive Layout, State Management, Design Systems (all Tier 2)
- [x] **F-02c** — Cross-cutting engineering agent definitions: Refactoring Agent, Dependency Manager, Technical Writer, Diagram Agent
- [x] **F-02d** — Infrastructure agent definitions: DevOps, Infrastructure, Containerization, Observability agents (Tier 2, restricted deployment authority)

## Quality & Governance Agents

- [x] **F-03** — Quality agent definitions: QA Agent (never self-reviews), Unit Test Writer, E2E Test Writer, Performance Tester, Chaos Agent, Regression Guardian
- [x] **F-04** — Governance agent definitions: Token Budgeter, Drift Monitor, Hallucination Auditor, Bias Sentinel, Loop Breaker, Context Health Monitor, Contradiction Detector

## Specialist Agents

- [x] **F-05** — Lifecycle agent definitions: Release Orchestrator, Incident Response (Tier 1), Feature Flag Strategist, Migration Agent
- [x] **F-06** — Security agent definitions: Security Auditor (Tier 2, Blocked degradation), Penetration Tester, Compliance Agent, Privacy Agent
- [x] **F-07** — Scale agent definitions: 12 scale agents (all Tier 1 except Capacity Horizon Scanner at Tier 2), common output schema
- [x] **F-08** — Meta agent definitions: Pattern Enforcer (Tier 3), Dependency Sentinel (Tier 3), SEO Crawler, Role Crystallizer (Tier 1), Devil's Advocate (Tier 1), Red Team (Tier 1), Simulated User, Persona Agent, UX Researcher
- [x] **F-09** — Data agent definitions (extended): Data Engineer, Analytics Implementer, ML Engineer, Data Validator (Tier 3), Visualization Agent
- [x] **F-10** — Domain specialization agent definitions (extended): Auth & Identity, Payment & Billing, Search & Relevance, Real-time Systems, Media Processing, Notification Orchestrator, Internationalization, SDK & Dev Experience, Monorepo Coordinator
- [x] **F-11** — Ecosystem agent definitions: Copywriter, Contract Test Writer, remaining agents; 100% coverage report across 71 core + 34 extended agents

## ASP Alignment

- [~] ~~**F-15** — Align agent definitions with Agent Spec Protocol (ASP) format: update F-12a schema to validate ASP-compliant definitions, convert Orchestrator/QA/Security Auditor to full ASP format, integrate ASP validation schemas, enforce negative tool lists. ASP introduces authority relationships, `extends` inheritance, and per-agent Decision Authority tiers. Depends on F-12a. *(partial — see audit)*~~ → **MOVED 2026-04-10 to Phase 24 / Stream 47 (F4-07 through F4-10)** — see `plan/todo/29-enterprise-profile-ladder-closure.md`. ASP full alignment belongs with Fleet F4 because ASP authority relationships and `extends` inheritance pay off in multi-orchestrator federation. Phase 24 expands the scope to all 71 core + 34 extended agents (originally just Orchestrator/QA/Security Auditor).

## ASP Templates & Migration

- [x] **F-15b** — ASP template creation (minimal, standard, production): Three ASP templates matching spec tiers — minimal (Sections 1-5, lightweight specialists), standard (Sections 1-8, 10-11, most production agents), production (all 12 sections, command/critical agents). Each with YAML frontmatter, guidance comments, and example content.
- [x] **F-16** — Legacy-to-ASP migration path: Migration script scanning existing agent definitions, identifying gaps (missing frontmatter, unformalized sections), generating ASP-compliant versions preserving content, validating against ASP schemas. Non-destructive — originals preserved.

## Capability Registry

- [x] **F-13** — Machine-readable agent capability registry: generation script producing consolidated JSON from all agent definitions, queryable by Orchestrator, auto-regenerates on definition changes

## Routing Engine

- [x] **O-01a** — Task-type routing implementation: parse 86 routing rules from `fleet/routing-rules.md`, resolve primary/fallback/escalation, enforce constraints (no self-review, no Does-NOT-Do violations)
- [x] **O-01b** — File-ownership routing implementation: configurable file-path-to-agent ownership, multi-owner decomposition signals
- [x] **O-01c** — Capability-matching routing: registry-based fallback with ranked candidates, confidence scores, low-confidence escalation
- [~] ~~**O-02a** — Model tier validation hook (`SessionStart: tier_validation`): reject sessions where model does not meet minimum tier *(partial — see audit)*~~ → **MOVED 2026-04-10 to Phase 23 / Stream 46 (LC-O02a)** — see `plan/todo/28-legacy-carryover-sweep.md`. Phase 12 closeout marked this complete but it remained partial.
- [x] **O-02b** — Degradation policy engine: exponential backoff (1s-30s, 4 retries), per-agent Degraded/Blocked policies, no cascading degradation, recovery protocol
- [x] **O-02c** — Model tier promotion/demotion tracking: quality rates, rework costs, A/B results, recommendations persisted to Brain
- [x] **O-08** — File ownership conflict resolution: detect overlapping ownership at assignment time, resolve via decompose / primary-reviewer / escalate

## Orchestration Patterns

- [x] **O-03a** — Three-layer context assembly: Layer 1 (Fleet), Layer 2 (Project), Layer 3 (Task); prompt anatomy ordering; context budget enforcement
- [x] **O-03b** — Category-specific context checklists: engineering, quality, security, governance checklists validated at session start
- [x] **O-03c** — Progressive disclosure via skills: lazy-load skill files on matching file patterns or keywords
- [x] **O-04** — Handoff contract validation: validate agent-to-agent payloads against `fleet/interface-contracts.md`, reject violations, track repeated failures (3+ triggers decomposition review)
- [x] **O-05a** — Handoff protocol implementation: context transfer, state serialization, metadata extension point, `handoff/v1.schema.json`
- [x] **O-05b** — Multi-agent pipeline orchestration: sequential pipelines with step tracking, failure handling (retry/skip/abort), consolidated traces
- [x] **O-06** — Fleet health monitoring: per-agent metrics (utilization, throughput, error rate, budget burn, first-pass quality), fleet aggregates, classified alerts (CRITICAL/HIGH/MEDIUM/LOW) with deduplication
- [x] **O-07** — Task decomposition engine: break complex tasks into single-agent subtasks with acceptance criteria and budget allocation, detect artificial splits
- [x] **O-09** — Fleet scaling policies: queue depth / utilization / wait-time triggers, fleet size limits (warn at 12), cooldown periods
- [x] **O-10** — Agent warm-up and cool-down: context pre-loading for anticipated tasks, idle release after configurable period, re-activation with context reload

---

## Dependencies

| Item | Depends on |
|------|-----------|
| F-12b (validator) | F-12a (schema) |
| F-13 (capability registry) | F-12a, F-12b |
| F-14 (template generator) | F-12a |
| F-15 (ASP alignment) | F-12a (schema) |
| F-01 through F-11 (all agent definitions) | F-12a (schema to validate against) |
| O-01c (capability-match routing) | F-13 (capability registry) |
| O-03b (context checklists) | O-03a (context assembly) |
| O-04 (handoff validation) | F-01 through F-11 (agent definitions with interface contracts) |
| O-05a (handoff protocol) | O-04 (contract validation) |
| O-05b (multi-agent pipeline) | O-05a (handoff protocol) |
| O-07 (task decomposition) | O-01a, O-01b (routing engine) |
| O-08 (conflict resolution) | O-01b (file-ownership routing) |
| O-10 (warm-up/cool-down) | O-03a (context assembly) |
