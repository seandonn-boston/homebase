#!/bin/bash
# test_fleet_validator.sh — Tests for S-09 fleet configuration validator
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VALIDATOR="$PROJECT_ROOT/admiral/bin/validate_fleet.sh"

export CLAUDE_PROJECT_DIR="$PROJECT_ROOT"

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

assert_json_field() {
  local desc="$1" json="$2" field="$3" expected="$4"
  local actual
  actual=$(echo "$json" | tr -d '\r' | jq -r "$field" 2>/dev/null)
  assert_eq "$desc" "$expected" "$actual"
}

echo "Testing validate_fleet.sh (S-09)"
echo "================================="
echo ""

# Test 1: Current fleet config is valid
echo "1. Current fleet config validity"
exit_code=0
result=$(bash "$VALIDATOR" 2>/dev/null) || exit_code=$?
assert_eq "Exit code 0 (valid)" "0" "$exit_code"
assert_json_field "Status valid" "$result" '.status' "valid"

# Test 2: Agent count reported
echo ""
echo "2. Agent count"
agent_gt_zero=$(echo "$result" | tr -d '\r' | jq '.agent_count > 0')
assert_eq "Agent count > 0" "true" "$agent_gt_zero"

# Test 3: Zero errors
echo ""
echo "3. Error count"
err_count=$(echo "$result" | tr -d '\r' | jq '.error_count')
assert_eq "Zero errors" "0" "$err_count"

# Test 4: Output is valid JSON
echo ""
echo "4. Output validity"
json_valid=$(echo "$result" | tr -d '\r' | jq empty 2>/dev/null && echo true || echo false)
assert_eq "Output is valid JSON" "true" "$json_valid"

# Test 5: Test with invalid config (backup and restore)
echo ""
echo "5. Invalid config detection"
REGISTRY="$PROJECT_ROOT/admiral/config/fleet_registry.json"
BACKUP="$REGISTRY.bak"
cp "$REGISTRY" "$BACKUP"

# Create config with overlapping tools
jq '.agents[0].tools.denied += ["Read"]' "$REGISTRY" > "${REGISTRY}.tmp" && mv "${REGISTRY}.tmp" "$REGISTRY"

exit_code=0
result=$(bash "$VALIDATOR" 2>/dev/null) || exit_code=$?
assert_eq "Exit code 1 (invalid)" "1" "$exit_code"
assert_json_field "Status invalid" "$result" '.status' "invalid"
error_count=$(echo "$result" | tr -d '\r' | jq '.error_count')
assert_eq "Has errors" "true" "$([ "$error_count" -gt 0 ] && echo true || echo false)"

# Restore
mv "$BACKUP" "$REGISTRY"

# Test 6: Warnings structure
echo ""
echo "6. Warnings structure"
result=$(bash "$VALIDATOR" 2>/dev/null) || true
has_warnings=$(echo "$result" | tr -d '\r' | jq 'has("warnings")')
assert_eq "Has warnings array" "true" "$has_warnings"

# Test 7: Errors structure
echo ""
echo "7. Errors structure"
has_errors=$(echo "$result" | tr -d '\r' | jq 'has("errors")')
assert_eq "Has errors array" "true" "$has_errors"

echo ""
echo "================================="
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
exit 0
