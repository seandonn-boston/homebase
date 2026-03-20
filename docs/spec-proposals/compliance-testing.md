# SD-08: Spec Compliance Testing

> Define tests that verify implementation conforms to spec. Complement existing hook tests with spec-alignment checks.
>
> **Last updated:** 2026-03-20

---

## Existing Test Coverage

| Test Suite | Location | Tests | Coverage |
|------------|----------|-------|----------|
| Hook integration tests | `.hooks/tests/` | 34 | Hook behavior, exit codes, state management |
| Quarantine pipeline | `admiral/monitor/quarantine/tests/` | 39 | Layers 3-5 attack detection |
| Control plane | `control-plane/src/*.test.ts` | 129 | SPC, events, server, ring buffer |

---

## Proposed Compliance Test Cases

### Category 1: Constants Conformance

Verify that implementation constants match `reference-constants.md`.

| Test ID | Description | Check |
|---------|-------------|-------|
| CC-01 | Token estimates in config.json match spec | Parse config.json, compare each tool estimate against spec values |
| CC-02 | Loop detector defaults match spec | Verify MAX_SAME_ERROR=3, MAX_TOTAL_ERRORS=10, SUCCESS_DECAY=1 |
| CC-03 | Hook timeouts match spec | Parse each hook script header for timeout_ms, compare against spec table |
| CC-04 | Exit codes follow convention | Verify no hook uses exit codes outside {0, 1, 2} |
| CC-05 | Health check frequency matches spec | Verify modulo constant equals config or default of 10 |

### Category 2: Schema Conformance

Verify that state schemas match spec definitions.

| Test ID | Description | Check |
|---------|-------------|-------|
| SC-01 | Session state has all required fields | Parse init_session_state() output, verify all spec fields present |
| SC-02 | Hook state keys are valid | Verify hook_state sub-keys match registered hook names |
| SC-03 | Context sub-object has required fields | Verify standing_context_tokens and standing_context_present exist |

### Category 3: Behavioral Conformance

Verify that hook chains behave as spec requires.

| Test ID | Description | Check |
|---------|-------------|-------|
| BC-01 | All PostToolUse hooks are advisory-only | Run each PostToolUse hook, verify exit code is always 0 |
| BC-02 | PreToolUse hard blocks use exit 2 | Trigger scope_boundary_guard and prohibitions_enforcer blocks, verify exit 2 |
| BC-03 | Token budget alerts are advisory | Exceed budget, verify exit 0 (not exit 2) |
| BC-04 | Loop detector warns but never blocks | Trigger MAX_SAME_ERROR, verify exit 0 with warning |
| BC-05 | Context health check is advisory | Trigger missing critical section, verify exit 0 with warning |
| BC-06 | Session start resets state | Call session_start_adapter, verify clean state |

### Category 4: Adapter Conformance

Verify that adapters correctly translate between platform and framework.

| Test ID | Description | Check |
|---------|-------------|-------|
| AC-01 | PreToolUse adapter reads stdin JSON | Send valid payload, verify hooks receive correct tool_name |
| AC-02 | PostToolUse adapter reads stdin JSON | Send valid payload, verify hooks receive tool_response |
| AC-03 | Session start adapter produces Standing Orders | Run adapter, verify stdout contains "Standing Orders" header |
| AC-04 | Adapter propagates worst exit code | Send multiple hook results, verify worst code wins |

---

## Implementation Plan

### Phase 1: Constants Conformance Script

Create `tests/spec-compliance/check_constants.sh`:
- Reads `reference-constants.md` (or a derived JSON)
- Compares against `admiral/config.json` and hook scripts
- Reports PASS/FAIL/SKIP per constant

### Phase 2: Schema Conformance Script

Create `tests/spec-compliance/check_schema.sh`:
- Initializes session state via `state.sh`
- Validates JSON structure against spec schema
- Reports missing or extra fields

### Phase 3: Behavioral Conformance (extend existing tests)

Add test cases to `.hooks/tests/` following existing patterns:
- Each test sends a crafted payload and checks exit code + output
- Tests are idempotent and can run in CI

---

## CI Integration

Add to `.github/workflows/shellcheck.yml` (or create `spec-compliance.yml`):

```yaml
spec-compliance:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v6
    - name: Run constants conformance
      run: bash tests/spec-compliance/check_constants.sh
    - name: Run schema conformance
      run: bash tests/spec-compliance/check_schema.sh
```

---

## Priority

1. **CC-01 through CC-05** — Cheapest to implement, highest confidence gain
2. **SC-01 through SC-03** — Schema validation catches drift early
3. **BC-01 through BC-06** — Already partially covered by existing hook tests
4. **AC-01 through AC-04** — Adapter tests are integration-level, higher cost
