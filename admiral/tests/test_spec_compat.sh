#!/bin/bash
# Admiral Framework — Spec Compatibility Assessment Tests
# Tests impact template, migration template, and spec diff tool.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

PASS=0
FAIL=0
ERRORS=""

assert_true() {
  local test_name="$1"
  local condition="$2"
  if [ "$condition" = "true" ] || [ "$condition" = "0" ]; then
    PASS=$((PASS + 1))
    echo "  PASS: $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  FAIL: $test_name\n"
    echo "  FAIL: $test_name"
  fi
}

assert_eq() {
  local test_name="$1"
  local expected="$2"
  local actual="$3"
  if [ "$expected" = "$actual" ]; then
    PASS=$((PASS + 1))
    echo "  PASS: $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  FAIL: $test_name (expected '$expected', got '$actual')\n"
    echo "  FAIL: $test_name (expected '$expected', got '$actual')"
  fi
}

assert_contains() {
  local test_name="$1"
  local haystack="$2"
  local needle="$3"
  if echo "$haystack" | grep -qF "$needle"; then
    PASS=$((PASS + 1))
    echo "  PASS: $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  FAIL: $test_name (expected to contain '$needle')\n"
    echo "  FAIL: $test_name (expected to contain '$needle')"
  fi
}

echo "=== Spec Compatibility Assessment Tests ==="
echo ""

# --- Impact Template ---
echo "--- Impact Assessment Template ---"
IMPACT="$PROJECT_DIR/docs/spec-proposals/evolution/impact-assessment-template.md"
assert_true "Impact template exists" "$([ -f "$IMPACT" ] && echo true || echo false)"
IMPACT_CONTENT=$(cat "$IMPACT")
assert_contains "Template has Change ID" "$IMPACT_CONTENT" "Change ID"
assert_contains "Template has Breaking classification" "$IMPACT_CONTENT" "Breaking"
assert_contains "Template has Additive classification" "$IMPACT_CONTENT" "Additive"
assert_contains "Template has Cosmetic classification" "$IMPACT_CONTENT" "Cosmetic"
assert_contains "Template has Impact Assessment" "$IMPACT_CONTENT" "Impact Assessment"
assert_contains "Template has Migration Requirements" "$IMPACT_CONTENT" "Migration Requirements"
assert_contains "Template has Rollback" "$IMPACT_CONTENT" "Rollback"
assert_contains "Template has Risk Assessment" "$IMPACT_CONTENT" "Risk Assessment"

# --- Migration Guide Template ---
echo "--- Migration Guide Template ---"
MIGRATION="$PROJECT_DIR/docs/spec-proposals/evolution/migration-guide-template.md"
assert_true "Migration template exists" "$([ -f "$MIGRATION" ] && echo true || echo false)"
MIGRATION_CONTENT=$(cat "$MIGRATION")
assert_contains "Migration has Prerequisites" "$MIGRATION_CONTENT" "Prerequisites"
assert_contains "Migration has Preparation phase" "$MIGRATION_CONTENT" "Preparation"
assert_contains "Migration has Implementation phase" "$MIGRATION_CONTENT" "Implementation"
assert_contains "Migration has Verification phase" "$MIGRATION_CONTENT" "Verification"
assert_contains "Migration has Rollback Plan" "$MIGRATION_CONTENT" "Rollback Plan"
assert_contains "Migration references validate_constants_sync" "$MIGRATION_CONTENT" "validate_constants_sync"
assert_contains "Migration references spec_freshness" "$MIGRATION_CONTENT" "spec_freshness"

# --- Spec Diff Tool ---
echo "--- Spec Diff Tool ---"
assert_true "spec_diff exists" "$([ -f "$PROJECT_DIR/admiral/bin/spec_diff" ] && echo true || echo false)"
assert_true "spec_diff is executable" "$([ -x "$PROJECT_DIR/admiral/bin/spec_diff" ] && echo true || echo false)"

# Happy path: runs cleanly
DIFF_EXIT=0
bash "$PROJECT_DIR/admiral/bin/spec_diff" > /dev/null 2>&1 || DIFF_EXIT=$?
assert_eq "spec_diff runs cleanly" "0" "$DIFF_EXIT"

# JSON mode produces valid JSON
JSON_OUT=$(bash "$PROJECT_DIR/admiral/bin/spec_diff" --json 2>/dev/null)
assert_true "spec_diff --json is valid JSON" "$(echo "$JSON_OUT" | jq empty 2>/dev/null && echo true || echo false)"

# JSON has expected structure
assert_true "JSON has changes array" "$(echo "$JSON_OUT" | jq -e '.changes | type == "array"' 2>/dev/null)"
assert_true "JSON has summary" "$(echo "$JSON_OUT" | jq -e '.summary' 2>/dev/null >/dev/null 2>&1 && echo true || echo false)"
assert_true "JSON summary has total" "$(echo "$JSON_OUT" | jq -e '.summary.total' 2>/dev/null >/dev/null 2>&1 && echo true || echo false)"

# Not-happy path: invalid args
BAD_EXIT=0
bash "$PROJECT_DIR/admiral/bin/spec_diff" --bogus 2>/dev/null || BAD_EXIT=$?
assert_true "spec_diff rejects bad args" "$([ "$BAD_EXIT" -ne 0 ] && echo true || echo false)"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
fi
exit 0
