#!/bin/bash
# Admiral Framework — Hook Config Library Tests (Q-04)
# Tests for admiral/lib/hook_config.sh centralized config access.
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

# shellcheck source=/dev/null
source "$PROJECT_DIR/admiral/lib/hook_config.sh"

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

echo "=== Hook Config Library Tests (Q-04) ==="
echo ""

# Force reload to ensure fresh state
config_reload

# ─── config_get ──────────────────────────────────────────────────────

echo "--- config_get ---"

assert_eq "get hooks.maxSameError" "3" "$(config_get '.hooks.maxSameError' '99')"
assert_eq "get hooks.maxTotalErrors" "10" "$(config_get '.hooks.maxTotalErrors' '99')"
assert_eq "get hooks.successDecay" "1" "$(config_get '.hooks.successDecay' '99')"
assert_eq "get missing field returns default" "42" "$(config_get '.nonexistent.field' '42')"
assert_eq "get tokenEstimates.Bash" "500" "$(config_get '.tokenEstimates.Bash' '0')"
assert_eq "get tokenEstimates.Agent" "5000" "$(config_get '.tokenEstimates.Agent' '0')"

# ─── config_get_int ──────────────────────────────────────────────────

echo ""
echo "--- config_get_int ---"

assert_eq "get_int hooks.maxSameError" "3" "$(config_get_int '.hooks.maxSameError' '99')"
assert_eq "get_int missing returns default" "7" "$(config_get_int '.missing' '7')"

# ─── config_get_bool ─────────────────────────────────────────────────

echo ""
echo "--- config_get_bool ---"

assert_eq "get_bool detector.spcEnabled" "true" "$(config_get_bool '.detector.spcEnabled' 'false')"
assert_eq "get_bool missing returns default" "false" "$(config_get_bool '.missing' 'false')"

# ─── Shortcut functions ─────────────────────────────────────────────

echo ""
echo "--- shortcut functions ---"

assert_eq "config_max_same_error" "3" "$(config_max_same_error)"
assert_eq "config_max_total_errors" "10" "$(config_max_total_errors)"
assert_eq "config_success_decay" "1" "$(config_success_decay)"
assert_eq "config_budget_warning_pct" "90" "$(config_budget_warning_pct)"
assert_eq "config_token_estimate Bash" "500" "$(config_token_estimate 'Bash')"
assert_eq "config_token_estimate Agent" "5000" "$(config_token_estimate 'Agent')"
assert_eq "config_token_estimate unknown" "500" "$(config_token_estimate 'UnknownTool')"
assert_eq "config_max_repeated_tool_calls" "5" "$(config_max_repeated_tool_calls)"
assert_eq "config_spc_enabled" "true" "$(config_spc_enabled)"

# ─── Secret detection ───────────────────────────────────────────────

echo ""
echo "--- secret detection ---"

assert_exit "detects password=" 0 config_has_secrets 'password= secret123'
assert_exit "detects api_key=" 0 config_has_secrets 'api_key= sk-abc'
assert_exit "detects AWS_ACCESS_KEY" 0 config_has_secrets 'AWS_ACCESS_KEY_ID=AKIA...'
assert_exit "detects BEGIN RSA" 0 config_has_secrets '-----BEGIN RSA PRIVATE KEY-----'
assert_exit "clean content passes" 1 config_has_secrets 'just normal code here'
assert_exit "empty content passes" 1 config_has_secrets ''

assert_exit "sensitive .env path" 0 config_is_sensitive_path '/tmp/config.env'
assert_exit "sensitive .pem path" 0 config_is_sensitive_path '/tmp/cert.pem'
assert_exit "sensitive credentials path" 0 config_is_sensitive_path '/tmp/credentials.json'
assert_exit "normal path passes" 1 config_is_sensitive_path '/tmp/readme.md'
assert_exit "normal .ts path passes" 1 config_is_sensitive_path 'src/index.ts'

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
