# SD-04: Standing Orders Enforcement Map Completion

> For each advisory-only SO, propose a hook or document why it is inherently advisory.
>
> **Last updated:** 2026-03-20

---

## Current State

8/16 SOs have hook enforcement (50%). Target E3 is 12/16 (75%).

| SO | Status | Hook |
|----|--------|------|
| SO-01 Identity | Enforced | `identity_validation` (manifest only — no implementation) |
| SO-02 Output Routing | Advisory | — |
| SO-03 Scope Boundaries | Enforced | `scope_boundary_guard` |
| SO-04 Context Honesty | Advisory | — |
| SO-05 Decision Authority | Advisory | — |
| SO-06 Recovery Protocol | Enforced | `loop_detector` |
| SO-07 Checkpointing | Advisory | — |
| SO-08 Quality Standards | Advisory | — |
| SO-09 Communication Format | Advisory | — |
| SO-10 Prohibitions | Enforced | `prohibitions_enforcer` |
| SO-11 Context Discovery | Advisory (monitored) | `context_baseline` + `context_health_check` |
| SO-12 Zero-Trust | Enforced | `zero_trust_validator` |
| SO-13 Bias Awareness | Advisory | — |
| SO-14 Compliance/Ethics/Legal | Advisory | — |
| SO-15 Pre-Work Validation | Enforced | `pre_work_validator` |
| SO-16 Protocol Governance | Advisory | — |

**Note:** SO-01 has a manifest in spec but no implementation in `.hooks/`. SO-11 has monitoring hooks but they are advisory-only.

---

## Proposals for Advisory-Only SOs

### SO-02: Output Routing — Inherently Advisory

**Justification:** Output routing requires semantic understanding of where results should go (user, file, API, log). No deterministic check can validate routing correctness — it depends on task context.

**Alternative monitoring:** Log all output destinations per session. Post-session audit could flag anomalous patterns (e.g., writing to unexpected directories).

**Verdict:** Remains advisory. No hook proposed.

### SO-04: Context Honesty — Inherently Advisory

**Justification:** Context honesty means "flag gaps and assumptions." Whether an agent has enough context is inherently a judgment call — the same information may be sufficient for one task and insufficient for another.

**Alternative monitoring:** Track assumption frequency and accuracy over sessions. High assumption rates with low accuracy suggest context honesty failures.

**Verdict:** Remains advisory. No hook proposed.

### SO-05: Decision Authority — Propose Hook

**Proposal:** `decision_authority_gate` (PreToolUse)

**Mechanism:** Intercept actions that match Propose/Escalate-tier patterns:
- File modifications outside scope boundary → check tier assignment
- Dependency additions → check tier assignment
- Architecture changes (new directories, config files) → check tier assignment

**Implementation approach:** Maintain a decision authority config mapping action patterns to tiers. The hook checks whether the current action matches a pattern requiring Propose or Escalate tier and emits a warning. Cannot hard-block (semantic understanding needed for full enforcement).

**Classification:** Judgment-assisted monitoring hook. Covers the mechanical component.

### SO-07: Checkpointing — Propose Hook

**Proposal:** `checkpoint_monitor` (PostToolUse)

**Mechanism:** Track task boundaries (detected via state changes or explicit task markers). At each boundary, verify a checkpoint artifact exists (brain entry, commit, or structured log entry). Warn if no checkpoint detected after N tool calls.

**Implementation approach:** Count tool calls since last checkpoint. After threshold (e.g., 20 tool calls), emit "checkpoint recommended" warning.

**Classification:** Judgment-assisted monitoring hook. Checkpoint completeness requires judgment; checkpoint existence is mechanical.

### SO-08: Quality Standards — Propose Hook

**Proposal:** `quality_gate_check` (PostToolUse, on Write/Edit)

**Mechanism:** After code modifications, verify that the project's quality gates are configured and passing. Check for: test command existence in package.json, linter config existence, tsconfig existence. Warn if code was modified but quality gates are not configured.

**Implementation approach:** Lightweight check — does quality infrastructure exist? Not "do tests pass?" (that's CI's job).

**Classification:** Mechanical check for infrastructure existence. Test execution remains CI-owned.

### SO-09: Communication Format — Inherently Advisory

**Justification:** Communication format compliance (structured AGENT/TASK/STATUS fields) requires parsing natural language output. Format enforcement would require either rigid templates (kills agent flexibility) or NLP parsing (LLM-on-LLM, violates LLM-Last).

**Alternative monitoring:** Post-session log analysis could score format compliance.

**Verdict:** Remains advisory. No hook proposed.

### SO-13: Bias Awareness — Inherently Advisory

**Justification:** Bias recognition is inherently metacognitive. No deterministic check can detect whether an agent is exhibiting anchoring bias, sycophantic drift, or confirmation bias — these require introspection.

**Alternative monitoring:** Track decision reversal rates, finding severity trends (sycophantic drift detection per spec-gaps #10 — >30% session-over-session decline flags review).

**Verdict:** Remains advisory. No hook proposed.

### SO-14: Compliance/Ethics/Legal — Propose Hook

**Proposal:** `compliance_boundary_check` (PreToolUse)

**Mechanism:** Maintain a configurable deny-list of compliance-sensitive patterns:
- Operations on regulated data paths
- Actions involving PII-indicative file patterns
- Commands that could affect production systems
- License-sensitive dependency additions

**Implementation approach:** Pattern-based deny-list (mechanical). Legal/ethical judgment remains advisory. This covers the "obvious violations" while leaving nuanced cases to agent judgment.

**Classification:** Judgment-assisted. Critical safety tier — even partial enforcement is high-value.

### SO-16: Protocol Governance — Propose Hook

**Proposal:** `protocol_registry_guard` (PreToolUse)

**Mechanism:** Validate MCP server calls against an approved server registry. Block calls to unapproved servers. The manifest already exists in `aiStrat/hooks/`.

**Implementation approach:** Read approved server list from config. On MCP tool calls, check server name against list. Hard-block unapproved servers with instructions to register.

**Classification:** Mechanical for registry checks. Trust classification and security review remain advisory.

---

## E3 Target Assessment

With the proposed hooks:

| SO | Current | Proposed | E3 Status |
|----|---------|----------|-----------|
| SO-02 | Advisory | Advisory | Advisory (inherent) |
| SO-04 | Advisory | Advisory | Advisory (inherent) |
| SO-05 | Advisory | `decision_authority_gate` | Monitored |
| SO-07 | Advisory | `checkpoint_monitor` | Monitored |
| SO-08 | Advisory | `quality_gate_check` | Monitored |
| SO-09 | Advisory | Advisory | Advisory (inherent) |
| SO-13 | Advisory | Advisory | Advisory (inherent) |
| SO-14 | Advisory | `compliance_boundary_check` | Monitored |
| SO-16 | Advisory | `protocol_registry_guard` | Enforced |

**Projected E3 coverage:** 13/16 (81%) — exceeds E3 target of 12/16.

4 SOs inherently advisory: SO-02 (Output Routing), SO-04 (Context Honesty), SO-09 (Communication Format), SO-13 (Bias Awareness).
