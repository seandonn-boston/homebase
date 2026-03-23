#!/usr/bin/env bash
# Tests for admiral/lib/jq_helpers.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/jq_helpers.sh"

PASS=0
FAIL=0

assert_eq() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    echo "FAIL: $desc"
    echo "  expected: $expected"
    echo "  actual:   $actual"
  fi
}

assert_exit() {
  local desc="$1" expected_code="$2"
  shift 2
  local actual_code=0
  "$@" || actual_code=$?
  if [ "$expected_code" = "$actual_code" ]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    echo "FAIL: $desc (expected exit $expected_code, got $actual_code)"
  fi
}

# --- jq_get_field ---
result=$(echo '{"name":"Admiral","version":2}' | jq_get_field '.name' '')
assert_eq "jq_get_field: extract string field" "Admiral" "$result"

result=$(echo '{"name":"Admiral","version":2}' | jq_get_field '.version' '0')
assert_eq "jq_get_field: extract numeric field" "2" "$result"

result=$(echo '{"name":"Admiral"}' | jq_get_field '.missing' 'fallback')
assert_eq "jq_get_field: returns default for missing field" "fallback" "$result"

result=$(echo '{"nested":{"deep":"value"}}' | jq_get_field '.nested.deep' '')
assert_eq "jq_get_field: nested field access" "value" "$result"

result=$(echo '{}' | jq_get_field '.any' 'default_val')
assert_eq "jq_get_field: empty object returns default" "default_val" "$result"

result=$(echo 'not json' | jq_get_field '.field' 'safe')
assert_eq "jq_get_field: invalid JSON returns default" "safe" "$result"

# --- jq_set_field ---
result=$(echo '{"name":"old"}' | jq_set_field '.name' 'new' | jq -c .)
expected='{"name":"new"}'
assert_eq "jq_set_field: set string field" "$expected" "$result"

result=$(echo '{"a":1}' | jq_set_field '.b' 'hello')
# jq output includes both keys
echo "$result" | jq_validate
assert_eq "jq_set_field: add new field (valid json)" "0" "$?"
field_val=$(echo "$result" | jq -r '.b')
assert_eq "jq_set_field: new field value" "hello" "$field_val"

# --- jq_set_field_raw ---
result=$(echo '{"count":0}' | jq_set_field_raw '.count' '42')
val=$(echo "$result" | jq -r '.count')
assert_eq "jq_set_field_raw: set numeric field" "42" "$val"

result=$(echo '{"flag":false}' | jq_set_field_raw '.flag' 'true')
val=$(echo "$result" | jq -r '.flag')
assert_eq "jq_set_field_raw: set boolean field" "true" "$val"

result=$(echo '{}' | jq_set_field_raw '.obj' '{"key":"val"}')
val=$(echo "$result" | jq -r '.obj.key')
assert_eq "jq_set_field_raw: set object field" "val" "$val"

# --- jq_array_append ---
result=$(echo '{"items":[1,2]}' | jq_array_append '.items' '3')
len=$(echo "$result" | jq '.items | length')
assert_eq "jq_array_append: array length after append" "3" "$len"
last=$(echo "$result" | jq '.items[-1]')
assert_eq "jq_array_append: appended element" "3" "$last"

result=$(echo '{"items":[]}' | jq_array_append '.items' '"hello"')
val=$(echo "$result" | jq -r '.items[0]')
assert_eq "jq_array_append: append to empty array" "hello" "$val"

# --- jq_validate ---
echo '{"valid": true}' | jq_validate
assert_eq "jq_validate: valid JSON" "0" "$?"

rc=0
echo 'not json' | jq_validate || rc=$?
assert_eq "jq_validate: invalid JSON returns nonzero" "1" "$((rc > 0 ? 1 : 0))"

rc2=0
echo '{broken' | jq_validate || rc2=$?
assert_eq "jq_validate: malformed JSON returns nonzero" "1" "$((rc2 > 0 ? 1 : 0))"

# --- jq_enrich ---
result=$(echo '{"tool":"read"}' | jq_enrich '{"tokens":100}')
val=$(echo "$result" | jq -r '.session_state.tokens')
assert_eq "jq_enrich: adds session_state" "100" "$val"
orig=$(echo "$result" | jq -r '.tool')
assert_eq "jq_enrich: preserves original fields" "read" "$orig"

# --- jq_build_output ---
result=$(jq_build_output "loop_detector" '{"count":5}' "loop detected")
hook_val=$(echo "$result" | jq -r '.hook_state.loop_detector.count')
assert_eq "jq_build_output: hook state present" "5" "$hook_val"
alert_val=$(echo "$result" | jq -r '.alert')
assert_eq "jq_build_output: alert present" "loop detected" "$alert_val"

result=$(jq_build_output "zero_trust" '{"valid":true}')
hook_val=$(echo "$result" | jq -r '.hook_state.zero_trust.valid')
assert_eq "jq_build_output: without alert" "true" "$hook_val"
alert_val=$(echo "$result" | jq -r '.alert // "none"')
assert_eq "jq_build_output: no alert field when empty" "none" "$alert_val"

# --- jq_read_config ---
TMPCONFIG=$(mktemp)
echo '{"hooks":{"maxError":5},"debug":true}' > "$TMPCONFIG"

result=$(jq_read_config "$TMPCONFIG" '.hooks.maxError' '3')
assert_eq "jq_read_config: reads existing value" "5" "$result"

result=$(jq_read_config "$TMPCONFIG" '.hooks.missing' 'default_val')
assert_eq "jq_read_config: returns default for missing" "default_val" "$result"

result=$(jq_read_config "/nonexistent/file.json" '.any' 'fallback')
assert_eq "jq_read_config: returns default for missing file" "fallback" "$result"

rm -f "$TMPCONFIG"

# --- Summary ---
echo ""
echo "jq_helpers tests: $PASS passed, $FAIL failed"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
