#!/bin/bash
# Admiral Framework — Constants Sync Validation Tests
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADMIRAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VALIDATE="$ADMIRAL_DIR/bin/validate_constants_sync"
SHELL_REG="$ADMIRAL_DIR/config/reference_constants.sh"
JSON_REG="$ADMIRAL_DIR/config/reference_constants.json"

PASS=0
FAIL=0
ERRORS=""
TMPDIR_BASE=""

assert_exit_code() {
  local test_name="$1"
  local expected_code="$2"
  local actual_code="$3"
  if [ "$actual_code" -eq "$expected_code" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $test_name — expected exit $expected_code, got $actual_code\n"
    echo "  [FAIL] $test_name (expected exit $expected_code, got $actual_code)"
  fi
}

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
  fi
}

assert_eq() {
  local test_name="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" = "$expected" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $test_name — expected '$expected', got '$actual'\n"
    echo "  [FAIL] $test_name (expected '$expected', got '$actual')"
  fi
}

setup() {
  TMPDIR_BASE="$(mktemp -d)"
}

teardown() {
  rm -rf "$TMPDIR_BASE"
}

# ============================================================
echo "=== Prerequisite Checks ==="

if [ ! -f "$VALIDATE" ]; then
  echo "  [SKIP] validate_constants_sync not found"
  exit 1
fi
echo "  Validator found."

if [ ! -f "$JSON_REG" ]; then
  echo "  [SKIP] JSON registry not found"
  exit 1
fi

if jq empty "$JSON_REG" 2>/dev/null; then
  PASS=$((PASS + 1))
  echo "  [PASS] JSON registry is valid JSON"
else
  echo "  [FAIL] JSON registry is not valid JSON"
  exit 1
fi
echo ""

# ============================================================
echo "=== JSON Registry Structure ==="

for field in schema_version source description constants; do
  if [ "$(jq "has(\"$field\")" "$JSON_REG")" = "true" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] Has '$field' field"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] Missing '$field' field\n"
    echo "  [FAIL] Missing '$field' field"
  fi
done

json_count=$(jq '.constants | length' "$JSON_REG")
shell_count=$(grep -cE '^[A-Z_]+=' "$SHELL_REG")
assert_eq "JSON and shell have same constant count" "$shell_count" "$json_count"
echo ""

# ============================================================
echo "=== Sync Validation — In Sync ==="

rc=0
output=$("$VALIDATE" 2>&1) || rc=$?
assert_exit_code "Registries in sync (exit 0)" 0 "$rc"
assert_contains "Reports IN SYNC" "$output" "IN SYNC"
echo ""

# ============================================================
echo "=== Sync Validation — JSON Mode ==="

rc=0
output=$("$VALIDATE" --json 2>&1) || rc=$?
assert_exit_code "JSON mode exits 0" 0 "$rc"
if echo "$output" | jq empty 2>/dev/null; then
  PASS=$((PASS + 1))
  echo "  [PASS] JSON output is valid"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] JSON output is not valid JSON\n"
  echo "  [FAIL] JSON output is not valid JSON"
fi

status=$(echo "$output" | jq -r '.status')
assert_eq "JSON reports in_sync" "in_sync" "$status"

synced_count=$(echo "$output" | jq '.synced_count')
assert_eq "JSON synced count matches" "$json_count" "$synced_count"
echo ""

# ============================================================
echo "=== Spot-Check Key Constants ==="

# Verify specific constants match between shell and JSON
for const in TOOL_TOKENS_BASH LOOP_MAX_SAME_ERROR FLEET_MAX_AGENTS BRAIN_COSINE_MIN_SCORE; do
  source "$SHELL_REG"
  shell_val="${!const}"
  json_val=$(jq -r ".constants.$const" "$JSON_REG")
  # Handle numeric comparison (JSON may not have quotes)
  json_val="${json_val%$'\r'}"
  assert_eq "Constant $const matches" "$shell_val" "$json_val"
done
echo ""

# ============================================================
echo "========================================="
echo "Constants Sync Tests: $PASS passed, $FAIL failed"
echo "========================================="

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
fi
