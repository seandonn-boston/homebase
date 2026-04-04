#!/bin/bash
# Admiral Framework — EDD Gate Validator Tests (EDD-02)
# Tests for admiral/bin/edd_gate
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

# Use a temp directory for test specs
TEST_DIR=$(mktemp -d)
trap 'rm -rf "$TEST_DIR"' EXIT

# Override specs directory
export EDD_SPECS_DIR="$TEST_DIR/edd-specs"
mkdir -p "$EDD_SPECS_DIR"

GATE="$PROJECT_DIR/admiral/bin/edd_gate"

PASS=0
FAIL=0
ERRORS=""

assert_eq() {
  local test_name="$1"
  local expected="$2"
  local actual="$3"
  if [ "$expected" = "$actual" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $test_name — expected '$expected', got '$actual'\n"
    echo "  [FAIL] $test_name — expected '$expected', got '$actual'"
  fi
}

assert_exit() {
  local test_name="$1"
  local expected_exit="$2"
  shift 2
  local rc=0
  "$@" >/dev/null 2>&1 || rc=$?
  if [ "$rc" -eq "$expected_exit" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $test_name — expected exit $expected_exit, got $rc\n"
    echo "  [FAIL] $test_name — expected exit $expected_exit, got $rc"
  fi
}

echo "=== EDD Gate Validator Tests (EDD-02) ==="
echo ""

# ─── No arguments ───────────────────────────────────────────────────

echo "--- Usage errors ---"

assert_exit "no arguments exits 2" 2 bash "$GATE"

# ─── Missing spec ───────────────────────────────────────────────────

echo ""
echo "--- Missing spec ---"

assert_exit "missing spec exits 2" 2 bash "$GATE" "NONEXISTENT-99"

MISSING_JSON=$(bash "$GATE" "NONEXISTENT-99" --json 2>/dev/null) || true
MISSING_VERDICT=$(printf '%s' "$MISSING_JSON" | jq -r '.verdict' 2>/dev/null) || MISSING_VERDICT=""
assert_eq "missing spec JSON verdict is error" "error" "$MISSING_VERDICT"

# ─── All deterministic pass ─────────────────────────────────────────

echo ""
echo "--- All deterministic pass ---"

cat > "$EDD_SPECS_DIR/pass_01.eval.json" << 'EOF'
{
  "task_id": "PASS-01",
  "version": "1",
  "deterministic": [
    {"name": "true exits 0", "command": "true", "expected_exit": 0},
    {"name": "echo works", "command": "echo hello", "expected_exit": 0}
  ]
}
EOF

assert_exit "all pass exits 0" 0 bash "$GATE" "PASS-01" --confirm-probabilistic

PASS_JSON=$(bash "$GATE" "PASS-01" --json --confirm-probabilistic 2>/dev/null) || true
PASS_VERDICT=$(printf '%s' "$PASS_JSON" | jq -r '.verdict' 2>/dev/null) || PASS_VERDICT=""
assert_eq "all pass JSON verdict" "pass" "$PASS_VERDICT"

PASS_DET=$(printf '%s' "$PASS_JSON" | jq '.deterministic.passed' 2>/dev/null) || PASS_DET="0"
assert_eq "all pass deterministic count" "2" "$PASS_DET"

# ─── Deterministic failure ──────────────────────────────────────────

echo ""
echo "--- Deterministic failure ---"

cat > "$EDD_SPECS_DIR/fail_01.eval.json" << 'EOF'
{
  "task_id": "FAIL-01",
  "version": "1",
  "deterministic": [
    {"name": "true passes", "command": "true", "expected_exit": 0},
    {"name": "false fails", "command": "false", "expected_exit": 0}
  ]
}
EOF

assert_exit "deterministic failure exits 1" 1 bash "$GATE" "FAIL-01"

FAIL_JSON=$(bash "$GATE" "FAIL-01" --json 2>/dev/null) || true
FAIL_VERDICT=$(printf '%s' "$FAIL_JSON" | jq -r '.verdict' 2>/dev/null) || FAIL_VERDICT=""
assert_eq "failure JSON verdict" "fail" "$FAIL_VERDICT"

FAIL_DET_FAILED=$(printf '%s' "$FAIL_JSON" | jq '.deterministic.failed' 2>/dev/null) || FAIL_DET_FAILED="0"
assert_eq "failure deterministic.failed count" "1" "$FAIL_DET_FAILED"

# ─── Expected non-zero exit ─────────────────────────────────────────

echo ""
echo "--- Expected non-zero exit ---"

cat > "$EDD_SPECS_DIR/nonzero_01.eval.json" << 'EOF'
{
  "task_id": "NONZERO-01",
  "version": "1",
  "deterministic": [
    {"name": "false with expected 1", "command": "false", "expected_exit": 1}
  ]
}
EOF

assert_exit "expected non-zero exit passes" 0 bash "$GATE" "NONZERO-01" --confirm-probabilistic

# ─── Probabilistic pending ──────────────────────────────────────────

echo ""
echo "--- Probabilistic pending ---"

cat > "$EDD_SPECS_DIR/prob_01.eval.json" << 'EOF'
{
  "task_id": "PROB-01",
  "version": "1",
  "deterministic": [
    {"name": "true", "command": "true", "expected_exit": 0}
  ],
  "probabilistic": [
    {"name": "looks right", "description": "Output looks correct", "verification_method": "agent_review"}
  ]
}
EOF

# Without --confirm-probabilistic, should fail (pending)
assert_exit "probabilistic pending exits 1" 1 bash "$GATE" "PROB-01"

# With --confirm-probabilistic, should pass
assert_exit "probabilistic confirmed exits 0" 0 bash "$GATE" "PROB-01" --confirm-probabilistic

PROB_JSON=$(bash "$GATE" "PROB-01" --json 2>/dev/null) || true
PROB_PENDING=$(printf '%s' "$PROB_JSON" | jq '.probabilistic.pending' 2>/dev/null) || PROB_PENDING="0"
assert_eq "probabilistic pending count" "1" "$PROB_PENDING"

# ─── JSON output structure ──────────────────────────────────────────

echo ""
echo "--- JSON output structure ---"

STRUCT_JSON=$(bash "$GATE" "PASS-01" --json --confirm-probabilistic 2>/dev/null) || true

HAS_TASK_ID=$(printf '%s' "$STRUCT_JSON" | jq 'has("task_id")' 2>/dev/null) || HAS_TASK_ID="false"
assert_eq "JSON has task_id" "true" "$HAS_TASK_ID"

HAS_TS=$(printf '%s' "$STRUCT_JSON" | jq 'has("timestamp")' 2>/dev/null) || HAS_TS="false"
assert_eq "JSON has timestamp" "true" "$HAS_TS"

HAS_DET=$(printf '%s' "$STRUCT_JSON" | jq 'has("deterministic")' 2>/dev/null) || HAS_DET="false"
assert_eq "JSON has deterministic" "true" "$HAS_DET"

HAS_CI=$(printf '%s' "$STRUCT_JSON" | jq 'has("ci_status")' 2>/dev/null) || HAS_CI="false"
assert_eq "JSON has ci_status" "true" "$HAS_CI"

# ─── Summary ─────────────────────────────────────────────────────────

echo ""
echo "=== Results ==="
echo "  Passed: $PASS"
echo "  Failed: $FAIL"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  printf '%b' "$ERRORS"
  exit 1
fi

echo "  All tests passed."
exit 0
