#!/bin/bash
# Admiral Framework — Constants Sync Validation Tests
# Tests that the sync validator works correctly, including divergence detection.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

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

echo "=== Constants Sync Tests ==="
echo ""

# --- Happy path: validator passes on current codebase ---
echo "--- Happy Path ---"
SYNC_EXIT=0
bash "$PROJECT_DIR/admiral/bin/validate_constants_sync" > /dev/null 2>&1 || SYNC_EXIT=$?
assert_eq "Validator passes on synced codebase" "0" "$SYNC_EXIT"

# --- JSON registry structure ---
echo "--- JSON Registry Structure ---"
JSON_REG="$PROJECT_DIR/admiral/config/reference_constants.json"
assert_true "JSON registry is valid JSON" "$(jq empty "$JSON_REG" 2>/dev/null && echo true || echo false)"
assert_true "Has constants object" "$(jq -e '.constants | type == "object"' "$JSON_REG" 2>/dev/null)"
assert_true "Has tool_token_estimates" "$(jq -e '.constants.tool_token_estimates' "$JSON_REG" >/dev/null 2>&1 && echo true || echo false)"
assert_true "Has loop_detection" "$(jq -e '.constants.loop_detection' "$JSON_REG" >/dev/null 2>&1 && echo true || echo false)"
assert_true "Has token_budget_thresholds" "$(jq -e '.constants.token_budget_thresholds' "$JSON_REG" >/dev/null 2>&1 && echo true || echo false)"
assert_true "Has hook_timeouts_ms" "$(jq -e '.constants.hook_timeouts_ms' "$JSON_REG" >/dev/null 2>&1 && echo true || echo false)"
assert_true "Has fleet" "$(jq -e '.constants.fleet' "$JSON_REG" >/dev/null 2>&1 && echo true || echo false)"
assert_true "Has brain_query" "$(jq -e '.constants.brain_query' "$JSON_REG" >/dev/null 2>&1 && echo true || echo false)"

# --- Cross-check JSON vs SH values directly ---
echo "--- Cross-Check JSON vs SH ---"
# shellcheck source=/dev/null
source "$PROJECT_DIR/admiral/config/reference_constants.sh"

JSON_BASH=$(jq -r '.constants.tool_token_estimates.Bash' "$JSON_REG")
assert_eq "JSON Bash tokens matches SH" "$RC_TOKEN_BASH" "$JSON_BASH"

JSON_MAX_SAME=$(jq -r '.constants.loop_detection.max_same_error' "$JSON_REG")
assert_eq "JSON max_same_error matches SH" "$RC_MAX_SAME_ERROR" "$JSON_MAX_SAME"

JSON_WARNING=$(jq -r '.constants.token_budget_thresholds.warning_pct' "$JSON_REG")
assert_eq "JSON warning_pct matches SH" "$RC_BUDGET_WARNING_PCT" "$JSON_WARNING"

JSON_FLEET_MAX=$(jq -r '.constants.fleet.max_agents' "$JSON_REG")
assert_eq "JSON max_agents matches SH" "$RC_FLEET_MAX_AGENTS" "$JSON_FLEET_MAX"

# --- Not-happy path: divergence detection ---
echo "--- Not-Happy Path: Divergence Detection ---"
TEMP_DIR=$(mktemp -d)
cp "$JSON_REG" "$TEMP_DIR/reference_constants.json"

# Introduce a divergence in the temp copy
jq '.constants.tool_token_estimates.Bash = 999' "$TEMP_DIR/reference_constants.json" > "$TEMP_DIR/diverged.json"

# Temporarily swap the file to test detection
cp "$JSON_REG" "$TEMP_DIR/backup.json"
cp "$TEMP_DIR/diverged.json" "$JSON_REG"

DIV_EXIT=0
bash "$PROJECT_DIR/admiral/bin/validate_constants_sync" > /dev/null 2>&1 || DIV_EXIT=$?
assert_true "Validator detects divergence" "$([ "$DIV_EXIT" -ne 0 ] && echo true || echo false)"

# Restore original
cp "$TEMP_DIR/backup.json" "$JSON_REG"
rm -rf "$TEMP_DIR"

# Verify restore worked
RESTORE_EXIT=0
bash "$PROJECT_DIR/admiral/bin/validate_constants_sync" > /dev/null 2>&1 || RESTORE_EXIT=$?
assert_eq "Validator passes after restore" "0" "$RESTORE_EXIT"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
fi
exit 0
