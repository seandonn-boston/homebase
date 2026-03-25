# TODO: Hooks, Standing Orders & Core Infrastructure

**Source streams:** Stream 7 (S-01 to S-09), Stream 8 (S-10 to S-17), Stream 29 (SO-01 to SO-17)

---

## Missing Hooks (Stream 7, Section 7.1)

- [ ] **S-01** — `identity_validation.sh`: Validate agent identity token at SessionStart against fleet registry; block invalid identities with exit code 2
- [ ] **S-02** — `tier_validation.sh`: Validate model tier assignment against agent role requirements; warn on mismatch, hard-block critical mismatches
- [ ] **S-03** — `governance_heartbeat_monitor.sh`: Monitor governance agent (Sentinel, Arbiter) health via heartbeat signals; alert on missing heartbeat after threshold; log heartbeat history to state
- [ ] **S-04** — `protocol_registry_guard.sh`: Two enforcement surfaces: (1) validate protocol changes against SO-16 approval rules, (2) hard-block calls to unregistered MCP servers via approved registry (`admiral/config/approved_mcp_servers.json`); closes OWASP MCP09 gap

## Deferred from Phase 0 (Strategy Foundation)

- [ ] **ST-06** — Strategy Triangle validation hook: Create a SessionStart hook that loads and validates the Ground Truth document against the schema on every session start; block on missing Ground Truth, warn on incomplete fields, log results for audit, and complete in under 2 seconds. *(Deferred from Phase 0 — depends on Stream 7 hook infrastructure.)*
- [ ] **ST-07** — LLM-Last boundary enforcement: Add an LLM-Last check to the Ground Truth validator ensuring each project's Boundaries document includes an explicit LLM-Last section; provide a reference template with common deterministic-first and LLM-judgment patterns. *(Deferred from Phase 0 — depends on ST-06.)*

## Hook Contracts (Stream 7, Section 7.1)

- [ ] **S-04b** — Hook input/output contract specification: Document formal JSON schemas for all hook inputs (`{ "event", "tool", "params", "agent_identity", "trace_id" }`), output contracts (exit codes, stdout context feedback, stderr logging), per-hook payload shapes, and 30s default timeout semantics

## Enforcement Map (Stream 7, Section 7.1)

- [ ] **S-05** — Standing Orders enforcement map: Document which hooks enforce which SOs; classify each as hook-enforced, instruction-embedded, or guidance-only; file at `admiral/docs/standing-orders-enforcement-map.md`

## Fleet Orchestration (Stream 7, Section 7.2)

- [ ] **S-06** — Agent registry: Runtime registry mapping agent ID to capabilities, routing rules, model tier, and tool permissions; provides lookup API (by ID, capability, tier); returns structured JSON
- [ ] **S-07** — Task routing engine: Route tasks to agents based on task type, file ownership, capability scores, and load; return routing decision with justification
- [ ] **S-08** — Tool permission matrix: Per-agent tool permissions enforced at runtime; denied tools blocked with clear error; integrates with `pre_tool_use_adapter.sh`
- [ ] **S-09** — Fleet configuration validator: Validate fleet config against spec constraints (1-12 agents, no tool list overlap, no routing conflicts, valid tiers); pre-flight check before deployment

## Execution Patterns (Stream 8, Section 8.1)

- [ ] **S-10** — Handoff protocol: Agent-to-agent handoff with JSON schema (`handoff/v1.schema.json`); validate completeness before acceptance; reject incomplete handoffs with field-level errors; log handoff history for audit
- [ ] **S-11** — Escalation pipeline: 5-step process (intake classification, Brain precedent query, resolution path generation, Admiral decision, outcome persistence); conflict resolution backbone
- [ ] **S-12** — Parallel execution coordinator: Coordinate parallel agent tasks with dependency tracking; schedule independent tasks concurrently; handle partial failure with configurable abort policy

## Quality Assurance Gates (Stream 8, Section 8.2)

