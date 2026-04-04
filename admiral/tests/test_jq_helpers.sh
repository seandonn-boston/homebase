#!/bin/bash
# Admiral Framework — jq Helpers Tests (Q-01)
# Tests for admiral/lib/jq_helpers.sh shared jq helper functions.
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

# shellcheck source=/dev/null
source "$PROJECT_DIR/admiral/lib/jq_helpers.sh"

PASS=0
FAIL=0
ERRORS=""

assert_eq() {
  local test_name="$1"
  local expected="$2"
  local actual="$3"
  if [ "$expected" = "$actual" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $test_name — expected '$expected', got '$actual'\n"
    echo "  [FAIL] $test_name — expected '$expected', got '$actual'"
  fi
}

assert_exit() {
  local test_name="$1"
  local expected_exit="$2"
  shift 2
  local rc=0
  "$@" >/dev/null 2>&1 || rc=$?
  if [ "$rc" -eq "$expected_exit" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $test_name — expected exit $expected_exit, got $rc\n"
    echo "  [FAIL] $test_name — expected exit $expected_exit, got $rc"
  fi
}

echo "=== jq Helpers Tests (Q-01) ==="
echo ""

# ─── jq_get ──────────────────────────────────────────────────────────

echo "--- jq_get ---"

SAMPLE='{"name":"alice","age":30,"nested":{"key":"val"}}'

assert_eq "get simple string field" \
  "alice" "$(jq_get "$SAMPLE" '.name')"

assert_eq "get numeric field" \
  "30" "$(jq_get "$SAMPLE" '.age')"

assert_eq "get nested field" \
  "val" "$(jq_get "$SAMPLE" '.nested.key')"

assert_eq "get missing field returns default" \
  "fallback" "$(jq_get "$SAMPLE" '.missing' 'fallback')"

assert_eq "get null field returns default" \
  "none" "$(jq_get '{"x":null}' '.x' 'none')"

assert_eq "get missing field with empty default" \
  "" "$(jq_get "$SAMPLE" '.missing')"

assert_eq "get from empty object returns default" \
  "def" "$(jq_get '{}' '.anything' 'def')"

assert_eq "get from invalid JSON returns default" \
  "safe" "$(jq_get 'not json' '.x' 'safe')"

# ─── jq_get_path ─────────────────────────────────────────────────────

echo ""
echo "--- jq_get_path ---"

STATE='{"hook_state":{"loop_detector":{"total_errors":5}},"tokens_used":1200}'

assert_eq "get_path simple field" \
  "1200" "$(jq_get_path "$STATE" 'tokens_used')"

assert_eq "get_path nested field" \
  "5" "$(jq_get_path "$STATE" 'hook_state.loop_detector.total_errors')"

assert_eq "get_path missing returns default" \
  "0" "$(jq_get_path "$STATE" 'hook_state.missing.field' '0')"

assert_eq "get_path from invalid JSON returns default" \
  "x" "$(jq_get_path 'broken' 'a.b' 'x')"

# ─── jq_set ──────────────────────────────────────────────────────────

echo ""
echo "--- jq_set ---"

assert_eq "set top-level numeric field" \
  '{"a":1,"b":42}' "$(jq_set '{"a":1,"b":2}' '.b' '42')"

assert_eq "set nested field" \
  '{"x":{"y":99}}' "$(jq_set '{"x":{"y":1}}' '.x.y' '99')"

assert_eq "set adds new field" \
  '{"a":1,"b":2}' "$(jq_set '{"a":1}' '.b' '2')"

assert_eq "set with JSON object value" \
  '{"state":{"count":1}}' "$(jq_set '{}' '.state' '{"count":1}')"

assert_eq "set on invalid JSON returns original" \
  "bad json" "$(jq_set 'bad json' '.x' '1')"

# ─── jq_set_string ──────────────────────────────────────────────────

echo ""
echo "--- jq_set_string ---"

assert_eq "set_string simple" \
  '{"name":"bob"}' "$(jq_set_string '{"name":"alice"}' '.name' 'bob')"

assert_eq "set_string with special chars" \
  '{"msg":"hello \"world\""}' "$(jq_set_string '{}' '.msg' 'hello "world"')"

# ─── jq_increment ───────────────────────────────────────────────────

echo ""
echo "--- jq_increment ---"

assert_eq "increment by default (1)" \
  '{"count":6}' "$(jq_increment '{"count":5}' '.count')"

assert_eq "increment by custom amount" \
  '{"count":15}' "$(jq_increment '{"count":10}' '.count' '5')"

assert_eq "increment missing field initializes to amount" \
  '{"count":1}' "$(jq_increment '{}' '.count')"

assert_eq "increment on invalid JSON returns original" \
  "nope" "$(jq_increment 'nope' '.x')"

# ─── jq_merge ────────────────────────────────────────────────────────

echo ""
echo "--- jq_merge ---"

assert_eq "merge adds key to object" \
  '{"a":1,"extra":{"b":2}}' "$(jq_merge '{"a":1}' 'extra' '{"b":2}')"

assert_eq "merge overwrites existing key" \
  '{"a":99}' "$(jq_merge '{"a":1}' 'a' '99')"

assert_eq "merge on invalid JSON returns original" \
  "bad" "$(jq_merge 'bad' 'k' '1')"

# ─── jq_build ────────────────────────────────────────────────────────

echo ""
echo "--- jq_build ---"

assert_eq "build simple object" \
  '{"name":"alice","role":"admin"}' "$(jq_build name alice role admin)"

assert_eq "build single pair" \
  '{"key":"val"}' "$(jq_build key val)"

assert_eq "build with no args" \
  '{}' "$(jq_build)"

# ─── jq_array_append ────────────────────────────────────────────────

echo ""
echo "--- jq_array_append ---"

assert_eq "append to empty array" \
  '["hello"]' "$(jq_array_append '[]' 'hello')"

assert_eq "append to existing array" \
  '["a","b","c"]' "$(jq_array_append '["a","b"]' 'c')"

assert_eq "append on invalid returns original" \
  "bad" "$(jq_array_append 'bad' 'x')"

# ─── jq_array_append_json ───────────────────────────────────────────

echo ""
echo "--- jq_array_append_json ---"

assert_eq "append JSON value to array" \
  '[{"x":1}]' "$(jq_array_append_json '[]' '{"x":1}')"

assert_eq "append number to array" \
  '[1,2,3]' "$(jq_array_append_json '[1,2]' '3')"

# ─── jq_length ───────────────────────────────────────────────────────

echo ""
echo "--- jq_length ---"

assert_eq "length of array" \
  "3" "$(jq_length '[1,2,3]')"

assert_eq "length of empty array" \
  "0" "$(jq_length '[]')"

assert_eq "length of object" \
  "2" "$(jq_length '{"a":1,"b":2}')"

assert_eq "length of invalid JSON" \
  "0" "$(jq_length 'bad')"

# ─── jq_is_valid ─────────────────────────────────────────────────────

echo ""
echo "--- jq_is_valid ---"

assert_exit "valid JSON passes" 0 jq_is_valid '{"a":1}'
assert_exit "valid array passes" 0 jq_is_valid '[1,2,3]'
assert_exit "invalid JSON fails" 1 jq_is_valid 'not json'
assert_exit "empty string fails" 1 jq_is_valid ''

# ─── jq_to_json_string ──────────────────────────────────────────────

echo ""
echo "--- jq_to_json_string ---"

assert_eq "simple string to JSON" \
  '"hello"' "$(jq_to_json_string 'hello')"

assert_eq "string with quotes" \
  '"say \"hi\""' "$(jq_to_json_string 'say "hi"')"

assert_eq "string with newline" \
  '"line1\nline2"' "$(jq_to_json_string "$(printf 'line1\nline2')")"

# ─── Summary ─────────────────────────────────────────────────────────

echo ""
echo "=== Results ==="
echo "  Passed: $PASS"
echo "  Failed: $FAIL"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  printf '%b' "$ERRORS"
  exit 1
fi

echo "  All tests passed."
exit 0
