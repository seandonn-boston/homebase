#!/bin/bash
# Admiral Framework — EDD Spec Library Tests (EDD-01)
# Tests for admiral/lib/edd_spec.sh evaluation spec functions.
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

# Use a temp directory for test specs
TEST_DIR=$(mktemp -d)
trap 'rm -rf "$TEST_DIR"' EXIT

# Override the specs directory for testing
export EDD_SPECS_DIR="$TEST_DIR/edd-specs"

# shellcheck source=/dev/null
source "$PROJECT_DIR/admiral/lib/edd_spec.sh"

# Override after sourcing since sourcing sets it from PROJECT_DIR
EDD_SPECS_DIR="$TEST_DIR/edd-specs"

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

echo "=== EDD Spec Library Tests (EDD-01) ==="
echo ""

# ─── edd_spec_path ───────────────────────────────────────────────────

echo "--- edd_spec_path ---"

SPEC_PATH=$(edd_spec_path "Q-01")
assert_eq "spec_path converts to lowercase" "true" "$(echo "$SPEC_PATH" | grep -q 'q_01.eval.json' && echo true || echo false)"

SPEC_PATH2=$(edd_spec_path "EDD-01")
assert_eq "spec_path handles multi-char prefix" "true" "$(echo "$SPEC_PATH2" | grep -q 'edd_01.eval.json' && echo true || echo false)"

# ─── edd_spec_exists ─────────────────────────────────────────────────

echo ""
echo "--- edd_spec_exists ---"

assert_exit "spec_exists returns 1 for missing spec" 1 edd_spec_exists "NONEXISTENT-99"

edd_ensure_dir
echo '{"task_id":"T-01","version":"1","deterministic":[{"name":"test","command":"true","expected_exit":0}]}' > "$EDD_SPECS_DIR/t_01.eval.json"

assert_exit "spec_exists returns 0 for existing spec" 0 edd_spec_exists "T-01"

# ─── edd_validate_spec ───────────────────────────────────────────────

echo ""
echo "--- edd_validate_spec ---"

# Valid spec
VALID_SPEC='{"task_id":"Q-01","version":"1","deterministic":[{"name":"test","command":"echo hi","expected_exit":0}]}'
RESULT=$(edd_validate_spec "$VALID_SPEC")
assert_eq "valid spec passes" '{"valid":true,"errors":[]}' "$RESULT"

# Missing task_id
MISSING_ID='{"version":"1","deterministic":[{"name":"test","command":"echo hi","expected_exit":0}]}'
assert_exit "missing task_id fails" 1 edd_validate_spec "$MISSING_ID"

# Missing version
MISSING_VER='{"task_id":"Q-01","deterministic":[{"name":"test","command":"echo hi","expected_exit":0}]}'
assert_exit "missing version fails" 1 edd_validate_spec "$MISSING_VER"

# Wrong version
WRONG_VER='{"task_id":"Q-01","version":"99","deterministic":[{"name":"test","command":"echo hi","expected_exit":0}]}'
assert_exit "wrong version fails" 1 edd_validate_spec "$WRONG_VER"

# Empty deterministic array
EMPTY_DET='{"task_id":"Q-01","version":"1","deterministic":[]}'
assert_exit "empty deterministic fails" 1 edd_validate_spec "$EMPTY_DET"

# Missing deterministic check fields
MISSING_CMD='{"task_id":"Q-01","version":"1","deterministic":[{"name":"test","expected_exit":0}]}'
assert_exit "missing command fails" 1 edd_validate_spec "$MISSING_CMD"

MISSING_NAME='{"task_id":"Q-01","version":"1","deterministic":[{"command":"true","expected_exit":0}]}'
assert_exit "missing name fails" 1 edd_validate_spec "$MISSING_NAME"

# Valid spec with probabilistic checks
PROB_SPEC='{"task_id":"Q-01","version":"1","deterministic":[{"name":"test","command":"true","expected_exit":0}],"probabilistic":[{"name":"looks good","description":"output is correct","verification_method":"agent_review"}]}'
PROB_RESULT=$(edd_validate_spec "$PROB_SPEC")
assert_eq "spec with probabilistic passes" '{"valid":true,"errors":[]}' "$PROB_RESULT"

# Invalid probabilistic (missing description)
BAD_PROB='{"task_id":"Q-01","version":"1","deterministic":[{"name":"test","command":"true","expected_exit":0}],"probabilistic":[{"name":"check","verification_method":"agent_review"}]}'
assert_exit "probabilistic missing description fails" 1 edd_validate_spec "$BAD_PROB"

# Invalid JSON
assert_exit "invalid JSON fails" 1 edd_validate_spec "not json"

# ─── edd_load_spec ───────────────────────────────────────────────────

echo ""
echo "--- edd_load_spec ---"

LOADED=$(edd_load_spec "T-01")
LOADED_ID=$(printf '%s' "$LOADED" | jq -r '.task_id')
assert_eq "load_spec returns correct task_id" "T-01" "$LOADED_ID"

MISSING=$(edd_load_spec "MISSING-99")
assert_eq "load_spec returns empty for missing" "" "$MISSING"

# ─── edd_save_spec ───────────────────────────────────────────────────

echo ""
echo "--- edd_save_spec ---"

echo "$VALID_SPEC" | edd_save_spec "Q-01"
assert_exit "saved spec exists" 0 test -f "$EDD_SPECS_DIR/q_01.eval.json"

SAVED=$(cat "$EDD_SPECS_DIR/q_01.eval.json")
SAVED_ID=$(printf '%s' "$SAVED" | jq -r '.task_id')
assert_eq "saved spec has correct task_id" "Q-01" "$SAVED_ID"

# Save invalid spec should fail
SAVE_RC=0
echo '{"invalid": true}' | edd_save_spec "BAD-01" 2>/dev/null || SAVE_RC=$?
assert_eq "saving invalid spec fails" "1" "$SAVE_RC"

# ─── edd_deterministic_count / edd_probabilistic_count ───────────────

echo ""
echo "--- count functions ---"

assert_eq "deterministic count" "1" "$(edd_deterministic_count "$VALID_SPEC")"
assert_eq "probabilistic count (none)" "0" "$(edd_probabilistic_count "$VALID_SPEC")"
assert_eq "probabilistic count (one)" "1" "$(edd_probabilistic_count "$PROB_SPEC")"

MULTI_DET='{"task_id":"X-01","version":"1","deterministic":[{"name":"a","command":"true","expected_exit":0},{"name":"b","command":"true","expected_exit":0},{"name":"c","command":"true","expected_exit":0}]}'
assert_eq "deterministic count multiple" "3" "$(edd_deterministic_count "$MULTI_DET")"

# ─── edd_list_specs ──────────────────────────────────────────────────

echo ""
echo "--- edd_list_specs ---"

LIST=$(edd_list_specs)
LIST_COUNT=$(printf '%s' "$LIST" | jq 'length')
assert_eq "list_specs returns correct count" "2" "$LIST_COUNT"

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
