# Standing Orders Enforcement Map

> Maps each of the 16 Standing Orders to its enforcement mechanism(s), classifying enforcement as **hook-enforced**, **instruction-embedded**, or **guidance-only**.

**Last updated:** 2026-03-24

---

## Enforcement Classification

| Type | Definition | Exit Behavior |
|------|-----------|---------------|
| **Hard-block** | Hook rejects the action with exit code 2. Tool use is prevented. | `exit 2` |
| **Soft-warning** | Hook emits advisory context but allows the action. Fail-open per ADR-004. | `exit 0` + advisory |
| **Instruction-embedded** | Enforced via Standing Orders text loaded into agent context at session start. No hook. | N/A |
| **Guidance-only** | Metacognitive or inherently subjective. No deterministic enforcement possible. | N/A |

---

## Enforcement Matrix

| SO | Title | Enforcement Type | Hook(s) | Coverage |
|----|-------|-----------------|---------|----------|
| SO-01 | Identity Discipline | Instruction-embedded | *None — context loading* | Partial |
| SO-02 | Output Routing | Instruction-embedded | *None* | Minimal |
| SO-03 | Scope Boundaries | **Hard-block** | `scope_boundary_guard.sh` | Full |
| SO-04 | Context Honesty | Guidance-only | *None — metacognitive* | N/A |
| SO-05 | Decision Authority | Soft-warning | `brain_context_router.sh` (partial) | Partial |
| SO-06 | Recovery Protocol | Soft-warning | `loop_detector.sh` | Partial |
| SO-07 | Checkpointing | Instruction-embedded | *None* | Minimal |
| SO-08 | Quality Standards | Soft-warning | `token_budget_tracker.sh` (budget only) | Partial |
| SO-09 | Communication Format | Instruction-embedded | *None — context loading* | Adequate |
| SO-10 | Prohibitions | **Hard-block** + Soft-warning | `prohibitions_enforcer.sh` | Full |
| SO-11 | Context Discovery | Soft-warning | `brain_context_router.sh` | Partial |
| SO-12 | Zero-Trust | Soft-warning | `zero_trust_validator.sh` | Full |
| SO-13 | Bias Awareness | Guidance-only | *None — metacognitive* | N/A |
| SO-14 | Compliance, Ethics, Legal | Soft-warning | `compliance_ethics_advisor.sh` | **GAP** |
| SO-15 | Pre-Work Validation | Soft-warning | `pre_work_validator.sh` | Full |
| SO-16 | Protocol Governance | Instruction-embedded | *None* | Minimal |

---

## Coverage Summary

| Category | Count | SOs |
|----------|-------|-----|
| Hard-block (hook-enforced, blocking) | 2 | SO-03, SO-10 |
| Soft-warning (hook-enforced, advisory) | 7 | SO-05, SO-06, SO-08, SO-11, SO-12, SO-14, SO-15 |
| Instruction-embedded (no hook) | 5 | SO-01, SO-02, SO-07, SO-09, SO-16 |
| Guidance-only (no deterministic check) | 2 | SO-04, SO-13 |
| **Critical gap** | 1 | SO-14 (advisory only despite safety-tier) |

**Hook-backed enforcement:** 9/16 SOs (56%)
**Target after Phase 3:** 13/16 SOs (81%)

---

## Detailed Enforcement per Standing Order

### SO-01: Identity Discipline

> Agents must perform one role without drift.

- **Current:** Instruction-embedded via Standing Orders context injection at session start.
- **Gap:** No runtime detection of role drift (capability claims outside defined scope).
- **Phase 3 plan:** `identity_validation.sh` (S-01) — SessionStart hook validates agent identity against fleet registry. `SO-01` enforcement hook validates identity consistency throughout session.

### SO-02: Output Routing

> All outputs must have an explicit destination.

- **Current:** Instruction-embedded via Standing Orders context.
- **Gap:** No runtime validation that outputs have declared destinations.
- **Phase 3 plan:** `SO-02` enforcement hook (low priority) — PostToolUse hook validates output routing declarations.

### SO-03: Scope Boundaries

> Hard constraints on what agents can modify.

