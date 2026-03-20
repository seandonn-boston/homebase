# SD-03: Spec Amendment Proposals

> For each divergence found in SD-06 and each active debt item, propose a formal spec amendment or implementation fix.
>
> **Last updated:** 2026-03-20

---

## Amendment 1: Token Budget 80% Warning Threshold

**Source:** SD-06 constants audit — divergent implementation
**Spec reference:** `reference-constants.md` § Token Budget Alert Thresholds
**Current state:** Only >=90% escalation implemented. Spec requires both >=90% and >=80%.

### Proposed Change (Implementation)

Add 80% warning check to `.hooks/token_budget_tracker.sh`:

```bash
# After the existing >=90% check, add:
elif [ "$UTIL_PCT" -ge 80 ]; then
  REMAINING=$((TOKEN_BUDGET - NEW_TOTAL))
  ALERT="BUDGET CAUTION: ${UTIL_PCT}% used. ${REMAINING} tokens remaining."
fi
```

**Impact:** Low risk. Advisory only (exit 0). Adds early warning before the 90% escalation.

---

## Amendment 2: Session State Computed Fields Documentation

**Source:** SD-06 constants audit — divergent schema
**Spec reference:** `reference-constants.md` § Session State Persistence
**Current state:** Spec lists `total_capacity` and `current_utilization` as persisted fields. Implementation computes them on-the-fly.

### Proposed Change (Spec)

Amend `reference-constants.md` to distinguish persisted vs. computed fields:

```markdown
### Persisted Fields
session_id, started_at, tokens_used, token_budget, tool_call_count, hook_state, context

### Computed Fields (not persisted)
- `current_utilization`: Computed as `tokens_used / token_budget` when needed
- `total_capacity`: Alias for `token_budget` — redundant, not persisted separately
```

**Impact:** Documentation only. No implementation change needed.

---

## Amendment 3: Configurable Health Check Frequency

**Source:** SD-06 constants audit — hardcoded constant
**Spec reference:** `reference-constants.md` § Context Health Check Invocation Frequency
**Current state:** Spec says "configurable, default: 10". Implementation hardcodes `% 10`.

### Proposed Change (Implementation)

Read frequency from `config.json`:

```bash
HEALTH_CHECK_INTERVAL=$(jq -r '.hooks.healthCheckInterval // 10' "$CONFIG_FILE" 2>/dev/null) || HEALTH_CHECK_INTERVAL=10
if [ $((TOOL_CALL_COUNT % HEALTH_CHECK_INTERVAL)) -eq 0 ]; then
```

Add to `admiral/config.json`:
```json
"healthCheckInterval": 10
```

**Impact:** Low risk. Default behavior unchanged. Enables tuning for different project sizes.

---

## Amendment 4: Benchmark Empirical Qualification (SD-02)

**Source:** `spec-debt.md` SD-02 — benchmark targets lack empirical basis
**Spec reference:** `reference/benchmarks.md`
**Current state:** Targets presented as firm numbers without empirical validation.

### Proposed Change (Spec)

Add qualification header to `benchmarks.md`:

```markdown
> **Validation status:** All targets below are informed estimates based on industry
> patterns and case study analysis. No Admiral-governed fleet has produced empirical
> measurements. The "Validated" column will be populated as real-world data becomes
> available. Targets may be adjusted based on empirical evidence.
```

Mark each target row with validation status: `Estimated | Validated | Adjusted`.

**Impact:** Honesty improvement. No implementation change.

---

## Amendment 5: Data Ecosystem Worked Examples (SD-05)

**Source:** `spec-debt.md` SD-05 — Part 12 is thinnest doctrine part
**Spec reference:** `admiral/spec/part12-data-ecosystem.md`
**Current state:** Well-specified conceptually. Dataset schemas added in v0.8.1. No reference implementations for feedback loops.

### Proposed Change (Spec + Implementation)

1. Add a worked example showing one complete feedback loop (Execution → Brain → Decision) with concrete data records
2. Create a minimal reference script demonstrating the feedback loop data flow
3. Add a "Implementation Status" section to Part 12 acknowledging which components are spec-only vs. implemented

**Impact:** Moderate effort. Reduces the gap between specification and reality for the most abstract part of the doctrine.

---

## Amendment 6: Protocol Registry Guard Hook (SD-06)

**Source:** `spec-debt.md` SD-06 — SO-16 lacks hook enforcement
**Spec reference:** Standing Order SO-16 (Protocol Governance)
**Current state:** MCP server vetting is advisory only. No hook validates MCP tool calls against an approved registry.

### Proposed Change (Implementation)

Create `protocol_registry_guard` PreToolUse hook:

1. Maintain approved MCP server list in `admiral/config.json` under `approvedMcpServers`
2. On PreToolUse, check if the tool call targets an MCP server
3. If server not in approved list, emit advisory warning (exit 0, never block)
4. Track unapproved server usage in session state

**Impact:** Increases enforcement coverage from 8/16 to 9/16 SOs. Follows advisory-only pattern.

---

## Priority Order

| Amendment | Effort | Impact | Priority |
|-----------|--------|--------|----------|
| 1: 80% budget warning | Low | Low | P1 — simple fix |
| 3: Configurable health check | Low | Low | P2 — consistency |
| 2: Computed fields docs | Trivial | Low | P3 — documentation |
| 4: Benchmark qualification | Trivial | Moderate | P3 — honesty |
| 6: Protocol registry guard | Moderate | Moderate | P4 — new hook |
| 5: Data ecosystem examples | High | Moderate | P5 — largest effort |