- [ ] **S-13** — SDLC quality gate hooks: Pre-merge gates enforcing test coverage threshold, zero lint errors, complete review checklist; configurable per-project; integrates with CI
- [ ] **S-14** — Structured code review checklist: Automated review validation covering security, performance, readability, correctness; CI validates all checklist items addressed

## Operations & Alerting (Stream 8, Section 8.3)

- [ ] **S-15** — Alerting pipeline: Push alerts from control plane to external systems (webhook, file, structured log); severity/source/timestamp payload; retry with backoff on delivery failure
- [ ] **S-16** — Persistent event store: JSONL event storage on disk beyond in-memory ring buffer; file rotation at configurable size; survive server restarts; historical query support
- [ ] **S-17** — Health check endpoint enhancement: Expand `/api/health` with hook execution stats, state file age, event ingestion lag, alert rate; structured JSON with threshold status (healthy/degraded/critical); sub-100ms response

## Standing Orders Enforcement — Identity & Scope (Stream 29, Section 29.1)

- [ ] **SO-01** — Identity Discipline enforcement: PreToolUse hook validating agent identity consistency throughout session; detect role drift (capability claims outside scope); false positive rate < 1%
- [ ] **SO-03** — Scope Boundaries enforcement: Upgrade `scope_boundary_guard.sh` from soft-warning to hard-blocking; detect "Does NOT Do" list violations; support `ADMIRAL_SCOPE_OVERRIDE` for Escalate-tier only
- [ ] **SO-11** — Context Discovery enforcement: SessionStart hook verifying Ground Truth files loaded, context profile populated, three-step context source routing chain followed; block task execution until minimum viable context confirmed

## Standing Orders Enforcement — Communication & Honesty (Stream 29, Section 29.2)

- [ ] **SO-02** — Output Routing enforcement: PostToolUse hook validating every agent output has a declared destination; hold-and-prompt on missing routing; flag invalid recipients for Orchestrator review
- [ ] **SO-04** — Context Honesty enforcement: PostToolUse hook detecting fabricated file contents, unsupported confidence claims, phantom tool outputs; cross-reference tool use trace; false positive rate < 5%
- [ ] **SO-09** — Communication Format enforcement: PostToolUse hook validating inter-agent communications follow structured format (AGENT, TASK, STATUS, OUTPUT, ASSUMPTIONS, ROUTING SUGGESTIONS, OUTPUT GOES TO); exempt direct tool outputs

## Standing Orders Enforcement — Authority & Recovery (Stream 29, Section 29.3)

- [ ] **SO-05** — Decision Authority enforcement: PreToolUse hook classifying action authority tiers; block Propose-tier actions without submitted proposals; block Escalate-tier actions without Admiral approval; configurable authority classification
- [ ] **SO-06** — Recovery Protocol enforcement: Track recovery ladder progression per failure (retry with variation, fallback, backtrack, isolate, escalate); detect identical retries; prevent ladder step skipping; validate escalation reports for recovery evidence
- [ ] **SO-07** — Checkpointing enforcement: Track tool uses and elapsed time since last checkpoint; pause agent when overdue; validate checkpoint content for required fields (completed, in progress, blocked, decisions, assumptions, resources)

## Standing Orders Enforcement — Quality & Safety (Stream 29, Section 29.4)

- [ ] **SO-08** — Quality Standards enforcement: PostToolUse hook blocking task completion when quality gates not run or failing; cross-reference tool use trace for quality check execution evidence
- [ ] **SO-10** — Prohibitions enforcement (edge case hardening): Harden existing hook against encoded secrets, split-across-lines patterns, indirect file modification, self-approval, budget continuation; regression tests from attack corpus
- [ ] **SO-12** — Zero Trust enforcement: Enhance `zero_trust_validator.sh` with pre/post access risk assessment, minimum privilege verification, access release tracking, RAG provenance checking

## Standing Orders Enforcement — Bias, Compliance & Protocol Governance (Stream 29, Section 29.5)

