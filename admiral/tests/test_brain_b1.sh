#!/bin/bash
# Admiral Framework — Brain B1 Integration Tests
# Tests the full round-trip: record -> query -> retrieve
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADMIRAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BRAIN_RECORD="$ADMIRAL_DIR/bin/brain_record"
BRAIN_QUERY="$ADMIRAL_DIR/bin/brain_query"
BRAIN_RETRIEVE="$ADMIRAL_DIR/bin/brain_retrieve"

PASS=0
FAIL=0
ERRORS=""

# Helper: assert output contains a string
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
    echo "    output: $output"
  fi
}

# Helper: assert output does NOT contain a string
assert_not_contains() {
  local test_name="$1"
  local output="$2"
  local unexpected="$3"
  if echo "$output" | grep -q "$unexpected"; then
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $test_name — did not expect '$unexpected' in output\n"
    echo "  [FAIL] $test_name"
    echo "    output: $output"
  else
    PASS=$((PASS + 1))
    echo "  [PASS] $test_name"
  fi
}

# ============================================================
# Setup: temp directory as CLAUDE_PROJECT_DIR
# ============================================================
TMPDIR_ROOT=$(mktemp -d)
export CLAUDE_PROJECT_DIR="$TMPDIR_ROOT"
# brain scripts derive BRAIN_DIR as $CLAUDE_PROJECT_DIR/.brain

# shellcheck disable=SC2317  # invoked via trap
cleanup() {
  rm -rf "$TMPDIR_ROOT"
}
trap cleanup EXIT

echo "========================================"
echo " Admiral Brain B1 — Round-Trip Tests"
echo "========================================"
echo ""
echo "CLAUDE_PROJECT_DIR=$CLAUDE_PROJECT_DIR"
echo ""

# ============================================================
# Test 1: Record 3 entries
# ============================================================
echo "--- Recording entries ---"

OUTPUT1=$("$BRAIN_RECORD" "test-project" "decision" "Use TypeScript for control plane" "Chose TypeScript for type safety and zero-dep policy")
assert_contains "Record decision entry" "$OUTPUT1" "Recorded:"
DECISION_FILE=$(echo "$OUTPUT1" | sed 's/Recorded: //')

OUTPUT2=$("$BRAIN_RECORD" "test-project" "lesson" "Hooks must fail open" "Advisory-only hooks prevent deadlocks in enforcement layer")
assert_contains "Record lesson entry" "$OUTPUT2" "Recorded:"
_LESSON_FILE=$(echo "$OUTPUT2" | sed 's/Recorded: //')

OUTPUT3=$("$BRAIN_RECORD" "test-project" "pattern" "Event sourcing for observability" "All hook events emit to JSONL for control plane ingestion")
assert_contains "Record pattern entry" "$OUTPUT3" "Recorded:"
_PATTERN_FILE=$(echo "$OUTPUT3" | sed 's/Recorded: //')

echo ""

# ============================================================
# Test 2: Query by keyword "TypeScript"
# ============================================================
echo "--- Query by keyword ---"

QUERY_OUTPUT=$("$BRAIN_QUERY" "TypeScript")
assert_contains "Query 'TypeScript' finds decision entry" "$QUERY_OUTPUT" "Use TypeScript for control plane"

echo ""

# ============================================================
# Test 3: Query with --category decision
# ============================================================
echo "--- Query with category filter ---"

QUERY_CAT=$("$BRAIN_QUERY" "TypeScript" --category decision)
assert_contains "Query --category decision finds decision" "$QUERY_CAT" "Use TypeScript for control plane"

# Also verify the category filter excludes other categories
QUERY_CAT_LESSON=$("$BRAIN_QUERY" "hooks" --category lesson)
assert_contains "Query --category lesson finds lesson" "$QUERY_CAT_LESSON" "Hooks must fail open"
assert_not_contains "Query --category lesson excludes pattern" "$QUERY_CAT_LESSON" "Event sourcing"

echo ""

# ============================================================
# Test 4: Retrieve by filename
# ============================================================
echo "--- Retrieve by filename ---"

RETRIEVE_OUTPUT=$("$BRAIN_RETRIEVE" "$DECISION_FILE")
assert_contains "Retrieve returns correct title" "$RETRIEVE_OUTPUT" "Use TypeScript for control plane"
assert_contains "Retrieve returns correct category" "$RETRIEVE_OUTPUT" '"category": "decision"'
assert_contains "Retrieve returns correct content" "$RETRIEVE_OUTPUT" "type safety and zero-dep policy"
assert_contains "Retrieve returns correct project" "$RETRIEVE_OUTPUT" '"project": "test-project"'

# Verify it's valid JSON
if echo "$RETRIEVE_OUTPUT" | jq empty 2>/dev/null; then
  PASS=$((PASS + 1))
  echo "  [PASS] Retrieved entry is valid JSON"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] Retrieved entry is not valid JSON\n"
  echo "  [FAIL] Retrieved entry is not valid JSON"
fi

echo ""

# ============================================================
# Test 5: Query with non-existent keyword
# ============================================================
echo "--- Query non-existent keyword ---"

QUERY_MISSING=$("$BRAIN_QUERY" "xyznonexistent12345")
assert_contains "Non-existent keyword returns 'No entries found'" "$QUERY_MISSING" "No entries found"

echo ""

# ============================================================
# Summary
# ============================================================
echo "========================================"
echo " Results: $PASS passed, $FAIL failed"
echo "========================================"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
fi

exit 0
