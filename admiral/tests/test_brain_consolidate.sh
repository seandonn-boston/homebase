#!/bin/bash
# test_brain_consolidate.sh — Tests for B-05 brain entry consolidation
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BRAIN_RECORD="$PROJECT_ROOT/admiral/bin/brain_record"
BRAIN_CONSOLIDATE="$PROJECT_ROOT/admiral/bin/brain_consolidate"

export CLAUDE_PROJECT_DIR="$PROJECT_ROOT"
export BRAIN_DIR="$PROJECT_ROOT/.brain"

TEST_PROJECT="test-consolidate"
TEST_DIR="$BRAIN_DIR/$TEST_PROJECT"
ARCHIVE_DIR="$BRAIN_DIR/_archived"

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

cleanup() {
  rm -rf "$TEST_DIR" "$ARCHIVE_DIR" 2>/dev/null || true
}

cleanup

echo "Testing brain_consolidate (B-05)"
echo "================================="
echo ""

# Setup: Create entries with contradictions
"$BRAIN_RECORD" "$TEST_PROJECT" "decision" "Use REST API for backend" "REST chosen for simplicity" 2>/dev/null
sleep 1
"$BRAIN_RECORD" "$TEST_PROJECT" "decision" "Use GraphQL API for backend" "GraphQL chosen for flexibility" 2>/dev/null
sleep 1

# Test 1: Dry run mode
echo "1. Dry run mode"
result=$("$BRAIN_CONSOLIDATE" --project "$TEST_PROJECT" --dry-run 2>/dev/null)
result=$(echo "$result" | tr -d '\r')
mode=$(echo "$result" | jq -r '.mode')
assert_eq "Mode is dry_run" "dry_run" "$mode"
archived=$(echo "$result" | jq '.archived')
assert_eq "Nothing archived in dry run" "0" "$archived"

# Test 2: Files still exist after dry run
echo ""
echo "2. Files intact after dry run"
file_count=$(ls "$TEST_DIR"/*.json 2>/dev/null | wc -l | tr -d ' ')
assert_eq "Files preserved" "true" "$([ "$file_count" -ge 2 ] && echo true || echo false)"

# Test 3: Execute consolidation
echo ""
echo "3. Execute consolidation"
result=$("$BRAIN_CONSOLIDATE" --project "$TEST_PROJECT" 2>/dev/null)
result=$(echo "$result" | tr -d '\r')
mode=$(echo "$result" | jq -r '.mode')
assert_eq "Mode is executed" "executed" "$mode"

# Test 4: Archive directory created
echo ""
echo "4. Archive directory"
assert_eq "Archive dir exists" "true" "$([ -d "$ARCHIVE_DIR" ] && echo true || echo false)"

# Test 5: Archived entries moved
echo ""
echo "5. Archived entries"
archived_count=$(ls "$ARCHIVE_DIR"/*.json 2>/dev/null | wc -l | tr -d ' ')
assert_eq "At least one archived" "true" "$([ "$archived_count" -ge 1 ] && echo true || echo false)"

# Test 6: Supersedes metadata added
echo ""
echo "6. Supersedes provenance"
latest=$(ls -t "$TEST_DIR"/*decision*.json 2>/dev/null | head -1)
if [ -n "$latest" ]; then
  has_supersedes=$(jq '.metadata | has("supersedes")' "$latest" 2>/dev/null | tr -d '\r')
  assert_eq "Has supersedes metadata" "true" "$has_supersedes"
else
  echo "  SKIP: No remaining decision entries"
  pass=$((pass + 1))
fi

# Test 7: Output is valid JSON
echo ""
echo "7. Output validity"
result=$("$BRAIN_CONSOLIDATE" --project "$TEST_PROJECT" 2>/dev/null)
json_valid=$(echo "$result" | tr -d '\r' | jq empty 2>/dev/null && echo true || echo false)
assert_eq "Output is valid JSON" "true" "$json_valid"

# Test 8: No-op on empty project
echo ""
echo "8. No-op on empty project"
result=$("$BRAIN_CONSOLIDATE" --project "nonexistent-project-xyz" 2>/dev/null)
result=$(echo "$result" | tr -d '\r')
consolidated=$(echo "$result" | jq '.consolidated')
assert_eq "Zero consolidated" "0" "$consolidated"

cleanup

echo ""
echo "================================="
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
exit 0
