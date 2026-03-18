#!/bin/bash
# Admiral Framework — State Persistence Integration Test
# Tests that hook state survives across simulated sessions and tool call sequences.
# Validates fail-open behavior when state is corrupt or missing.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

# Use temp dir for state to avoid polluting real state
TEST_ADMIRAL_DIR=$(mktemp -d)
export ADMIRAL_DIR="$TEST_ADMIRAL_DIR"

# Source state library
# shellcheck disable=SC1091  # path resolved at runtime via $PROJECT_DIR
source "$PROJECT_DIR/admiral/lib/state.sh"

PASS=0
FAIL=0
ERRORS=""

assert_true() {
  local test_name="$1"
  local condition="$2"
  if [ "$condition" = "true" ] || [ "$condition" = "0" ]; then
    PASS=$((PASS + 1))
    echo "  PASS: $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  FAIL: $test_name\n"
    echo "  FAIL: $test_name"
  fi
}

assert_equals() {
  local test_name="$1"
  local expected="$2"
  local actual="$3"
  if [ "$expected" = "$actual" ]; then
    PASS=$((PASS + 1))
    echo "  PASS: $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  FAIL: $test_name — expected '$expected', got '$actual'\n"
    echo "  FAIL: $test_name (expected '$expected', got '$actual')"
  fi
}

# shellcheck disable=SC2317  # invoked via trap
cleanup() {
  rm -rf "$TEST_ADMIRAL_DIR"
}
trap cleanup EXIT

echo "============================================="
echo " State Persistence Integration Tests"
echo "============================================="
echo ""

# ============================================================
# Test 1: State initialization and persistence
# ============================================================
echo "--- Test 1: State initialization and persistence ---"

# Initialize state for a new session
init_session_state "test-session-001"
STATE=$(load_state)

SID=$(echo "$STATE" | jq -r '.session_id')
assert_equals "Session ID initialized" "test-session-001" "$SID"

TOKENS=$(echo "$STATE" | jq -r '.tokens_used')
assert_equals "Tokens starts at 0" "0" "$TOKENS"

TOOL_COUNT=$(echo "$STATE" | jq -r '.tool_call_count')
assert_equals "Tool call count starts at 0" "0" "$TOOL_COUNT"

# Verify state file exists
assert_true "State file created" "$([ -f "$TEST_ADMIRAL_DIR/session_state.json" ] && echo true || echo false)"

echo ""

# ============================================================
# Test 2: State updates persist across load/save cycles
# ============================================================
echo "--- Test 2: State updates persist ---"

# Simulate 5 tool calls incrementing counters
for _ in 1 2 3 4 5; do
  increment_state_field '.tool_call_count' 1
  increment_state_field '.tokens_used' 500
done

STATE=$(load_state)
TOOL_COUNT=$(echo "$STATE" | jq -r '.tool_call_count')
assert_equals "Tool call count after 5 calls" "5" "$TOOL_COUNT"

TOKENS=$(echo "$STATE" | jq -r '.tokens_used')
assert_equals "Tokens after 5 calls (5×500)" "2500" "$TOKENS"

echo ""

# ============================================================
# Test 3: Hook state sub-objects persist
# ============================================================
echo "--- Test 3: Hook state sub-objects persist ---"

# Simulate loop detector setting state
STATE=$(load_state)
STATE=$(echo "$STATE" | jq '.hook_state.loop_detector.total_errors = 3')
STATE=$(echo "$STATE" | jq '.hook_state.loop_detector.error_counts["sig-abc123"] = 3')
echo "$STATE" | save_state

# Reload and verify
STATE=$(load_state)
LOOP_ERRORS=$(echo "$STATE" | jq -r '.hook_state.loop_detector.total_errors')
assert_equals "Loop detector total_errors persists" "3" "$LOOP_ERRORS"

SIG_COUNT=$(echo "$STATE" | jq -r '.hook_state.loop_detector.error_counts["sig-abc123"]')
assert_equals "Loop detector error signature persists" "3" "$SIG_COUNT"

# Simulate zero_trust state
STATE=$(echo "$STATE" | jq '.hook_state.zero_trust = {"external_data_count": 7}')
echo "$STATE" | save_state

STATE=$(load_state)
EXT_COUNT=$(echo "$STATE" | jq -r '.hook_state.zero_trust.external_data_count')
assert_equals "Zero-trust external_data_count persists" "7" "$EXT_COUNT"

# Simulate compliance state
STATE=$(echo "$STATE" | jq '.hook_state.compliance = {"flags_count": 2}')
echo "$STATE" | save_state

STATE=$(load_state)
COMP_FLAGS=$(echo "$STATE" | jq -r '.hook_state.compliance.flags_count')
assert_equals "Compliance flags_count persists" "2" "$COMP_FLAGS"

