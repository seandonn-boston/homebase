# SD-13 through SD-15: Operational Resilience

> **Last updated:** 2026-03-20

---

## SD-13: Failure Mode Analysis

### Hook Chain Failure Modes

| Failure Mode | Impact | Current Mitigation | Gap |
|-------------|--------|-------------------|-----|
| Hook script not found | Hook silently skipped | `-x` check before execution | No logging of skipped hooks |
| Hook timeout | Exit code forced to 1 | Per-hook timeout_ms | No retry — timeout = permanent skip |
| State file corruption | Session state lost | JSON parse failure caught | No backup/recovery mechanism |
| Config file missing | Defaults used | `// default` fallback in jq | No warning emitted |
| Adapter stdin malformed | Hook receives empty payload | `jq -r` fails gracefully | No structured error reporting |
| All hooks fail simultaneously | Agent receives no advisory context | Each hook independent | No "all hooks failed" aggregate alert |

### Risk Matrix

| Failure Mode | Likelihood | Impact | Risk |
|-------------|-----------|--------|------|
| Hook script not found | Low | Low | Low — hooks verified at dev time |
| Hook timeout | Low | Low | Low — 5-30s timeouts are generous |
| State file corruption | Medium | Medium | **Medium** — no recovery path |
| Config file missing | Low | Low | Low — defaults are safe |
| Adapter stdin malformed | Low | Medium | Low — platform controls format |
| All hooks fail | Very Low | High | Low — probability mitigates impact |

### Recommendations

1. **State file backup:** Before writing state, copy current state to `.admiral/session_state.json.bak`. On read failure, attempt recovery from backup.
2. **Skipped hook logging:** When a hook is skipped (not found, not executable), log to stderr so the adapter can report it.
3. **Config validation at session start:** Validate `config.json` structure during `session_start_adapter.sh`. Emit warning for missing or malformed config.

---

## SD-14: Graceful Degradation Paths

### Principle

Every component must degrade gracefully: no hook failure should block the agent from working. This is already the design philosophy (advisory-only, fail-open), but the degradation paths should be explicit.

### Degradation Table

| Component | Healthy | Degraded | Failed | Agent Impact |
|-----------|---------|----------|--------|-------------|
| token_budget_tracker | Tracks usage, emits warnings | State read fails — tracks from zero | Script crashes — no tracking | None — agent works without budget awareness |
| loop_detector | Detects error loops | State read fails — no history | Script crashes — no detection | None — agent may loop longer before self-correcting |
| context_health_check | Validates critical sections | Missing sections not detected | Script crashes — no checks | None — context may degrade without warning |
| scope_boundary_guard | Blocks protected paths | False negative — allows access | Script crashes — no guard | **Risk** — protected paths unguarded |
| prohibitions_enforcer | Blocks prohibited patterns | False negative — allows pattern | Script crashes — no enforcement | **Risk** — prohibited actions unblocked |
| session_start_adapter | Injects Standing Orders | Partial injection | Script crashes — no injection | **Moderate** — agent lacks Standing Orders context |
| config.json | All hooks read config | Missing — defaults used | Malformed — jq fails | Low — defaults are conservative |
| state.sh | State functions available | Functions fail — hooks skip state | File missing — hooks crash | Medium — all stateful hooks affected |

### Critical Path

The only components whose failure creates real risk are the **PreToolUse enforcement hooks** (`scope_boundary_guard`, `prohibitions_enforcer`). These are the only hooks that can hard-block (exit 2). If they fail silently, protected boundaries are unguarded.

**Mitigation:** The adapter should verify that enforcement hooks executed successfully. If an enforcement hook fails to run (not found, timeout), the adapter should emit a warning rather than silently passing.

---

## SD-15: Recovery Procedures

### Procedure 1: Corrupted Session State

**Symptom:** Hooks emit JSON parse errors. Token counts wrong. Loop detector has stale data.

**Recovery:**
1. Delete `.admiral/session_state.json`
2. Session start adapter will reinitialize with clean state
3. Token counts reset to zero (acceptable — advisory only)
4. Loop detector history lost (acceptable — fresh session)

### Procedure 2: Hook Script Errors After Update

**Symptom:** Hooks exit with unexpected codes. ShellCheck CI fails. Adapter produces wrong output.

**Recovery:**
1. Run `shellcheck -s bash -S warning .hooks/*.sh` locally
2. Fix reported issues
3. Run `.hooks/tests/run_hook_tests.sh` to verify behavior
4. Commit and push

### Procedure 3: Config Drift from Spec

**Symptom:** Constants audit (SD-06) reports divergences. Hooks use wrong thresholds.

**Recovery:**
1. Run compliance tests (SD-08) to identify all divergences
2. For each divergence, determine if spec or implementation is correct
3. File amendment proposal (SD-03) for spec changes
4. Fix implementation for implementation errors
5. Update version tracking manifest (SD-07)

### Procedure 4: Standing Orders Not Loading

**Symptom:** Agent behaves as if unaware of Standing Orders. No budget warnings. No scope enforcement.

**Recovery:**
1. Verify `.claude/settings.local.json` has SessionStart hook configured
2. Verify `session_start_adapter.sh` is executable
3. Run `bash .hooks/session_start_adapter.sh < /dev/null` to test
4. Check stderr for errors
5. Verify `admiral/lib/standing_orders.sh` produces output

### Procedure 5: CI Pipeline Failures

**Symptom:** ShellCheck or control-plane tests fail in CI but pass locally.

**Recovery:**
1. Check CI runner environment (Node.js version, bash version)
2. Ensure `npm install` runs before `npm run build` in CI
3. Ensure `dist/` is rebuilt from current source before testing
4. For ShellCheck: CI uses `-S warning` (warnings are errors). Fix all warnings.
