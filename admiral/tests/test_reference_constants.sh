#!/bin/bash
# Admiral Framework — Reference Constants Registry Tests
# Validates the registry loads correctly and constants match spec values.
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADMIRAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REGISTRY="$ADMIRAL_DIR/config/reference_constants.sh"

PASS=0
FAIL=0
ERRORS=""

assert_eq() {
  local test_name="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" = "$expected" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $test_name — expected '$expected', got '$actual'\n"
    echo "  [FAIL] $test_name (expected '$expected', got '$actual')"
  fi
}

assert_contains() {
  local test_name="$1"
  local output="$2"
  local expected="$3"
  if echo "$output" | grep -q "$expected"; then
    PASS=$((PASS + 1))
    echo "  [PASS] $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $test_name — expected '$expected' in output\n"
    echo "  [FAIL] $test_name"
  fi
}

# ============================================================
echo "=== Prerequisite Checks ==="

if [ ! -f "$REGISTRY" ]; then
  echo "  [SKIP] Registry not found at $REGISTRY"
  exit 1
fi
echo "  Registry found."
echo ""

# ============================================================
echo "=== Registry Loads Without Errors ==="

rc=0
# shellcheck source=/dev/null
source "$REGISTRY" 2>&1 || rc=$?
assert_eq "Registry sources without error" "0" "$rc"
echo ""

# ============================================================
echo "=== Tool Token Estimation Constants ==="

assert_eq "TOOL_TOKENS_BASH" "500" "$TOOL_TOKENS_BASH"
assert_eq "TOOL_TOKENS_READ" "1000" "$TOOL_TOKENS_READ"
assert_eq "TOOL_TOKENS_WRITE" "800" "$TOOL_TOKENS_WRITE"
assert_eq "TOOL_TOKENS_EDIT" "600" "$TOOL_TOKENS_EDIT"
assert_eq "TOOL_TOKENS_GLOB" "300" "$TOOL_TOKENS_GLOB"
assert_eq "TOOL_TOKENS_GREP" "500" "$TOOL_TOKENS_GREP"
assert_eq "TOOL_TOKENS_AGENT" "5000" "$TOOL_TOKENS_AGENT"
assert_eq "TOOL_TOKENS_DEFAULT" "500" "$TOOL_TOKENS_DEFAULT"
echo ""

# ============================================================
echo "=== Context Budget Validation Constants ==="

assert_eq "CONTEXT_STANDING_MIN_PCT" "15" "$CONTEXT_STANDING_MIN_PCT"
assert_eq "CONTEXT_STANDING_MAX_PCT" "25" "$CONTEXT_STANDING_MAX_PCT"
assert_eq "CONTEXT_SESSION_MIN_PCT" "50" "$CONTEXT_SESSION_MIN_PCT"
assert_eq "CONTEXT_SESSION_MAX_PCT" "65" "$CONTEXT_SESSION_MAX_PCT"
assert_eq "CONTEXT_WORKING_MIN_PCT" "20" "$CONTEXT_WORKING_MIN_PCT"
assert_eq "CONTEXT_WORKING_MAX_PCT" "30" "$CONTEXT_WORKING_MAX_PCT"
assert_eq "CONTEXT_ALLOCATION_SUM" "100" "$CONTEXT_ALLOCATION_SUM"
echo ""

# ============================================================
echo "=== Token Budget Alert Thresholds ==="

assert_eq "TOKEN_ALERT_ESCALATION_PCT" "90" "$TOKEN_ALERT_ESCALATION_PCT"
assert_eq "TOKEN_ALERT_WARNING_PCT" "80" "$TOKEN_ALERT_WARNING_PCT"
echo ""

# ============================================================
echo "=== Loop Detection Thresholds ==="

assert_eq "LOOP_MAX_SAME_ERROR" "3" "$LOOP_MAX_SAME_ERROR"
assert_eq "LOOP_MAX_TOTAL_ERRORS" "10" "$LOOP_MAX_TOTAL_ERRORS"
assert_eq "LOOP_SUCCESS_DECAY" "1" "$LOOP_SUCCESS_DECAY"
echo ""

# ============================================================
echo "=== Self-Healing Constants ==="

assert_eq "SELF_HEAL_MAX_RETRIES" "3" "$SELF_HEAL_MAX_RETRIES"
assert_eq "SELF_HEAL_MAX_SESSION_RETRIES" "10" "$SELF_HEAL_MAX_SESSION_RETRIES"
echo ""

# ============================================================
echo "=== Exit Code Conventions ==="

assert_eq "EXIT_PASS" "0" "$EXIT_PASS"
assert_eq "EXIT_FAIL_SOFT" "1" "$EXIT_FAIL_SOFT"
assert_eq "EXIT_BLOCK_HARD" "2" "$EXIT_BLOCK_HARD"
echo ""

