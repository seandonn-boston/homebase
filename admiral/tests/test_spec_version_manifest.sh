#!/bin/bash
# Admiral Framework — Spec Version Manifest Tests
# Validates manifest structure, compliance counts, and file references.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
MANIFEST="$PROJECT_DIR/admiral/config/spec_version_manifest.json"

PASS=0
FAIL=0
ERRORS=""

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

echo "=== Spec Version Manifest Tests ==="
echo ""

# --- Structure Tests ---
echo "--- Structure ---"
assert_true "Manifest is valid JSON" "$(jq empty "$MANIFEST" 2>/dev/null && echo true || echo false)"
assert_true "Has spec_version" "$(jq -e '.spec_version' "$MANIFEST" >/dev/null 2>&1 && echo true || echo false)"
assert_true "Has control_plane_version" "$(jq -e '.control_plane_version' "$MANIFEST" >/dev/null 2>&1 && echo true || echo false)"
assert_true "Has last_audited" "$(jq -e '.last_audited' "$MANIFEST" >/dev/null 2>&1 && echo true || echo false)"
assert_true "Has components array" "$(jq -e '.components | type == "array"' "$MANIFEST" 2>/dev/null)"
assert_true "Has unimplemented_spec_areas" "$(jq -e '.unimplemented_spec_areas | type == "array"' "$MANIFEST" 2>/dev/null)"
assert_true "Has summary object" "$(jq -e '.summary | type == "object"' "$MANIFEST" 2>/dev/null)"

# --- Component Integrity ---
echo "--- Component Integrity ---"
TOTAL=$(jq '.components | length' "$MANIFEST")
assert_true "Has components" "$([ "$TOTAL" -gt 0 ] && echo true || echo false)"

# Every component has required fields
ALL_HAVE_ID=$(jq '[.components[] | select(.id == null or .id == "")] | length' "$MANIFEST")
ALL_HAVE_FILE=$(jq '[.components[] | select(.file == null or .file == "")] | length' "$MANIFEST")
ALL_HAVE_COMPLIANCE=$(jq '[.components[] | select(.compliance == null or .compliance == "")] | length' "$MANIFEST")
ALL_HAVE_PARTS=$(jq '[.components[] | select(.spec_parts | length == 0)] | length' "$MANIFEST")

assert_eq "All components have id" "0" "$ALL_HAVE_ID"
assert_eq "All components have file" "0" "$ALL_HAVE_FILE"
assert_eq "All components have compliance" "0" "$ALL_HAVE_COMPLIANCE"
assert_eq "All components have spec_parts" "0" "$ALL_HAVE_PARTS"

# Valid compliance values only
INVALID_COMPLIANCE=$(jq '[.components[] | select(.compliance != "full" and .compliance != "partial" and .compliance != "minimal" and .compliance != "none")] | length' "$MANIFEST")
assert_eq "All compliance values are valid" "0" "$INVALID_COMPLIANCE"

# --- Summary Consistency ---
echo "--- Summary Consistency ---"
SUMMARY_TOTAL=$(jq '.summary.total_components' "$MANIFEST")
FULL=$(jq '.summary.full_compliance' "$MANIFEST")
PARTIAL=$(jq '.summary.partial_compliance' "$MANIFEST")
MINIMAL=$(jq '.summary.minimal_compliance' "$MANIFEST")

assert_eq "Summary total matches component count" "$TOTAL" "$SUMMARY_TOTAL"

COUNTED_FULL=$(jq '[.components[] | select(.compliance == "full")] | length' "$MANIFEST")
COUNTED_PARTIAL=$(jq '[.components[] | select(.compliance == "partial")] | length' "$MANIFEST")
assert_eq "Summary full count matches actual" "$COUNTED_FULL" "$FULL"
assert_eq "Summary partial count matches actual" "$COUNTED_PARTIAL" "$PARTIAL"

SUM=$((FULL + PARTIAL + MINIMAL))
assert_eq "Compliance counts sum to total" "$TOTAL" "$SUM"

# --- File Existence (spot check key files) ---
echo "--- File Existence (spot checks) ---"
for comp_id in "state-management" "loop-detector" "reference-constants" "standing-orders"; do
  FILE=$(jq -r --arg id "$comp_id" '.components[] | select(.id == $id) | .file' "$MANIFEST")
  IFS=',' read -ra FILES <<< "$FILE"
  FIRST_FILE=$(echo "${FILES[0]}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  assert_true "$comp_id file exists ($FIRST_FILE)" "$([ -e "$PROJECT_DIR/$FIRST_FILE" ] && echo true || echo false)"
done

# --- Validator Script ---
echo "--- Validator Script ---"
VALIDATOR_EXIT=0
bash "$PROJECT_DIR/admiral/bin/validate_spec_manifest" > /dev/null 2>&1 || VALIDATOR_EXIT=$?
assert_eq "Validator passes cleanly" "0" "$VALIDATOR_EXIT"

# --- Spec Parts Reference Valid Parts ---
echo "--- Spec Parts Validity ---"
VALID_PARTS='["part1-strategy","part2-context","part3-enforcement","part4-fleet","part5-brain","part6-execution","part7-quality","part8-operations","part9-platform","part10-admiral","part11-protocols","part12-data-ecosystem","part13-mcp-integration"]'
INVALID_PARTS=$(jq --argjson valid "$VALID_PARTS" '[.components[].spec_parts[] | select(. as $p | $valid | index($p) | not)] | length' "$MANIFEST")
assert_eq "All spec_parts reference valid parts" "0" "$INVALID_PARTS"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
fi
exit 0
