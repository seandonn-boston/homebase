# SD-01: Spec Debt Inventory

> Comprehensive inventory of all spec debt and gap items with affected sections, nature, downstream impact, and resolution paths.
>
> Sources: `aiStrat/admiral/reference/spec-debt.md`, `aiStrat/admiral/reference/spec-gaps.md`, `admiral/IMPLEMENTATION_STATUS.md`, `admiral/SPEC-DEBT-NEXT-STEPS.md`
>
> Date: 2026-03-20

---

## Active Debt Items

### DEBT-01: Benchmark Targets Lack Empirical Basis (SD-02 in spec-debt.md)

| Field | Value |
|-------|-------|
| **Severity** | Moderate |
| **Affected Section** | `aiStrat/admiral/reference/benchmarks.md` |
| **Nature** | All performance targets (First-pass quality >75%, Auto-recovery >80%, etc.) are informed estimates with no empirical validation from real Admiral-governed fleet operation. |
| **Downstream Impact** | Blocks Stream 33 (Thesis Validation) — cannot validate "enforcement beats advisory" thesis without real measurements. Blocks Stream 32 (Rating System) — rating tiers have no calibrated baselines. |
| **Resolution Path** | 1. Create measurement infrastructure (`admiral/benchmarks/`). 2. Instrument hooks to emit structured metrics. 3. Run real workloads and populate "Validated" column. |
| **Blocking?** | Constraining — does not block implementation but blocks validation |

### DEBT-02: Data Ecosystem Is the Thinnest Doctrine Part (SD-05 in spec-debt.md)

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Affected Section** | `aiStrat/admiral/spec/part12-data-ecosystem.md` |
| **Nature** | Well-specified conceptually (6 feedback loops, 7 datasets, 5 ecosystem agents) with dataset schemas and worked examples (v0.8.1), but no reference implementations for any feedback loop or ecosystem agent. |
| **Downstream Impact** | Blocks Stream 20 (Data Ecosystem) — implementation has no reference to validate against. Constrains Stream 11 (Brain B2/B3) — Brain graduation depends on data ecosystem feedback loops. |
| **Resolution Path** | 1. Pick one feedback loop for end-to-end reference implementation. 2. Create worked example in `admiral/data-ecosystem/`. 3. Validate at least one loop during real deployment. |
| **Blocking?** | Constraining — Phase 6 work can begin but cannot fully validate |

### DEBT-03: Protocol Governance SO-16 Lacks Hook Enforcement (SD-06 in spec-debt.md)

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Affected Section** | Standing Order 16 (Protocol Governance), enforcement spectrum |
| **Nature** | SO-16 mandates MCP server vetting and A2A connection testing before deployment, but no hook enforces this. Compliance is advisory only. |
| **Downstream Impact** | Blocks Stream 7 task S-04 (`protocol_registry_guard` hook). Constrains Stream 16 (MCP Integration) — MCP tool calls to unapproved servers cannot be mechanically blocked. |
| **Resolution Path** | Implement `protocol_registry_guard` PreToolUse hook validating MCP server calls against approved list. Tracked as S-04 in Stream 7. |
| **Blocking?** | Blocking for S-04; constraining for Stream 16 |

---

## Resolved Spec Gaps (14/14 — all resolved in v0.8.1-alpha)

All 14 gaps from `spec-gaps.md` have been resolved with concrete thresholds added to source spec files and mirrored in `reference-constants.md`. Retained here for traceability.

### Critical (7 resolved)

| ID | Gap | Spec Section | Resolved Value |
|----|-----|-------------|----------------|
| GAP-01 | Standing Context Ceiling | part2-context.md | Hard ceiling: <=50K tokens; Warning: 45K |
| GAP-02 | Brain Level Advancement | part5-brain.md | Hit rate >=85%; Precision >=90%; Reuse >=30%; Delta >=5% |
| GAP-03 | Brain Supersession Rate | part5-brain.md | Healthy: <10%/quarter; Warning: >15%/quarter |
| GAP-04 | Over-Decomposition Trigger | part6-execution.md | 2 consecutive chunks OR 3+ in single session |
| GAP-05 | Tactical vs. Strategic Classification | part8-operations.md | Expansion >15% = Strategic; Reduction >10% = Strategic; Deadline >1 week = Strategic |
| GAP-06 | Health Metric Gray Zones | part8-operations.md | 5-tier: FPQR 50-75%, Accuracy 70-85%, Overhead 25-35% yellow |
| GAP-07 | Orchestrator Overhead Graduated Response | part8-operations.md | 5-tier: <20% Normal, 20-25% Monitor, 25-35% Caution, 35-50% Alert, 50%+ Critical |

### Moderate (6 resolved)

| ID | Gap | Spec Section | Resolved Value |
|----|-----|-------------|----------------|
| GAP-08 | Context Loading Position | part2-context.md | First 5-10% of window (~10K-20K in 200K window) |
| GAP-09 | QA Confidence Definitions | part7-quality.md | Verified: >=2 tests; Assessed: >=50% review; Assumed: >=10% sampling |
| GAP-10 | Sycophantic Drift Detection | part7-quality.md | >30% decrease triggers drift check |
| GAP-11 | Admiral Trust Promotion | part10-admiral.md | 5 consecutive successes; reset on any failure |
| GAP-12 | Context Honesty Threshold | part11-protocols.md | >=80% confidence to proceed; <80% triggers escalation |
| GAP-13 | Headless Agent Authority Narrowing | part9-platform.md | Shift 1 tier down: Autonomous->Propose, Propose->Escalate |

