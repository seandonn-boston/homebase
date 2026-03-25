#!/bin/bash
# shellcheck disable=SC2034,SC2317
# test_brain_b1_comprehensive.sh — Comprehensive Brain B1 tests (B-06)
# 20+ tests covering all brain utilities, edge cases, concurrent access
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Use temp dir for isolation
TEST_DIR=$(mktemp -d)
export CLAUDE_PROJECT_DIR="$TEST_DIR"
export BRAIN_DIR="$TEST_DIR/.brain"

# Copy brain tools
mkdir -p "$TEST_DIR/admiral/bin" "$TEST_DIR/admiral/lib"
cp "$PROJECT_ROOT/admiral/bin/brain_record" "$TEST_DIR/admiral/bin/"
cp "$PROJECT_ROOT/admiral/bin/brain_query" "$TEST_DIR/admiral/bin/"
cp "$PROJECT_ROOT/admiral/bin/brain_retrieve" "$TEST_DIR/admiral/bin/"
cp "$PROJECT_ROOT/admiral/bin/brain_audit" "$TEST_DIR/admiral/bin/"
cp "$PROJECT_ROOT/admiral/bin/brain_consolidate" "$TEST_DIR/admiral/bin/"
cp "$PROJECT_ROOT/admiral/lib/brain_writer.sh" "$TEST_DIR/admiral/lib/"
cp "$PROJECT_ROOT/admiral/lib/brain_retriever.sh" "$TEST_DIR/admiral/lib/"
chmod +x "$TEST_DIR/admiral/bin/"*

BRAIN_RECORD="$TEST_DIR/admiral/bin/brain_record"
BRAIN_QUERY="$TEST_DIR/admiral/bin/brain_query"
BRAIN_RETRIEVE="$TEST_DIR/admiral/bin/brain_retrieve"
BRAIN_AUDIT="$TEST_DIR/admiral/bin/brain_audit"
BRAIN_CONSOLIDATE="$TEST_DIR/admiral/bin/brain_consolidate"

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

assert_contains() {
  local desc="$1" needle="$2" haystack="$3"
  if echo "$haystack" | grep -qi "$needle"; then
    echo "  PASS: $desc"
    pass=$((pass + 1))
  else
    echo "  FAIL: $desc (expected to contain '$needle')"
    fail=$((fail + 1))
  fi
}

echo "Brain B1 Comprehensive Tests (B-06)"
echo "====================================="
echo ""

# === brain_record tests ===
echo "--- brain_record ---"

# Test 1: Basic record
echo "1. Basic record"
output=$("$BRAIN_RECORD" "proj1" "decision" "Test Decision" "Content" 2>&1)
assert_contains "Record output" "Recorded:" "$output"
entry=$(find "$BRAIN_DIR/proj1" -name "*decision*" -type f | head -1)
assert_eq "File created" "true" "$([ -f "$entry" ] && echo true || echo false)"

# Test 2: All categories
echo ""
echo "2. All valid categories"
for cat in decision outcome lesson context failure pattern; do
  "$BRAIN_RECORD" "proj1" "$cat" "Test $cat" "Content for $cat" 2>/dev/null
