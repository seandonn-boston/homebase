#!/usr/bin/env bash
# T-07: Test state.sh concurrent access with with_state_lock
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMPDIR=$(mktemp -d)
export CLAUDE_PROJECT_DIR="$TMPDIR"

source "$SCRIPT_DIR/../lib/state.sh"

source "$SCRIPT_DIR/test_helpers.sh"

# --- Basic state operations ---
init_session_state "test-session"
state=$(load_state)
sid=$(echo "$state" | jq -r '.session_id')
assert_eq "init_session_state: sets session_id" "test-session" "$sid"

# --- set_state_field / get_state_field ---
set_state_field '.tool_call_count' '42'
val=$(get_state_field 'tool_call_count')
assert_eq "set_state_field: updates field" "42" "$val"

# --- save_state rejects invalid JSON ---
echo "not json" | save_state
val_after=$(get_state_field 'tool_call_count')
assert_eq "save_state: rejects invalid JSON, keeps old state" "42" "$val_after"

# --- Concurrent access test ---
# Reset state
init_session_state "concurrent-test"
set_state_field '.tool_call_count' '0'

# Spawn 10 concurrent processes, each incrementing tool_call_count
CONCURRENT=10
pids=()
for ((i = 0; i < CONCURRENT; i++)); do
  (
    source "$SCRIPT_DIR/../lib/state.sh"
    export CLAUDE_PROJECT_DIR="$TMPDIR"
    _increment() {
      local state count new_count
      state=$(load_state)
      count=$(echo "$state" | jq -r '.tool_call_count // 0')
      new_count=$((count + 1))
      echo "$state" | jq --argjson c "$new_count" '.tool_call_count = $c' | save_state
    }
    with_state_lock _increment
  ) &
  pids+=($!)
done

# Wait for all
for pid in "${pids[@]}"; do
  wait "$pid" || true
done

# Check final count — with flock, should be exactly CONCURRENT
final_count=$(get_state_field 'tool_call_count')

if command -v flock &>/dev/null; then
  assert_eq "concurrent: flock prevents data loss (count=$final_count)" "$CONCURRENT" "$final_count"
else
  # Without flock, count may be less due to races
  assert_eq "concurrent: without flock, count > 0" "1" "$((final_count > 0 ? 1 : 0))"
fi

# --- Lock timeout behavior ---
if command -v flock &>/dev/null; then
  # Create a lock and hold it briefly
  lockfile="${STATE_FILE}.lock"
  (
    flock -w 5 200
    sleep 0.5
  ) 200>"$lockfile" &
  holder_pid=$!

  sleep 0.1
  # Try to acquire lock — should succeed within 5s timeout
  rc=0
  with_state_lock true || rc=$?
  assert_eq "lock timeout: lock acquired within timeout" "0" "$rc"
  wait "$holder_pid" 2>/dev/null || true
fi

# --- Corrupted state recovery ---
echo "corrupted{{{" > "$STATE_FILE"
recovered=$(load_state)
sid=$(echo "$recovered" | jq -r '.session_id // "none"') || sid="none"
has_sid=0
if [ -n "$sid" ] && [ "$sid" != "none" ]; then has_sid=1; fi
assert_eq "corrupted state: load_state reinitializes" "1" "$has_sid"

# Cleanup
rm -rf "$TMPDIR"

report_results "state concurrent tests"