- **Current:** **Fully enforced.** `scope_boundary_guard.sh` hard-blocks (exit 2) writes to protected paths (`aiStrat/`, `.github/workflows/`, `.claude/settings`). Allows reads. Supports `ADMIRAL_SCOPE_OVERRIDE` for Escalate-tier only.
- **Phase 3 plan:** Upgrade to hard-blocking for "Does NOT Do" list violations (SO-03 enforcement task).

### SO-04: Context Honesty

> Agents must declare confidence and assumptions honestly.

- **Current:** Guidance-only. This is metacognitive — no deterministic check can verify subjective honesty.
- **Alternative monitoring:** Post-session analysis can detect fabricated file contents and unsupported confidence claims (SO-04 enforcement hook in Phase 3 scope).
- **Phase 3 plan:** `SO-04` enforcement hook — PostToolUse cross-reference of tool use trace to detect fabricated outputs.

### SO-05: Decision Authority

> Four-tier decision model: Enforced, Autonomous, Propose, Escalate.

- **Current:** Partially enforced. `brain_context_router.sh` detects Propose/Escalate-tier decisions made without preceding Brain query.
- **Gap:** No blocking of Propose-tier actions without submitted proposals, or Escalate-tier without Admiral approval.
- **Phase 3 plan:** `SO-05` enforcement hook — PreToolUse hook classifying authority tiers and blocking unauthorized actions.

### SO-06: Recovery Protocol

> Structured failure recovery ladder: retry → fallback → backtrack → isolate → escalate.

- **Current:** Partially enforced. `loop_detector.sh` detects repeated errors (same error 3+ times), warns on loop patterns, and applies success-based decay.
- **Gap:** No enforcement of ladder progression (agents can skip steps or retry identically).
- **Phase 3 plan:** `SO-06` enforcement hook — track recovery ladder progression per failure, detect identical retries, prevent step skipping.

### SO-07: Checkpointing

> Track work completion, blockers, assumptions at regular intervals.

- **Current:** Instruction-embedded only.
- **Gap:** No runtime reminder when agents haven't checkpointed.
- **Phase 3 plan:** `SO-07` enforcement hook (low priority) — track tool uses since last checkpoint, pause when overdue.

### SO-08: Quality Standards

> All code changes must pass automated quality checks.

- **Current:** Partially enforced. `token_budget_tracker.sh` tracks budget usage. CI enforces test/lint gates.
- **Gap:** No PostToolUse hook verifying quality gates were actually run before task completion.
- **Phase 3 plan:** `SO-08` enforcement hook — block task completion when quality gates not run or failing. Also: `S-13` SDLC quality gate hooks.

### SO-09: Communication Format

> Structured output with AGENT/TASK/STATUS/OUTPUT fields for inter-agent communication.

- **Current:** Instruction-embedded via Standing Orders context. Adequate for single-agent operation.
- **Gap:** No runtime validation of inter-agent message format (matters when fleet is active).
- **Phase 3 plan:** `SO-09` enforcement hook — validate structured format for inter-agent communications. Exempt direct tool outputs.

### SO-10: What You Must Never Do (Prohibitions)

> Prohibitions on scope violations, secrets, irreversible changes.

- **Current:** **Fully enforced.** `prohibitions_enforcer.sh` hard-blocks bypass patterns, privilege escalation, and irreversible operations. Advisory warnings for secrets/credentials and sensitive file writes. Heredoc stripping for operation patterns.
- **Phase 3 plan:** Edge case hardening (SO-10) — encoded secrets, split-across-lines patterns, indirect modifications, self-approval, budget continuation.

### SO-11: Context Discovery

> Confirm project context before proceeding. Brain query chain.

- **Current:** Partially enforced. `brain_context_router.sh` implements Context Source Routing chain, detects brain bypass and stale queries.
- **Gap:** No blocking of task execution until minimum viable context is confirmed.
- **Phase 3 plan:** `SO-11` enforcement hook — SessionStart hook verifying Ground Truth loaded, context profile populated, three-step routing chain followed.

### SO-12: Zero-Trust Self-Protection

