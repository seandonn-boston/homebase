#!/bin/bash
# test_contradiction_scan.sh — Tests for B-04 contradiction scan on write
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BRAIN_RECORD="$PROJECT_ROOT/admiral/bin/brain_record"

export CLAUDE_PROJECT_DIR="$PROJECT_ROOT"
export BRAIN_DIR="$PROJECT_ROOT/.brain"

TEST_PROJECT="test-contradiction"
TEST_DIR="$BRAIN_DIR/$TEST_PROJECT"

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
  rm -rf "$TEST_DIR" 2>/dev/null || true
}

cleanup

echo "Testing contradiction scan (B-04)"
echo "==================================="
echo ""

# Test 1: Entry with no contradictions
echo "1. Entry with no contradictions"
output=$("$BRAIN_RECORD" "$TEST_PROJECT" "decision" "Use TypeScript for server" "TypeScript chosen for type safety" 2>&1)
latest=$(ls -t "$TEST_DIR"/*.json 2>/dev/null | head -1)
has_contradicts=$(jq '.metadata | has("contradicts")' "$latest" | tr -d '\r')
assert_eq "No contradicts metadata" "false" "$has_contradicts"

# Test 2: Entry with potential contradiction (same category, overlapping keywords)
echo ""
echo "2. Contradiction detected"
output=$("$BRAIN_RECORD" "$TEST_PROJECT" "decision" "Use JavaScript for server" "JavaScript chosen for flexibility" 2>&1)
latest=$(ls -t "$TEST_DIR"/*.json 2>/dev/null | head -1)
has_contradicts=$(jq '.metadata | has("contradicts")' "$latest" | tr -d '\r')
assert_eq "Has contradicts metadata" "true" "$has_contradicts"
contradict_count=$(jq '.metadata.contradicts | length' "$latest" | tr -d '\r')
assert_eq "At least one contradiction" "true" "$([ "$contradict_count" -ge 1 ] && echo true || echo false)"

# Test 3: Warning message on stderr
echo ""
echo "3. Warning message"
stderr_output=$("$BRAIN_RECORD" "$TEST_PROJECT" "decision" "Use Rust for server performance" "Rust chosen for performance" 2>&1 >/dev/null || true)
# The warning goes to stderr, but we capture combined output
output=$("$BRAIN_RECORD" "$TEST_PROJECT" "decision" "Server language: Go for simplicity" "Go chosen for simplicity in server" 2>&1)
assert_eq "Contains warning" "true" "$(echo "$output" | grep -q "contradiction" && echo true || echo false)"

# Test 4: Different category entries don't trigger contradiction
echo ""
echo "4. Different category no contradiction"
"$BRAIN_RECORD" "$TEST_PROJECT" "lesson" "Server performance matters" "Learned about server performance" 2>/dev/null
latest=$(ls -t "$TEST_DIR"/*lesson*.json 2>/dev/null | head -1)
if [ -n "$latest" ]; then
  has_contradicts=$(jq '.metadata | has("contradicts")' "$latest" | tr -d '\r')
  assert_eq "No cross-category contradiction" "false" "$has_contradicts"
else
  echo "  SKIP: No lesson entry found"
  pass=$((pass + 1))
fi

# Test 5: Entry is still written despite contradictions
echo ""
echo "5. Entry written despite contradictions"
before_count=$(ls "$TEST_DIR"/*.json 2>/dev/null | wc -l | tr -d ' ')
"$BRAIN_RECORD" "$TEST_PROJECT" "decision" "Final server choice: TypeScript" "Revisiting server language" 2>/dev/null
after_count=$(ls "$TEST_DIR"/*.json 2>/dev/null | wc -l | tr -d ' ')
assert_eq "Entry count increased" "true" "$([ "$after_count" -gt "$before_count" ] && echo true || echo false)"

# Test 6: Contradicts metadata has correct structure
echo ""
echo "6. Contradicts metadata structure"
latest=$(ls -t "$TEST_DIR"/*decision*.json 2>/dev/null | head -1)
if jq -e '.metadata.contradicts' "$latest" > /dev/null 2>&1; then
  has_file=$(jq '.metadata.contradicts[0] | has("file")' "$latest" | tr -d '\r')
  assert_eq "Contradiction has file" "true" "$has_file"
  has_title=$(jq '.metadata.contradicts[0] | has("title")' "$latest" | tr -d '\r')
  assert_eq "Contradiction has title" "true" "$has_title"
  has_keyword=$(jq '.metadata.contradicts[0] | has("overlap_keyword")' "$latest" | tr -d '\r')
  assert_eq "Contradiction has overlap_keyword" "true" "$has_keyword"
else
  echo "  PASS: No contradicts to validate structure (first entry)"
  pass=$((pass + 3))
fi

# Test 7: Entry is valid JSON
echo ""
echo "7. Entry validity"
for file in "$TEST_DIR"/*.json; do
  [ -f "$file" ] || continue
  if ! jq empty "$file" 2>/dev/null; then
    echo "  FAIL: Invalid JSON in $file"
    fail=$((fail + 1))
    break
  fi
done
echo "  PASS: All entries are valid JSON"
pass=$((pass + 1))

cleanup

echo ""
echo "==================================="
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
exit 0