- [ ] **SO-13** — Bias Awareness enforcement: PostToolUse hook detecting sycophantic drift, confidence uniformity, missing disconfirming evidence, unattributed RAG blending, premature convergence; session-level tracking
- [ ] **SO-14** — Compliance Ethics enforcement: PreToolUse hook for regulated domain detection, block autonomous compliance determinations, detect IP violations, flag harmful output patterns, enforce data minimization
- [ ] **SO-15** — Pre-Work Validation enforcement: Enhance `pre_work_validator.sh` to reject vague success criteria, verify budget presence, confirm scope boundaries, enforce hard decision front-loading for Propose/Escalate-tier
- [ ] **SO-16** — Protocol Governance enforcement: PreToolUse hook validating MCP server additions against Server Addition Checklist, require trust classification, reject `latest` version strings, verify A2A connection testing, detect conflicts with in-flight work

## Standing Orders Enforcement — Completeness (Stream 29, Section 29.6)

- [ ] **SO-17** — Enforcement completeness report: Automated script mapping each SO to enforcement mechanism(s), reporting enforcement type (hard-block/soft-warning/advisory-only/none), calculating coverage percentage, identifying gaps; produces human-readable summary and JSON output; runs in CI

## Relocated from Phase 2

- [ ] **P-09** — Standing Order compliance audit: enforcement matrix (enforced/instructed/advisory/unenforced) for all 16 SOs. *(Relocated from Phase 2 — depends on S-05 and SO-17.)*
- [ ] **P-10** — Hook coverage report: spec-defined hooks vs implemented, hook-to-SO coverage, JSON + markdown output. *(Relocated from Phase 2 — depends on S-05.)*

---

## Dependencies

**Within this scope:**

| Item | Depends on | Reason |
|------|-----------|--------|
| ST-06 | S-01 or S-03 (any SessionStart hook) | Needs hook infrastructure to create a SessionStart validation hook |
| ST-07 | ST-06 | LLM-Last check extends the Ground Truth validation hook |
| S-03 | S-15 | Heartbeat monitor needs alerting pipeline for external delivery |
| S-07 | S-06 | Task routing queries the agent registry |
| S-08 | S-06 | Tool permissions reference agent definitions from registry |
| S-09 | S-06 | Fleet validation checks registry entries |
| S-12 | S-10, S-11 | Parallel coordination requires handoff and escalation patterns |
| SO-17 | SO-01 through SO-16 | Reports on enforcement status of all other SOs |

**Cross-scope dependencies:**

| Item | External dependency | Reason |
|------|-------------------|--------|
| S-01 | Fleet agent definitions (Stream 15) | Validates identity against fleet registry |
| S-04 | MCP security analysis, SO-16, Part 13 | Protocol governance and MCP server enforcement |
| S-05 | All SO enforcement items | Documents the enforcement status of all SOs |
| S-11 | Brain B1 (Stream 6) | Escalation step 2 queries Brain for precedent |
| S-13 | CI pipeline | Quality gates integrate with CI for enforcement |
| S-15 | Control plane RunawayDetector | Alerting extends existing detection infrastructure |
| SO-04, SO-13 | Tool use trace infrastructure | Cross-reference agent claims against actual tool history |

**Recommended execution order:**

1. S-05 (enforcement map) -- identifies remaining gaps
2. S-06 (agent registry) -- foundation for fleet orchestration
3. S-01, S-02 (identity + tier validation) -- session-start hooks
4. S-03 (governance heartbeat) -- monitoring hook
5. S-04 (protocol registry guard) -- MCP enforcement
6. S-08 (tool permission matrix), S-09 (fleet config validator)
7. S-10 (handoff protocol), S-11 (escalation pipeline)
8. S-13 (quality gates), S-14 (review checklist)
9. S-15 (alerting), S-16 (persistent events), S-17 (health check)
10. S-12 (parallel coordinator)
11. S-07 (task routing engine)
12. SO-01 through SO-16 (per-SO enforcement hooks)
13. SO-17 (enforcement completeness report)