echo ""

# ============================================================
# Test 4: Simulated session boundary — state survives
# ============================================================
echo "--- Test 4: State survives session boundary ---"

# Record final state of "session 1"
STATE=$(load_state)
S1_TOKENS=$(echo "$STATE" | jq -r '.tokens_used')
S1_TOOL_COUNT=$(echo "$STATE" | jq -r '.tool_call_count')

# "Session 2" starts — loads existing state (in real system, session_start_adapter
# would reinitialize; here we test that the file persists on disk)
STATE2=$(load_state)
S2_TOKENS=$(echo "$STATE2" | jq -r '.tokens_used')
S2_TOOL_COUNT=$(echo "$STATE2" | jq -r '.tool_call_count')

assert_equals "Tokens survive reload" "$S1_TOKENS" "$S2_TOKENS"
assert_equals "Tool count survives reload" "$S1_TOOL_COUNT" "$S2_TOOL_COUNT"

echo ""

# ============================================================
# Test 5: Corrupt state — fail-open recovery
# ============================================================
echo "--- Test 5: Corrupt state → fail-open recovery ---"

# Corrupt the state file
echo "THIS IS NOT JSON" > "$TEST_ADMIRAL_DIR/session_state.json"

# load_state should recover (reinitialize)
STATE=$(load_state)
VALID=$(echo "$STATE" | jq empty 2>&1 && echo "true" || echo "false")
assert_true "Corrupt state recovered to valid JSON" "$VALID"

SID=$(echo "$STATE" | jq -r '.session_id')
assert_true "Recovery creates new session ID" "$(echo "$SID" | grep -q 'recovery-' && echo true || echo false)"

echo ""

# ============================================================
# Test 6: Missing state file — fail-open initialization
# ============================================================
echo "--- Test 6: Missing state file → fail-open init ---"

# Delete state file
rm -f "$TEST_ADMIRAL_DIR/session_state.json"

# load_state should create fresh state
STATE=$(load_state)
VALID=$(echo "$STATE" | jq empty 2>&1 && echo "true" || echo "false")
assert_true "Missing state file recovered" "$VALID"

TOKENS=$(echo "$STATE" | jq -r '.tokens_used')
assert_equals "Fresh state starts at 0 tokens" "0" "$TOKENS"

echo ""

# ============================================================
# Test 7: Atomic write — partial writes don't corrupt
# ============================================================
echo "--- Test 7: Atomic write protection ---"

# Initialize clean state
init_session_state "atomic-test"
increment_state_field '.tokens_used' 1000

# Attempt to save invalid JSON (should silently fail, keeping old state)
echo "INVALID JSON" | save_state

# State should still be valid
STATE=$(load_state)
TOKENS=$(echo "$STATE" | jq -r '.tokens_used')
assert_equals "Invalid save doesn't corrupt state" "1000" "$TOKENS"

echo ""

# ============================================================
# Test 8: Error count decay in loop detector
# ============================================================
echo "--- Test 8: Error count decay simulation ---"

init_session_state "decay-test"
STATE=$(load_state)

# Simulate 3 errors
STATE=$(echo "$STATE" | jq '.hook_state.loop_detector.total_errors = 3')
echo "$STATE" | save_state

# Simulate a success (decay by 1, floor 0)
STATE=$(load_state)
TOTAL=$(echo "$STATE" | jq -r '.hook_state.loop_detector.total_errors')
NEW_TOTAL=$(( TOTAL > 0 ? TOTAL - 1 : 0 ))
STATE=$(echo "$STATE" | jq --argjson t "$NEW_TOTAL" '.hook_state.loop_detector.total_errors = $t')
echo "$STATE" | save_state

STATE=$(load_state)
DECAYED=$(echo "$STATE" | jq -r '.hook_state.loop_detector.total_errors')
assert_equals "Error count decays after success (3 → 2)" "2" "$DECAYED"

# Simulate 3 more successes (should reach floor 0)
for _ in 1 2 3; do
  STATE=$(load_state)
  TOTAL=$(echo "$STATE" | jq -r '.hook_state.loop_detector.total_errors')
  NEW_TOTAL=$(( TOTAL > 0 ? TOTAL - 1 : 0 ))
  STATE=$(echo "$STATE" | jq --argjson t "$NEW_TOTAL" '.hook_state.loop_detector.total_errors = $t')
  echo "$STATE" | save_state
done

STATE=$(load_state)
FLOORED=$(echo "$STATE" | jq -r '.hook_state.loop_detector.total_errors')
assert_equals "Error count floors at 0" "0" "$FLOORED"

echo ""

# ============================================================
# Summary
# ============================================================
echo "============================================="
echo " Results: $PASS passed, $FAIL failed"
echo "============================================="

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
fi

exit 0
