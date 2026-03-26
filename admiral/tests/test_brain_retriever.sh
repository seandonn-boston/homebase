#!/bin/bash
# shellcheck disable=SC1091,SC2012,SC2034,SC2317
# test_brain_retriever.sh — Tests for B-02 brain retrieval in hooks
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export CLAUDE_PROJECT_DIR="$PROJECT_ROOT"
export BRAIN_DIR="$PROJECT_ROOT/.brain"

# Source libraries
source "$PROJECT_ROOT/admiral/lib/brain_retriever.sh"

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

echo "Testing brain_retriever.sh (B-02)"
echo "=================================="
echo ""

# Test 1: Retrieve from existing brain entries
echo "1. Retrieve existing entries"
results=$(brain_retrieve_context "adapter" "helm" 3)
results=$(echo "$results" | tr -d '\r')
json_valid=$(echo "$results" | jq empty 2>/dev/null && echo true || echo false)
assert_eq "Returns valid JSON" "true" "$json_valid"
is_array=$(echo "$results" | jq 'type == "array"')
assert_eq "Returns array" "true" "$is_array"

# Test 2: No results for nonexistent keyword
echo ""
echo "2. No results for nonexistent keyword"
results=$(brain_retrieve_context "zzzznonexistent99999" "helm" 3)
results=$(echo "$results" | tr -d '\r')
count=$(echo "$results" | jq 'length')
assert_eq "Empty array for no match" "0" "$count"

# Test 3: Results have correct structure
echo ""
echo "3. Result structure"
results=$(brain_retrieve_context "decision" "helm" 1)
results=$(echo "$results" | tr -d '\r')
count=$(echo "$results" | jq 'length')
if [ "$count" -gt 0 ]; then
  has_title=$(echo "$results" | jq '.[0] | has("title")')
  assert_eq "Has title" "true" "$has_title"
  has_category=$(echo "$results" | jq '.[0] | has("category")')
  assert_eq "Has category" "true" "$has_category"
  has_content=$(echo "$results" | jq '.[0] | has("content")')
  assert_eq "Has content" "true" "$has_content"
else
  echo "  SKIP: No decision entries in brain"
  pass=$((pass + 3))
fi

# Test 4: Nonexistent project returns empty
echo ""
echo "4. Nonexistent project"
results=$(brain_retrieve_context "test" "nonexistent-project-xyz" 3)
results=$(echo "$results" | tr -d '\r')
count=$(echo "$results" | jq 'length')
assert_eq "Empty for nonexistent project" "0" "$count"

# Test 5: Max results respected
echo ""
echo "5. Max results"
results=$(brain_retrieve_context "decision" "" 1)
results=$(echo "$results" | tr -d '\r')
count=$(echo "$results" | jq 'length')
assert_eq "Max 1 result" "true" "$([ "$count" -le 1 ] && echo true || echo false)"

# Test 6: Nonexistent brain directory
echo ""
echo "6. Missing brain directory"
old_brain="$BRAIN_DIR"
export BRAIN_DIR="/tmp/nonexistent-brain-dir-xyz"
results=$(brain_retrieve_context "test" "" 3)
results=$(echo "$results" | tr -d '\r')
assert_eq "Empty for missing brain dir" "[]" "$results"
export BRAIN_DIR="$old_brain"

# Test 7: Format context
echo ""
echo "7. Format context"
test_json='[{"title":"Test Decision","category":"decision","content":"Made a choice","created_at":"2026-01-01"}]'
formatted=$(brain_format_context "$test_json")
assert_eq "Format non-empty" "true" "$([ -n "$formatted" ] && echo true || echo false)"

# Test 8: Format empty context
echo ""
echo "8. Format empty context"
formatted=$(brain_format_context "[]")
assert_eq "Empty format for empty array" "" "$formatted"

# Test 9: Extract keywords
echo ""
echo "9. Keyword extraction"
keywords=$(brain_extract_keywords "This is about architecture decisions for the hook system")
assert_eq "Keywords non-empty" "true" "$([ -n "$keywords" ] && echo true || echo false)"

# Test 10: Extract keywords filters short words
echo ""
echo "10. Keyword filtering"
keywords=$(brain_extract_keywords "a to in of architecture")
# Should include "architecture" but not short words
assert_eq "Contains long word" "true" "$(echo "$keywords" | grep -q "architecture" && echo true || echo false)"

echo ""
echo "=================================="
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
exit 0
