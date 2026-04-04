#!/bin/bash
# test_brain_writer_integration.sh — Tests for HB-03 Brain B2 write helpers
# Tests the async write queue functions added to brain_writer.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

pass=0
fail=0

assert_eq() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  PASS: $desc"
    pass=$((pass + 1))
  else
    echo "  FAIL: $desc (expected '$expected', got '$actual')"
    fail=$((fail + 1))
  fi
}

assert_gt() {
  local desc="$1" threshold="$2" actual="$3"
  if [ "$actual" -gt "$threshold" ] 2>/dev/null; then
    echo "  PASS: $desc"
    pass=$((pass + 1))
  else
    echo "  FAIL: $desc (expected > $threshold, got '$actual')"
    fail=$((fail + 1))
  fi
}

# Setup
TEST_DIR=$(mktemp -d)
TEST_ADMIRAL_DIR="$TEST_DIR/.admiral"
mkdir -p "$TEST_ADMIRAL_DIR"

export CLAUDE_PROJECT_DIR="$TEST_DIR"
export BRAIN_B2_WRITE_QUEUE="$TEST_ADMIRAL_DIR/brain_write_queue.jsonl"
export BRAIN_B2_WRITE_QUEUE_MAX="10"

# Create minimal session state for context extraction
echo '{"session_id":"test-session-1","trace_id":"trace-abc"}' > "$TEST_ADMIRAL_DIR/session_state.json"

# Source the library
source "$PROJECT_ROOT/admiral/lib/brain_writer.sh"

cleanup() {
  rm -rf "$TEST_DIR" 2>/dev/null || true
}
trap cleanup EXIT

echo "Testing brain_writer.sh B2 write helpers (HB-03)"
echo "================================================="
echo ""

# Test 1: Queue write creates the queue file
echo "1. brain_b2_queue_write creates queue file"
brain_b2_queue_write "decision" "Test decision" "This is a test" "test_hook"
assert_eq "Queue file exists" "true" "$([ -f "$BRAIN_B2_WRITE_QUEUE" ] && echo true || echo false)"

# Test 2: Queue entry is valid JSON
echo "2. Queue entry is valid JSON"
first_line=$(head -1 "$BRAIN_B2_WRITE_QUEUE")
valid=$(echo "$first_line" | jq -e '.' >/dev/null 2>&1 && echo true || echo false)
assert_eq "Valid JSON" "true" "$valid"

# Test 3: Queue entry has correct fields
echo "3. Queue entry has correct fields"
op=$(echo "$first_line" | jq -r '.op')
category=$(echo "$first_line" | jq -r '.category')
title=$(echo "$first_line" | jq -r '.title')
session=$(echo "$first_line" | jq -r '.session_id')
trace=$(echo "$first_line" | jq -r '.trace_id')
assert_eq "Op is insert" "insert" "$op"
assert_eq "Category is decision" "decision" "$category"
assert_eq "Title matches" "Test decision" "$title"
assert_eq "Session ID from state" "test-session-1" "$session"
assert_eq "Trace ID from state" "trace-abc" "$trace"

# Test 4: brain_b2_record_decision
echo "4. brain_b2_record_decision"
brain_b2_record_decision "scope_guard" "Blocked write" "File outside permitted path"
size=$(brain_b2_queue_size)
assert_gt "Queue size > 1" "1" "$size"

# Test 5: brain_b2_record_violation
echo "5. brain_b2_record_violation"
brain_b2_record_violation "prohibitions_enforcer" "agent-1" "scope_violation" "Wrote to aiStrat/"
last_line=$(tail -1 "$BRAIN_B2_WRITE_QUEUE")
agent_id=$(echo "$last_line" | jq -r '.metadata.agent_id')
assert_eq "Agent ID in metadata" "agent-1" "$agent_id"

# Test 6: brain_b2_record_pattern
echo "6. brain_b2_record_pattern"
brain_b2_record_pattern "sha256abc" "loop_detected" "{}"
last_line=$(tail -1 "$BRAIN_B2_WRITE_QUEUE")
pattern_hash=$(echo "$last_line" | jq -r '.metadata.pattern_hash')
assert_eq "Pattern hash in metadata" "sha256abc" "$pattern_hash"

# Test 7: Queue size tracking
echo "7. Queue size tracking"
size=$(brain_b2_queue_size)
assert_gt "Queue has entries" "0" "$size"

# Test 8: Queue FIFO eviction at max size
echo "8. Queue FIFO eviction at max size"
# Fill queue to max (10) plus overflow
for i in $(seq 1 12); do
  brain_b2_queue_write "test" "Entry $i" "Content $i" "test"
done
size=$(brain_b2_queue_size)
assert_eq "Queue respects max size" "true" "$([ "$size" -le "$BRAIN_B2_WRITE_QUEUE_MAX" ] && echo true || echo false)"

# Test 9: Non-blocking on write failure
echo "9. Non-blocking on write failure (read-only queue path)"
SAVE_QUEUE="$BRAIN_B2_WRITE_QUEUE"
export BRAIN_B2_WRITE_QUEUE="/nonexistent/path/queue.jsonl"
brain_b2_queue_write "test" "Should not crash" "Content" "test"
result=$?
assert_eq "Does not crash on write failure" "0" "$result"
export BRAIN_B2_WRITE_QUEUE="$SAVE_QUEUE"

# Test 10: Empty queue returns 0
echo "10. Empty queue returns 0 for non-existent file"
rm -f "$BRAIN_B2_WRITE_QUEUE"
size=$(brain_b2_queue_size)
assert_eq "Empty queue is 0" "0" "$size"

# Summary
echo ""
echo "================================================="
echo "Results: $pass passed, $fail failed"
exit "$fail"