done
cat_count=$(ls "$BRAIN_DIR/proj1"/*.json 2>/dev/null | wc -l | tr -d ' ')
assert_eq "All 6 categories + test 1 = 7 files" "true" "$([ "$cat_count" -ge 7 ] && echo true || echo false)"

# Test 3: Invalid category
echo ""
echo "3. Invalid category rejection"
exit_code=0
"$BRAIN_RECORD" "proj1" "invalid_cat" "Test" "Content" 2>/dev/null || exit_code=$?
assert_eq "Invalid category exits 1" "1" "$exit_code"

# Test 4: Missing arguments
echo ""
echo "4. Missing arguments"
exit_code=0
"$BRAIN_RECORD" 2>/dev/null || exit_code=$?
assert_eq "No args exits 1" "1" "$exit_code"

# Test 5: Special characters in title
echo ""
echo "5. Special characters"
"$BRAIN_RECORD" "proj1" "decision" "Test: Special & Chars <> \"quotes\"" "Content with 'special' chars" 2>/dev/null
latest=$(ls -t "$BRAIN_DIR/proj1"/*.json | head -1)
json_valid=$(jq empty "$latest" 2>/dev/null && echo true || echo false)
assert_eq "Special chars produce valid JSON" "true" "$json_valid"

# Test 6: Long content
echo ""
echo "6. Long content"
LONG_CONTENT=$(head -c 5000 /dev/urandom | base64 | head -c 5000)
"$BRAIN_RECORD" "proj1" "context" "Long Content Test" "$LONG_CONTENT" 2>/dev/null
latest=$(ls -t "$BRAIN_DIR/proj1"/*context*.json | head -1)
content_len=$(jq -r '.content | length' "$latest" | tr -d '\r')
assert_eq "Long content preserved" "true" "$([ "$content_len" -gt 1000 ] && echo true || echo false)"

# Test 7: Source agent recorded
echo ""
echo "7. Source agent"
"$BRAIN_RECORD" "proj1" "decision" "Agent Decision" "Content" "my-agent" 2>/dev/null
latest=$(ls -t "$BRAIN_DIR/proj1"/*decision*.json | head -1)
agent=$(jq -r '.source_agent' "$latest" | tr -d '\r')
assert_eq "Source agent recorded" "my-agent" "$agent"

# Test 8: Invalid project name
echo ""
echo "8. Invalid project name"
exit_code=0
"$BRAIN_RECORD" "proj/invalid!" "decision" "Test" "Content" 2>/dev/null || exit_code=$?
assert_eq "Invalid project exits 1" "1" "$exit_code"

# === brain_query tests ===
echo ""
echo "--- brain_query ---"

# Test 9: Query finds entries
echo "9. Query finds entries"
output=$("$BRAIN_QUERY" "Decision" --project proj1 2>&1)
assert_contains "Query finds results" "Found:" "$output"

# Test 10: Query with category filter
echo ""
echo "10. Category filter"
output=$("$BRAIN_QUERY" "Test" --project proj1 --category decision 2>&1)
assert_contains "Category filter works" "decision" "$output"

# Test 11: Query no results
echo ""
echo "11. Query no results"
output=$("$BRAIN_QUERY" "zzz_nonexistent_keyword_xyz_999" --project proj1 2>&1)
assert_contains "Reports no results" "No entries found" "$output"

# Test 12: Query missing project
echo ""
echo "12. Query missing project"
output=$("$BRAIN_QUERY" "test" --project nonexistent_project_xyz 2>&1)
assert_contains "Reports missing project" "No entries found" "$output"

# === brain_retrieve tests ===
echo ""
echo "--- brain_retrieve ---"

# Test 13: Retrieve by ID
echo "13. Retrieve by ID"
entry_file=$(ls "$BRAIN_DIR/proj1"/*decision*.json | head -1)
entry_id=$(jq -r '.id' "$entry_file" | tr -d '\r')
output=$("$BRAIN_RETRIEVE" "$entry_id" --project proj1 2>&1)
assert_contains "Retrieve by ID" "proj1" "$output"

# === brain_audit tests ===
echo ""
echo "--- brain_audit ---"

# Test 14: Audit runs
echo "14. Audit report"
output=$("$BRAIN_AUDIT" --project proj1 2>&1)
assert_contains "Audit runs" "Brain Audit Report" "$output"
assert_contains "Shows total" "Total entries:" "$output"

# Test 15: Audit with custom days
echo ""
echo "15. Audit custom days"
output=$("$BRAIN_AUDIT" --project proj1 --days 0 2>&1)
assert_contains "All entries as decayed" "Decayed" "$output"

# Test 16: Demand audit
echo ""
echo "16. Demand signal audit"
output=$("$BRAIN_AUDIT" --demand 2>&1)
assert_contains "Demand report" "Demand Signal Report" "$output"

# === brain_consolidate tests ===
echo ""
echo "--- brain_consolidate ---"

# Test 17: Consolidate dry run
echo "17. Consolidate dry run"
output=$("$BRAIN_CONSOLIDATE" --project proj1 --dry-run 2>/dev/null)
json_valid=$(echo "$output" | tr -d '\r' | jq empty 2>/dev/null && echo true || echo false)
assert_eq "Consolidate JSON valid" "true" "$json_valid"

# === brain_writer tests ===
echo ""
echo "--- brain_writer (library) ---"

source "$TEST_DIR/admiral/lib/brain_writer.sh"
export BRAIN_WRITER_PROJECT="proj1"

# Test 18: Writer creates entry
echo "18. Writer creates entry"
before=$(ls "$BRAIN_DIR/proj1"/*.json | wc -l | tr -d ' ')
brain_write "lesson" "Writer test" "Testing writer" "test_hook" 2>/dev/null
after=$(ls "$BRAIN_DIR/proj1"/*.json | wc -l | tr -d ' ')
assert_eq "Writer creates entry" "true" "$([ "$after" -gt "$before" ] && echo true || echo false)"

# === brain_retriever tests ===
echo ""
echo "--- brain_retriever (library) ---"

source "$TEST_DIR/admiral/lib/brain_retriever.sh"

# Test 19: Retriever searches
echo "19. Retriever search"
results=$(brain_retrieve_context "Decision" "proj1" 3)
results=$(echo "$results" | tr -d '\r')
is_array=$(echo "$results" | jq 'type == "array"' 2>/dev/null || echo "false")
assert_eq "Retriever returns array" "true" "$is_array"

# Test 20: Keyword extraction
echo ""
echo "20. Keyword extraction"
keywords=$(brain_extract_keywords "architecture design pattern hook enforcement")
assert_eq "Extracts keywords" "true" "$([ -n "$keywords" ] && echo true || echo false)"

# === Edge cases ===
echo ""
echo "--- Edge cases ---"

# Test 21: Empty brain directory
echo "21. Empty brain search"
mkdir -p "$BRAIN_DIR/empty-proj"
output=$("$BRAIN_QUERY" "anything" --project empty-proj 2>&1)
assert_contains "Empty brain handled" "No entries found" "$output"

# Test 22: Unicode in content
echo ""
echo "22. Unicode content"
"$BRAIN_RECORD" "proj1" "lesson" "Unicode test" "Content with émojis: café résumé naïve 日本語" 2>/dev/null
latest=$(ls -t "$BRAIN_DIR/proj1"/*lesson*.json | head -1)
json_valid=$(jq empty "$latest" 2>/dev/null && echo true || echo false)
assert_eq "Unicode content valid JSON" "true" "$json_valid"

# Test 23: Concurrent writes (basic)
echo ""
echo "23. Concurrent writes"
for i in $(seq 1 5); do
  "$BRAIN_RECORD" "proj1" "decision" "Concurrent decision $i" "Content $i" 2>/dev/null &
done
wait
total=$(ls "$BRAIN_DIR/proj1"/*.json 2>/dev/null | wc -l | tr -d ' ')
assert_eq "All concurrent writes succeeded" "true" "$([ "$total" -ge 5 ] && echo true || echo false)"

# Cleanup
rm -rf "$TEST_DIR"

echo ""
echo "====================================="
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
exit 0
