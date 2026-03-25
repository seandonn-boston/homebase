#!/bin/bash
# test_brain_writer.sh — Tests for B-01 automatic brain entry creation
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export CLAUDE_PROJECT_DIR="$PROJECT_ROOT"
export BRAIN_DIR="$PROJECT_ROOT/.brain"

# Source brain writer
source "$PROJECT_ROOT/admiral/lib/brain_writer.sh"

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

# Setup test brain directory
TEST_PROJECT="test-brain-writer"
export BRAIN_WRITER_PROJECT="$TEST_PROJECT"
TEST_BRAIN_DIR="$BRAIN_DIR/$TEST_PROJECT"

cleanup() {
  rm -rf "$TEST_BRAIN_DIR" 2>/dev/null || true
}

cleanup

echo "Testing brain_writer.sh (B-01)"
echo "==============================="
echo ""

# Test 1: brain_write creates an entry
echo "1. Basic brain_write"
brain_write "decision" "Test decision" "This is a test decision" "test_hook"
entry_count=$(ls "$TEST_BRAIN_DIR"/*decision* 2>/dev/null | wc -l | tr -d ' ')
assert_eq "Decision entry created" "true" "$([ "$entry_count" -ge 1 ] && echo true || echo false)"

# Test 2: Entry is valid JSON
echo ""
echo "2. Entry is valid JSON"
latest=$(ls -t "$TEST_BRAIN_DIR"/*.json 2>/dev/null | head -1)
if [ -n "$latest" ]; then
  json_valid=$(jq empty "$latest" 2>/dev/null && echo true || echo false)
  assert_eq "Entry is valid JSON" "true" "$json_valid"

  # Check required fields
  has_title=$(jq 'has("title")' "$latest" | tr -d '\r')
  assert_eq "Entry has title" "true" "$has_title"
  has_content=$(jq 'has("content")' "$latest" | tr -d '\r')
  assert_eq "Entry has content" "true" "$has_content"
  has_category=$(jq 'has("category")' "$latest" | tr -d '\r')
  assert_eq "Entry has category" "true" "$has_category"
else
  echo "  FAIL: No entry file found"
  fail=$((fail + 1))
fi

# Test 3: brain_record_violation creates a failure entry
echo ""
echo "3. Record violation"
brain_record_violation "prohibitions_enforcer" "bypass_pattern" "Attempted --no-verify" "Bash"
failure_count=$(ls "$TEST_BRAIN_DIR"/*failure* 2>/dev/null | wc -l | tr -d ' ')
assert_eq "Failure entry created" "true" "$([ "$failure_count" -ge 1 ] && echo true || echo false)"

# Test 4: brain_record_pattern creates a pattern entry
echo ""
echo "4. Record pattern"
brain_record_pattern "loop_detector" "error_loop" "Same error 3 times"
pattern_count=$(ls "$TEST_BRAIN_DIR"/*pattern* 2>/dev/null | wc -l | tr -d ' ')
assert_eq "Pattern entry created" "true" "$([ "$pattern_count" -ge 1 ] && echo true || echo false)"

# Test 5: brain_record_decision creates a decision entry
echo ""
echo "5. Record decision"
brain_record_decision "tier_validation" "Block security on tier3" "Security auditor requires tier1"
decision_count=$(ls "$TEST_BRAIN_DIR"/*decision* 2>/dev/null | wc -l | tr -d ' ')
assert_eq "Multiple decisions created" "true" "$([ "$decision_count" -ge 2 ] && echo true || echo false)"

# Test 6: brain_record_lesson creates a lesson entry
echo ""
echo "6. Record lesson"
brain_record_lesson "scope_boundary_guard" "Protected paths prevent accidents" "Caught write to aiStrat/"
lesson_count=$(ls "$TEST_BRAIN_DIR"/*lesson* 2>/dev/null | wc -l | tr -d ' ')
assert_eq "Lesson entry created" "true" "$([ "$lesson_count" -ge 1 ] && echo true || echo false)"

# Test 7: Entries have correct source agent
echo ""
echo "7. Source agent tracking"
latest_violation=$(ls -t "$TEST_BRAIN_DIR"/*failure* 2>/dev/null | head -1)
if [ -n "$latest_violation" ]; then
  source_agent=$(jq -r '.source_agent' "$latest_violation" | tr -d '\r')
  assert_eq "Source agent recorded" "prohibitions_enforcer" "$source_agent"
else
  echo "  FAIL: No violation file found"
  fail=$((fail + 1))
fi

# Test 8: Non-blocking on failure (brain_record missing)
echo ""
echo "8. Non-blocking on failure"
# Temporarily rename brain_record
BRAIN_RECORD="$PROJECT_ROOT/admiral/bin/brain_record"
mv "$BRAIN_RECORD" "${BRAIN_RECORD}.bak"
# This should not error despite brain_record being missing
brain_write "decision" "Should not crash" "Testing resilience" "test"
exit_code=$?
assert_eq "Exit code 0 despite missing brain_record" "0" "$exit_code"
mv "${BRAIN_RECORD}.bak" "$BRAIN_RECORD"

# Test 9: Total entries created
echo ""
echo "9. Total entries"
total=$(ls "$TEST_BRAIN_DIR"/*.json 2>/dev/null | wc -l | tr -d ' ')
assert_eq "Multiple entries created" "true" "$([ "$total" -ge 5 ] && echo true || echo false)"

cleanup

echo ""
echo "==============================="
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
exit 0
