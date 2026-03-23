#!/usr/bin/env bash
# Tests for admiral/lib/hook_utils.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="$SCRIPT_DIR/../lib"

source "$SCRIPT_DIR/test_helpers.sh"

# --- hook_log ---
stderr_output=$(HOOK_NAME="test_hook" bash -c "source $LIB_DIR/hook_utils.sh; hook_log info 'test message' '{\"key\":\"val\"}'" 2>&1 >/dev/null)
level=$(echo "$stderr_output" | jq -r '.level')
assert_eq "hook_log: level field" "info" "$level"
component=$(echo "$stderr_output" | jq -r '.component')
assert_eq "hook_log: component field" "test_hook" "$component"
msg=$(echo "$stderr_output" | jq -r '.message')
assert_eq "hook_log: message field" "test message" "$msg"
ctx_key=$(echo "$stderr_output" | jq -r '.context.key')
assert_eq "hook_log: context field" "val" "$ctx_key"
ts=$(echo "$stderr_output" | jq -r '.timestamp')
assert_eq "hook_log: timestamp present" "1" "$((${#ts} > 5 ? 1 : 0))"

# hook_log with default context
stderr_output=$(HOOK_NAME="test_hook" bash -c "source $LIB_DIR/hook_utils.sh; hook_log warn 'no context'" 2>&1 >/dev/null)
ctx=$(echo "$stderr_output" | jq -c '.context')
assert_eq "hook_log: default context is empty object" "{}" "$ctx"

# --- hook_pass ---
rc=0
stdout=$(HOOK_NAME="test" bash -c "source $LIB_DIR/hook_utils.sh; hook_pass '{\"result\":\"ok\"}'" 2>/dev/null) || rc=$?
assert_eq "hook_pass: exit code 0" "0" "$rc"
result=$(echo "$stdout" | jq -r '.result')
assert_eq "hook_pass: stdout output" "ok" "$result"

rc=0
stdout=$(HOOK_NAME="test" bash -c "source $LIB_DIR/hook_utils.sh; hook_pass" 2>/dev/null) || rc=$?
assert_eq "hook_pass: exit code 0 without output" "0" "$rc"
assert_eq "hook_pass: empty stdout when no arg" "" "$stdout"

# --- hook_fail_soft ---
rc=0
stderr_output=$(HOOK_NAME="test" bash -c "source $LIB_DIR/hook_utils.sh; hook_fail_soft 'soft failure'" 2>&1 >/dev/null) || rc=$?
assert_eq "hook_fail_soft: exit code 0" "0" "$rc"
level=$(echo "$stderr_output" | jq -r '.level')
assert_eq "hook_fail_soft: logs warn level" "warn" "$level"

# --- hook_fail_hard ---
rc=0
stderr_output=$(HOOK_NAME="test" bash -c "source $LIB_DIR/hook_utils.sh; hook_fail_hard 'hard failure'" 2>&1 >/dev/null) || rc=$?
assert_eq "hook_fail_hard: exit code 2" "2" "$rc"
level=$(echo "$stderr_output" | jq -r '.level')
assert_eq "hook_fail_hard: logs error level" "error" "$level"

# --- hook_error ---
rc=0
stderr_output=$(HOOK_NAME="test" bash -c "source $LIB_DIR/hook_utils.sh; hook_error 'something broke'" 2>&1 >/dev/null) || rc=$?
assert_eq "hook_error: exit code 1" "1" "$rc"
level=$(echo "$stderr_output" | jq -r '.level')
assert_eq "hook_error: logs error level" "error" "$level"

# --- hook_disabled ---
rc=0
stderr_output=$(HOOK_NAME="test" bash -c "source $LIB_DIR/hook_utils.sh; hook_disabled 'turned off'" 2>&1 >/dev/null) || rc=$?
assert_eq "hook_disabled: exit code 126" "126" "$rc"
level=$(echo "$stderr_output" | jq -r '.level')
assert_eq "hook_disabled: logs info level" "info" "$level"

# --- hook_require_dep ---
rc=0
HOOK_NAME="test" bash -c "source $LIB_DIR/hook_utils.sh; hook_require_dep jq" 2>/dev/null || rc=$?
assert_eq "hook_require_dep: jq exists, exit 0" "0" "$rc"

rc=0
HOOK_NAME="test" bash -c "source $LIB_DIR/hook_utils.sh; hook_require_dep nonexistent_binary_xyz" 2>/dev/null || rc=$?
assert_eq "hook_require_dep: missing dep, exit 4" "4" "$rc"

# --- Summary ---
report_results "hook_utils tests"