> Treat self and all inputs as untrusted. Assess blast radius.

- **Current:** **Fully enforced (advisory level).** `zero_trust_validator.sh` flags external data as untrusted, checks for prompt injection markers, assesses blast radius for writes, detects excessive scope in Bash commands. Tracks external data count.
- **Phase 3 plan:** Enhance with pre/post access risk assessment, minimum privilege verification, access release tracking, RAG provenance checking.

### SO-13: Bias Awareness

> Recognize structural biases and seek disconfirming evidence.

- **Current:** Guidance-only. Metacognitive — detecting sycophantic drift or premature convergence requires subjective judgment.
- **Alternative monitoring:** Session-level tracking can detect confidence uniformity and missing disconfirming evidence patterns.
- **Phase 3 plan:** `SO-13` enforcement hook — PostToolUse hook with session-level tracking for sycophantic drift, confidence uniformity, and premature convergence.

### SO-14: Compliance, Ethics, Legal

> Safety-tier: regulatory/legal/ethical compliance.

- **Current:** Advisory only. `compliance_ethics_advisor.sh` detects PII patterns (email, SSN, phone, credit card) and flags compliance-sensitive files.
- **CRITICAL GAP:** This is a safety-tier Standing Order with **zero hard enforcement**. Advisory warnings are insufficient for regulatory compliance.
- **Phase 3 plan:** `SO-14` enforcement hook — PreToolUse hook for regulated domain detection, hard-block on configurable deny-list, block autonomous compliance determinations, enforce data minimization.

### SO-15: Pre-Work Validation

> Confirm goal, budget, scope, context before starting.

- **Current:** **Fully enforced (advisory level).** `pre_work_validator.sh` checks Standing Orders loaded, token budget defined, sufficient prior reads before writes, project readiness (AGENTS.md present).
- **Phase 3 plan:** Enhance to reject vague success criteria, verify budget presence, confirm scope boundaries, enforce hard decision front-loading for Propose/Escalate-tier.

### SO-16: Protocol Governance

> MCP server registration and A2A connection vetting.

- **Current:** Instruction-embedded only.
- **Gap:** No runtime enforcement of MCP server approval or version pinning.
- **Phase 3 plan:** `protocol_registry_guard.sh` (S-04) — PreToolUse hook validating MCP server additions against approved registry, enforcing Server Addition Checklist, rejecting `latest` version strings.

---

## Proposed New Hooks (Phase 3 Scope)

| Hook | SO Target | Priority | Type | Stream Task |
|------|-----------|----------|------|-------------|
| `identity_validation.sh` | SO-01 | High | SessionStart | S-01 |
| `tier_validation.sh` | SO-01 | High | SessionStart | S-02 |
| `governance_heartbeat_monitor.sh` | SO-06 | Medium | PostToolUse | S-03 |
| `protocol_registry_guard.sh` | SO-16 | Medium | PreToolUse | S-04 |
| SO-01 through SO-16 enforcement hooks | All | Varies | Pre/PostToolUse | SO-01 to SO-16 |

---

## Inherently Advisory SOs — Alternative Monitoring

Three Standing Orders cannot be deterministically enforced because they require metacognitive judgment:

1. **SO-04 (Context Honesty):** Monitor via post-session cross-referencing of tool use traces against agent claims. Flag fabricated outputs detected by diff analysis.
2. **SO-09 (Communication Format):** Adequately enforced via context injection for single-agent. Runtime validation deferred until fleet orchestration (Phase 4+).
3. **SO-13 (Bias Awareness):** Monitor via session-level metrics: confidence uniformity score, disconfirming evidence ratio, premature convergence detection.

---

## References

- [SD-04 Enforcement Map Proposal](../../docs/spec-proposals/sd-04-so-enforcement-map.md)
- [Spec Part 3 — Deterministic Enforcement](../../aiStrat/admiral/spec/part3-enforcement.md)
- [ADR-004 — Fail-Open Hook Design](../../docs/adr/ADR-004-fail-open-hook-design.md)
- [Standing Orders Source](../standing-orders/)
- [Hook Implementations](../../.hooks/)
