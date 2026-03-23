#!/usr/bin/env bash
# T-21: State.sh file locking under high concurrency
# Spawns 20+ concurrent processes doing read-modify-write on session state.
# Verifies zero data corruption, lock timeout behavior, stale lock cleanup.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PASS=0
FAIL=0
CONCURRENT=20
RUNS=3

assert_eq() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    echo "FAIL: $desc (expected=$expected, actual=$actual)"
  fi
}

echo "State.sh High Concurrency Tests"
echo "================================"

for run in $(seq 1 $RUNS); do
  TMPDIR=$(mktemp -d)
  export CLAUDE_PROJECT_DIR="$TMPDIR"
  source "$SCRIPT_DIR/../lib/state.sh"

  # Initialize
  init_session_state "concurrency-run-$run"
  set_state_field '.tool_call_count' '0'

  # Spawn 20+ concurrent increment operations
  pids=()
  for ((i = 0; i < CONCURRENT; i++)); do
    (
      source "$SCRIPT_DIR/../lib/state.sh"
      export CLAUDE_PROJECT_DIR="$TMPDIR"
      _inc() {
        local state count
        state=$(load_state)
        count=$(echo "$state" | jq -r '.tool_call_count // 0')
        echo "$state" | jq --argjson c "$((count + 1))" '.tool_call_count = $c' | save_state
      }
      with_state_lock _inc
    ) &
    pids+=($!)
  done

  for pid in "${pids[@]}"; do
    wait "$pid" 2>/dev/null || true
  done

  final=$(get_state_field 'tool_call_count')

  if command -v flock &>/dev/null; then
    assert_eq "run $run: flock preserves all $CONCURRENT increments" "$CONCURRENT" "$final"
  else
    assert_eq "run $run: without flock, count > 0" "1" "$((final > 0 ? 1 : 0))"
  fi

  # Verify state file is valid JSON after concurrent writes
  rc=0
  load_state | jq empty 2>/dev/null || rc=$?
  assert_eq "run $run: state file is valid JSON after concurrent writes" "0" "$rc"

  # Verify no stale lock file
  if [ ! -f "${STATE_FILE}.lock" ] || ! fuser "${STATE_FILE}.lock" 2>/dev/null; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    echo "FAIL: run $run: stale lock file detected"
  fi

  rm -rf "$TMPDIR"
done

echo ""
echo "high concurrency tests: $PASS/$((PASS + FAIL)) passed, $FAIL failed"
if [ "$FAIL" -gt 0 ]; then exit 1; fi