### Minor (1 resolved)

| ID | Gap | Spec Section | Resolved Value |
|----|-----|-------------|----------------|
| GAP-14 | Escalation Rate Improvement | part8-operations.md | 5-10% decrease/session during Acceleration; plateau 3+ sessions triggers review |

---

## Implementation Coverage Gaps

Gaps between spec and implementation, derived from `IMPLEMENTATION_STATUS.md`.

### Not Started (3 spec parts)

| Spec Part | Name | Impact | Streams Affected |
|-----------|------|--------|-----------------|
| Part 3 | Fleet Composition | No fleet orchestration code; 71 roles defined but unimplemented | 14, 15 |
| Part 5 | Execution Patterns | No runtime for parallelism, handoff, escalation | 8 |
| Part 10 | Meta-Agent Governance | No agent-governing-agents infrastructure | 19 |

### Partially Implemented (9 spec parts)

| Spec Part | Name | What Exists | Key Gap |
|-----------|------|------------|---------|
| Part 1 | Strategy & Context | Standing orders loader; Brain context router | Context loading orchestration incomplete |
| Part 2 | Deterministic Enforcement | 8/15 hooks (53%); prohibitions + scope boundary | 7 hooks missing; some advisory-only |
| Part 4 | Brain Knowledge | B1 schema; context router | B2/B3 not started |
| Part 6 | Quality Assurance | SPC anomaly; loop/spike detection | No SDLC gates; no automated review |
| Part 7 | Operations | HTTP API; event ingestion; /health | No alerting pipeline |
| Part 8 | Platform Integration | Claude Code hooks; settings.local.json | No cross-platform adapters |
| Part 9 | Security (Zero Trust) | Zero trust validator; injection detection | Advisory-only; privilege escalation incomplete |
| Part 11 | Universal Protocols | Session state; atomic writes | No cross-agent protocol |
| Part 12 | Data Ecosystem | Event stream; execution traces | No feedback loops; no long-term analytics |

### Hook Coverage Gap

| Status | Count | Hooks |
|--------|-------|-------|
| **Implemented** | 8 | prohibitions_enforcer, scope_boundary_guard, zero_trust_validator, pre_work_validator, loop_detector, token_budget_tracker, context_health_check, brain_context_router |
| **Missing** | 7 | identity_validation, tier_validation, governance_heartbeat_monitor, protocol_registry_guard, decision_authority_enforcer, output_routing_validator, recovery_protocol_handler |
| **Coverage** | 53% | Target: 80%+ per benchmarks.md |

---

## Underspecified Areas Requiring Proposals

These areas are identified as underspecified in the spec and require formal proposals (SD-10 through SD-12).

### UNDERSPEC-01: Fleet Orchestration Protocol Details

| Field | Value |
|-------|-------|
| **Affected Streams** | 7, 8, 14, 15 |
| **What's Missing** | Concrete protocol for: agent selection algorithm, agent unavailability handling, task assignment message format, dependency tracking between agents, Orchestrator context management strategy |
| **Why It Matters** | Without protocol details, fleet implementations will diverge and be incompatible. Core to Phase 3-5 work. |
| **Proposal Target** | SD-10 |

### UNDERSPEC-02: Brain Graduation Automation

| Field | Value |
|-------|-------|
| **Affected Streams** | 11 |
| **What's Missing** | Who initiates graduation (Admiral? automated?), reversibility policy, migration process details, Brain availability during migration, dry-run/shadow mode specification |
| **Why It Matters** | Brain B1->B2->B3 transitions are Phase 3/6 milestones. Without clear automation spec, transitions require manual intervention. |
| **Proposal Target** | SD-11 |

### UNDERSPEC-03: Cross-Platform Hook Normalization

| Field | Value |
|-------|-------|
| **Affected Streams** | 7, 17 |
| **What's Missing** | Canonical hook interface definition, handling when platforms lack certain lifecycle events, payload normalization across platforms, platform compatibility matrix, management of platform-specific hooks |
| **Why It Matters** | Platform adapters (Phase 7) cannot be built without knowing how hooks translate across Claude Code, Cursor, Windsurf, API-direct. |
| **Proposal Target** | SD-12 |

---

## Summary

| Category | Count | Status |
|----------|-------|--------|
| Active debt items | 3 | DEBT-01, DEBT-02, DEBT-03 |
| Resolved debt items | 3 | SD-01, SD-03, SD-04 (in spec-debt.md) |
| Spec gaps | 14 | All resolved (v0.8.1-alpha) |
| Spec parts not started | 3 | Fleet, Execution, Meta-Governance |
| Spec parts partial | 9 | See matrix above |
| Missing hooks | 7 | 53% coverage, 80%+ target |
| Underspecified areas | 3 | Fleet protocol, Brain graduation, Cross-platform hooks |
| **Total items requiring resolution** | **16** | 3 debt + 3 not-started parts + 7 missing hooks + 3 underspec proposals |
