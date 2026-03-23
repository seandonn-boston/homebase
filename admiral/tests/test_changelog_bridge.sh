#!/bin/bash
# Admiral Framework — Changelog Bridge Tests
# Validates bridge structure, freshness scoring, and drift flags.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BRIDGE="$PROJECT_DIR/admiral/config/spec_changelog_bridge.json"

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

echo "=== Changelog Bridge Tests ==="
echo ""

# --- Structure ---
echo "--- Structure ---"
assert_true "Bridge is valid JSON" "$(jq empty "$BRIDGE" 2>/dev/null && echo true || echo false)"
assert_true "Has current_spec_version" "$(jq -e '.current_spec_version' "$BRIDGE" >/dev/null 2>&1 && echo true || echo false)"
assert_true "Has implementation_target_version" "$(jq -e '.implementation_target_version' "$BRIDGE" >/dev/null 2>&1 && echo true || echo false)"
assert_true "Has freshness object" "$(jq -e '.freshness | type == "object"' "$BRIDGE" 2>/dev/null)"
assert_true "Has version_map array" "$(jq -e '.version_map | type == "array"' "$BRIDGE" 2>/dev/null)"
assert_true "Has drift_flags array" "$(jq -e '.drift_flags | type == "array"' "$BRIDGE" 2>/dev/null)"

# --- Freshness ---
echo "--- Freshness ---"
SCORE=$(jq '.freshness.score_pct' "$BRIDGE")
assert_true "Freshness score is 0-100" "$([ "$SCORE" -ge 0 ] && [ "$SCORE" -le 100 ] && echo true || echo false)"
RATING=$(jq -r '.freshness.rating' "$BRIDGE")
assert_true "Rating is valid" "$(echo "$RATING" | grep -qE '^(fresh|aging|stale|outdated)$' && echo true || echo false)"

# --- Version Map ---
echo "--- Version Map ---"
VERSIONS=$(jq '.version_map | length' "$BRIDGE")
assert_true "Has version entries" "$([ "$VERSIONS" -gt 0 ] && echo true || echo false)"

# Every entry has required fields
MISSING_VER=$(jq '[.version_map[] | select(.spec_version == null or .spec_version == "")] | length' "$BRIDGE")
MISSING_STATUS=$(jq '[.version_map[] | select(.implementation_status == null)] | length' "$BRIDGE")
assert_eq "All entries have spec_version" "0" "$MISSING_VER"
assert_eq "All entries have implementation_status" "0" "$MISSING_STATUS"

# Valid status values
INVALID_STATUS=$(jq '[.version_map[] | select(.implementation_status != "full" and .implementation_status != "partial" and .implementation_status != "none")] | length' "$BRIDGE")
assert_eq "All statuses are valid" "0" "$INVALID_STATUS"

# Every entry has both change lists
MISSING_IMPL=$(jq '[.version_map[] | select(.changes_implemented == null)] | length' "$BRIDGE")
MISSING_NOT=$(jq '[.version_map[] | select(.changes_not_implemented == null)] | length' "$BRIDGE")
assert_eq "All entries have changes_implemented" "0" "$MISSING_IMPL"
assert_eq "All entries have changes_not_implemented" "0" "$MISSING_NOT"

# --- Drift Flags ---
echo "--- Drift Flags ---"
TOTAL_DRIFT=$(jq '.drift_flags | length' "$BRIDGE")
assert_true "Has drift flags" "$([ "$TOTAL_DRIFT" -gt 0 ] && echo true || echo false)"

# Valid severity values
INVALID_SEV=$(jq '[.drift_flags[] | select(.severity != "high" and .severity != "medium" and .severity != "low")] | length' "$BRIDGE")
assert_eq "All severities are valid" "0" "$INVALID_SEV"

# Every flag has required fields
MISSING_AREA=$(jq '[.drift_flags[] | select(.area == null or .area == "")] | length' "$BRIDGE")
MISSING_DESC=$(jq '[.drift_flags[] | select(.description == null or .description == "")] | length' "$BRIDGE")
assert_eq "All flags have area" "0" "$MISSING_AREA"
assert_eq "All flags have description" "0" "$MISSING_DESC"

# --- Freshness Tool ---
echo "--- Freshness Tool ---"
TOOL_EXIT=0
bash "$PROJECT_DIR/admiral/bin/spec_freshness" > /dev/null 2>&1 || TOOL_EXIT=$?
assert_eq "spec_freshness runs cleanly" "0" "$TOOL_EXIT"

JSON_OUTPUT=$(bash "$PROJECT_DIR/admiral/bin/spec_freshness" --json 2>/dev/null)
assert_true "spec_freshness --json produces valid JSON" "$(echo "$JSON_OUTPUT" | jq empty 2>/dev/null && echo true || echo false)"
JSON_SCORE=$(echo "$JSON_OUTPUT" | jq '.freshness_score')
assert_eq "JSON score matches bridge" "$SCORE" "$JSON_SCORE"

# --- Not-Happy Path: Invalid bridge ---
echo "--- Not-Happy Path ---"
TEMP_BAD=$(mktemp)
echo "not json" > "$TEMP_BAD"
BAD_EXIT=0
bash "$PROJECT_DIR/admiral/bin/spec_freshness" "$TEMP_BAD" > /dev/null 2>&1 || BAD_EXIT=$?
assert_true "Rejects invalid JSON bridge" "$([ "$BAD_EXIT" -ne 0 ] && echo true || echo false)"

TEMP_MISSING=$(mktemp -u)
MISS_EXIT=0
bash "$PROJECT_DIR/admiral/bin/spec_freshness" "$TEMP_MISSING" > /dev/null 2>&1 || MISS_EXIT=$?
assert_true "Rejects missing bridge file" "$([ "$MISS_EXIT" -ne 0 ] && echo true || echo false)"
rm -f "$TEMP_BAD"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
fi
exit 0
