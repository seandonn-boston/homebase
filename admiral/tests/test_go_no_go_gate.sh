#!/bin/bash
# Tests for go_no_go_gate (ST-03)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADMIRAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
GATE="$ADMIRAL_DIR/bin/go_no_go_gate"
PASS=0
FAIL=0
TOTAL=0

assert_exit() {
  local desc="$1" expected="$2" actual="$3"
  TOTAL=$((TOTAL + 1))
  if [ "$actual" -eq "$expected" ]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    echo "FAIL: $desc (expected exit $expected, got $actual)"
  fi
}

assert_contains() {
  local desc="$1" output="$2" expected="$3"
  TOTAL=$((TOTAL + 1))
  if echo "$output" | grep -q "$expected"; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    echo "FAIL: $desc (expected output to contain '$expected')"
  fi
}

# Setup temp project
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

PROJECT="$TMPDIR/project"
mkdir -p "$PROJECT/.github/workflows" "$PROJECT/tests" "$PROJECT/admiral"
echo "name: ci" > "$PROJECT/.github/workflows/ci.yml"
touch "$PROJECT/tests/test_example.sh"
touch "$PROJECT/CONTRIBUTING.md"
touch "$PROJECT/.shellcheckrc"

# Create valid ground truth
cat > "$TMPDIR/gt-valid.json" <<'GTEOF'
{
  "schema_version": "1.0.0",
  "project": {"name": "test", "last_updated": "2026-01-01", "phase": "greenfield"},
  "mission": {"identity": "A test project", "success_state": "Tests pass", "stakeholders": "Dev team", "phase": "greenfield", "pipeline_entry": "Implementation"},
  "boundaries": {
    "non_goals": {"functional": ["none"], "quality": ["none"], "architectural": ["none"]},
    "hard_constraints": {"tech_stack": ["bash 5.2", "jq 1.7"]},
    "resource_budgets": {"token_budget": "100k", "time_budget": "1h", "tool_call_limits": "50", "scope_boundary": ["src/"], "quality_floor": "80%"},
    "llm_last": {"deterministic": ["linting"], "llm_judgment": ["architecture"]}
  },
  "success_criteria": {"functional": ["works"], "quality": ["clean"], "completeness": ["done"], "negative": ["no bugs"], "failure_handling": "escalate"},
  "ground_truth": {
    "domain_ontology": {"naming_conventions": "snake_case"},
    "environment": {"tech_stack": ["bash 5.2"], "infrastructure": "local"},
    "configuration": {"agents_md": "AGENTS.md"}
  }
}
GTEOF

# Create invalid ground truth (missing fields)
cat > "$TMPDIR/gt-invalid.json" <<'GTEOF'
{
  "schema_version": "1.0.0",
  "project": {"name": "", "last_updated": "2026-01-01", "phase": "greenfield"}
}
GTEOF

# ============================================================
# Test 1: No args shows usage
rc=0
"$GATE" 2>&1 || rc=$?
assert_exit "no args shows usage" 1 "$rc"

# Test 2: Invalid profile rejected
rc=0
out=$("$GATE" --profile=invalid "$PROJECT" "$TMPDIR/gt-valid.json" 2>&1) || rc=$?
assert_exit "invalid profile rejected" 1 "$rc"
assert_contains "invalid profile error msg" "$out" "Invalid profile"

# Test 3: Ready project + starter = Go
rc=0
out=$("$GATE" --profile=starter "$PROJECT" "$TMPDIR/gt-valid.json" 2>&1) || rc=$?
assert_exit "ready + starter = go" 0 "$rc"
assert_contains "go decision shown" "$out" "GO"

# Test 4: Ready project + production = Go
rc=0
out=$("$GATE" --profile=production "$PROJECT" "$TMPDIR/gt-valid.json" 2>&1) || rc=$?
assert_exit "ready + production = go" 0 "$rc"

# Test 5: Not Ready project + any profile = No-Go
rc=0
out=$("$GATE" --profile=starter "$PROJECT" "$TMPDIR/gt-invalid.json" 2>&1) || rc=$?
assert_exit "not ready = no-go" 1 "$rc"
assert_contains "no-go decision shown" "$out" "NO-GO"

# Test 6: Not Ready + override = Go
rc=0
out=$("$GATE" --profile=starter --admiral-override="Testing override" "$PROJECT" "$TMPDIR/gt-invalid.json" 2>&1) || rc=$?
assert_exit "not ready + override = go" 0 "$rc"
assert_contains "override shown" "$out" "OVERRIDE"

# Test 7: Override creates log entry
OVERRIDE_LOG_PATH="$ADMIRAL_DIR/strategy/override_log.jsonl"
if [ -f "$OVERRIDE_LOG_PATH" ]; then
  TOTAL=$((TOTAL + 1))
  last_line=$(tail -1 "$OVERRIDE_LOG_PATH")
  if echo "$last_line" | jq -e '.event == "admiral_override"' >/dev/null 2>&1; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    echo "FAIL: override log entry not valid JSON with correct event type"
    echo "  Last line: $last_line"
  fi
  # Cleanup
  rm -f "$OVERRIDE_LOG_PATH"
  rmdir "$ADMIRAL_DIR/strategy" 2>/dev/null || true
else
  TOTAL=$((TOTAL + 1))
  FAIL=$((FAIL + 1))
  echo "FAIL: override log file not created at $OVERRIDE_LOG_PATH"
  # Check if it ended up somewhere else
  find "$ADMIRAL_DIR" -name "override_log.jsonl" 2>/dev/null
fi

# Test 8: JSON mode output
rc=0
out=$("$GATE" --json --profile=starter "$PROJECT" "$TMPDIR/gt-valid.json" 2>&1) || rc=$?
assert_exit "json mode works" 0 "$rc"
assert_contains "json has decision field" "$out" '"decision"'

# Test 9: Partially Ready + team = No-Go
# Create a project with valid GT but no CI/tests/linter (partially ready)
PARTIAL_PROJECT="$TMPDIR/partial"
mkdir -p "$PARTIAL_PROJECT"
rc=0
out=$("$GATE" --profile=team "$PARTIAL_PROJECT" "$TMPDIR/gt-valid.json" 2>&1) || rc=$?
assert_exit "partially ready + team = no-go" 1 "$rc"

# Test 10: Partially Ready + starter = Go
rc=0
out=$("$GATE" --profile=starter "$PARTIAL_PROJECT" "$TMPDIR/gt-valid.json" 2>&1) || rc=$?
assert_exit "partially ready + starter = go" 0 "$rc"

# Test 11: Case-insensitive profile
rc=0
out=$("$GATE" --profile=STARTER "$PROJECT" "$TMPDIR/gt-valid.json" 2>&1) || rc=$?
assert_exit "case-insensitive profile" 0 "$rc"

# ============================================================
echo ""
echo "=== go_no_go_gate tests: $PASS/$TOTAL passed ==="
if [ "$FAIL" -gt 0 ]; then
  echo "$FAIL test(s) FAILED"
  exit 1
fi
exit 0