# ============================================================
echo "=== Fleet and Work Constants ==="

assert_eq "FLEET_MIN_AGENTS" "1" "$FLEET_MIN_AGENTS"
assert_eq "FLEET_MAX_AGENTS" "12" "$FLEET_MAX_AGENTS"
assert_eq "CHUNK_BUDGET_CEILING_PCT" "40" "$CHUNK_BUDGET_CEILING_PCT"
assert_eq "STANDING_CONTEXT_MAX_LINES" "150" "$STANDING_CONTEXT_MAX_LINES"
echo ""

# ============================================================
echo "=== Hook Timeout Defaults ==="

assert_eq "HOOK_TIMEOUT_DEFAULT_MS" "30000" "$HOOK_TIMEOUT_DEFAULT_MS"
assert_eq "HOOK_TIMEOUT_LOOP_DETECTOR_MS" "5000" "$HOOK_TIMEOUT_LOOP_DETECTOR_MS"
assert_eq "HOOK_TIMEOUT_MIN_MS" "100" "$HOOK_TIMEOUT_MIN_MS"
assert_eq "HOOK_TIMEOUT_MAX_MS" "300000" "$HOOK_TIMEOUT_MAX_MS"
echo ""

# ============================================================
echo "=== Governance Heartbeat ==="

assert_eq "HEARTBEAT_DEFAULT_INTERVAL_S" "60" "$HEARTBEAT_DEFAULT_INTERVAL_S"
assert_eq "HEARTBEAT_MISSED_THRESHOLD" "2" "$HEARTBEAT_MISSED_THRESHOLD"
assert_eq "HEARTBEAT_CONFIDENCE_FLOOR" "0.5" "$HEARTBEAT_CONFIDENCE_FLOOR"
echo ""

# ============================================================
echo "=== Brain Configuration ==="

assert_eq "BRAIN_QUERY_DEFAULT_LIMIT" "10" "$BRAIN_QUERY_DEFAULT_LIMIT"
assert_eq "BRAIN_QUERY_MAX_LIMIT" "50" "$BRAIN_QUERY_MAX_LIMIT"
assert_eq "BRAIN_COSINE_MIN_SCORE" "0.7" "$BRAIN_COSINE_MIN_SCORE"
assert_eq "BRAIN_DECAY_AWARENESS_DAYS" "90" "$BRAIN_DECAY_AWARENESS_DAYS"
assert_eq "BRAIN_B2_PERFORMANCE_LIMIT" "10000" "$BRAIN_B2_PERFORMANCE_LIMIT"
echo ""

# ============================================================
echo "=== Decision Authority Defaults ==="

assert_eq "DA_TOKEN_BUDGET" "ENFORCED" "$DA_TOKEN_BUDGET"
assert_eq "DA_SECURITY_DECISIONS" "ESCALATE" "$DA_SECURITY_DECISIONS"
assert_eq "DA_CODE_PATTERN_VIOLATIONS" "AUTONOMOUS" "$DA_CODE_PATTERN_VIOLATIONS"
assert_eq "DA_ARCHITECTURE_CHANGES" "PROPOSE" "$DA_ARCHITECTURE_CHANGES"
echo ""

# ============================================================
echo "=== Spec-Gap Resolved Constants ==="

assert_eq "STANDING_CONTEXT_CEILING_TOKENS" "50000" "$STANDING_CONTEXT_CEILING_TOKENS"
assert_eq "TRUST_CONSECUTIVE_SUCCESS" "5" "$TRUST_CONSECUTIVE_SUCCESS"
assert_eq "CONTEXT_HONESTY_MIN_CONFIDENCE_PCT" "80" "$CONTEXT_HONESTY_MIN_CONFIDENCE_PCT"
assert_eq "DRIFT_FINDING_DECLINE_PCT" "30" "$DRIFT_FINDING_DECLINE_PCT"
echo ""

# ============================================================
echo "=== Registry Self-List Mode ==="

rc=0
output=$(bash "$REGISTRY" 2>&1) || rc=$?
assert_eq "Self-list exits 0" "0" "$rc"
assert_contains "Self-list shows total count" "$output" "Total constants"
assert_contains "Self-list shows header" "$output" "Reference Constants Registry"
echo ""

# ============================================================
echo "=== Constant Count Sanity Check ==="

# Count lines matching VAR=value pattern
count=$(grep -cE '^[A-Z_]+=' "$REGISTRY" | head -1)
if [ "$count" -ge 100 ]; then
  PASS=$((PASS + 1))
  echo "  [PASS] Registry has $count constants (>=100 expected)"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] Registry has only $count constants (expected >=100)\n"
  echo "  [FAIL] Registry has only $count constants (expected >=100)"
fi
echo ""

# ============================================================
echo "========================================="
echo "Reference Constants Tests: $PASS passed, $FAIL failed"
echo "========================================="

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
fi
