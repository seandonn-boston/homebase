#!/bin/bash
# Admiral Framework — state.sh Concurrent Access Tests (T-07)
# Tests with_state_lock under concurrent access.
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADMIRAL_LIB="$SCRIPT_DIR/../lib/state.sh"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/../lib/assert.sh"

setup() {
  TMPDIR_BASE="$(mktemp -d)"
  export ADMIRAL_DIR="$TMPDIR_BASE"
  export CLAUDE_PROJECT_DIR="$TMPDIR_BASE"
  export STATE_FILE="$ADMIRAL_DIR/session_state.json"
  # shellcheck source=/dev/null
  source "$ADMIRAL_LIB"
}

teardown() {
  rm -rf "$TMPDIR_BASE"
}

# ============================================================
echo "=== state.sh Concurrent Access Tests ==="
echo ""

# --- Test 1: Basic lock acquisition ---
echo "--- Basic lock ---"
setup

init_session_state "test-1"
set_state_field ".tool_call_count" "42"
val=$(get_state_field "tool_call_count")
assert_eq "set_state_field writes correctly" "42" "$val"

teardown

# --- Test 2: Increment under sequential calls ---
echo "--- Sequential increment ---"
setup

init_session_state "test-2"
increment_state_field ".tool_call_count" 1
increment_state_field ".tool_call_count" 1
increment_state_field ".tool_call_count" 1
val=$(get_state_field "tool_call_count")
assert_eq "Sequential increment (3x) produces 3" "3" "$val"

teardown

# --- Test 3: Concurrent increments with flock ---
echo "--- Concurrent increments ---"
setup

init_session_state "test-3"

# Spawn 5 concurrent subshells, each incrementing tool_call_count by 1
for i in $(seq 1 5); do
  (
    export ADMIRAL_DIR="$TMPDIR_BASE"
    export STATE_FILE="$ADMIRAL_DIR/session_state.json"
    # shellcheck source=/dev/null
    source "$ADMIRAL_LIB"
    increment_state_field ".tool_call_count" 1
  ) &
done
wait

val=$(get_state_field "tool_call_count")
# With flock, all 5 should succeed. Without flock (race condition), some may be lost.
if command -v flock &>/dev/null; then
  assert_eq "Concurrent increment (5 procs with flock) produces 5" "5" "$val"
else
  # Without flock, just verify no corruption
  if [ "$val" -ge 1 ] 2>/dev/null; then
    PASS=$((PASS + 1))
    echo "  [PASS] Concurrent increment without flock: got $val (no flock available)"
  else
    FAIL=$((FAIL + 1))
    echo "  [FAIL] Concurrent increment produced corrupt value: $val"
  fi
fi

teardown

# --- Test 4: Concurrent writes don't corrupt JSON ---
echo "--- Concurrent write integrity ---"
setup

init_session_state "test-4"

# Spawn 10 concurrent subshells writing different fields
for i in $(seq 1 10); do
  (
    export ADMIRAL_DIR="$TMPDIR_BASE"
    export STATE_FILE="$ADMIRAL_DIR/session_state.json"
    # shellcheck source=/dev/null
    source "$ADMIRAL_LIB"
    set_state_field ".tool_call_count" "$i"
  ) &
done
wait

# State file must be valid JSON regardless of race outcome
if jq empty "$STATE_FILE" 2>/dev/null; then
  PASS=$((PASS + 1))
  echo "  [PASS] State file is valid JSON after 10 concurrent writes"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] State file corrupted after concurrent writes\n"
  echo "  [FAIL] State file corrupted after concurrent writes"
fi

teardown

# --- Test 5: Lock timeout behavior ---
echo "--- Lock timeout ---"
setup

init_session_state "test-5"

if command -v flock &>/dev/null; then
  # Hold the lock for 2 seconds in background
  lockfile="$STATE_FILE.lock"
  (
    flock -w 5 200
    sleep 2
  ) 200>"$lockfile" &
  LOCK_PID=$!

  # Small delay to ensure lock is held
  sleep 0.2

  # Try to acquire — should succeed after lock is released (within 5s timeout)
  set_state_field ".tool_call_count" "99"
  val=$(get_state_field "tool_call_count")
  assert_eq "Lock acquisition succeeds after holder releases" "99" "$val"

  wait $LOCK_PID 2>/dev/null || true
else
  PASS=$((PASS + 1))
  echo "  [PASS] Lock timeout test skipped (flock not available)"
fi

teardown

# --- Test 6: Corrupt state recovery ---
echo "--- Corrupt state recovery ---"
setup

# Write corrupt JSON to state file
mkdir -p "$ADMIRAL_DIR"
echo "this is not json" > "$STATE_FILE"

# load_state should recover by reinitializing
state=$(load_state)
if echo "$state" | jq empty 2>/dev/null; then
  PASS=$((PASS + 1))
  echo "  [PASS] load_state recovers from corrupt state file"
else
  FAIL=$((FAIL + 1))
  echo "  [FAIL] load_state did not recover from corrupt state"
fi

teardown

# --- Test 7: Missing state file ---
echo "--- Missing state file ---"
setup

# Don't create state file — load_state should initialize it
state=$(load_state)
if echo "$state" | jq empty 2>/dev/null; then
  PASS=$((PASS + 1))
  echo "  [PASS] load_state creates state file when missing"
else
  FAIL=$((FAIL + 1))
  echo "  [FAIL] load_state failed with missing state file"
fi

teardown

# --- Test 8: save_state rejects invalid JSON ---
echo "--- save_state validation ---"
setup

init_session_state "test-8"
original=$(cat "$STATE_FILE")

# Try to save invalid JSON
echo "not json" | save_state

# State should be unchanged (original preserved)
current=$(cat "$STATE_FILE")
assert_eq "save_state preserves state on invalid input" "$original" "$current"

teardown

# --- Test 9: estimate_tokens returns correct values ---
echo "--- estimate_tokens ---"
setup

assert_eq "estimate_tokens Bash" "500" "$(estimate_tokens Bash)"
assert_eq "estimate_tokens Read" "1000" "$(estimate_tokens Read)"
assert_eq "estimate_tokens Agent" "5000" "$(estimate_tokens Agent)"
assert_eq "estimate_tokens unknown" "500" "$(estimate_tokens UnknownTool)"

teardown

# --- Test 10: compute_loop_sig deterministic ---
echo "--- compute_loop_sig ---"
setup

sig1=$(compute_loop_sig "agent-1" "Error: file not found")
sig2=$(compute_loop_sig "agent-1" "Error: file not found")
sig3=$(compute_loop_sig "agent-1" "Error: permission denied")
sig4=$(compute_loop_sig "agent-2" "Error: file not found")

assert_eq "Same input produces same signature" "$sig1" "$sig2"

if [ "$sig1" != "$sig3" ]; then
  PASS=$((PASS + 1))
  echo "  [PASS] Different error produces different signature"
else
  FAIL=$((FAIL + 1))
  echo "  [FAIL] Different errors should produce different signatures"
fi

if [ "$sig1" != "$sig4" ]; then
  PASS=$((PASS + 1))
  echo "  [PASS] Different agent produces different signature"
else
  FAIL=$((FAIL + 1))
  echo "  [FAIL] Different agents should produce different signatures"
fi

teardown

print_results "State Concurrent Tests"
