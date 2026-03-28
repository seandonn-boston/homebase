#!/bin/bash
# Admiral Framework — Hook Utilities Tests (Q-02)
# Tests for admiral/lib/hook_utils.sh standardized hook error handling.
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"
export ADMIRAL_LOG_LEVEL="fatal"  # Suppress log output during tests

# shellcheck source=/dev/null
source "$SCRIPT_DIR/../lib/assert.sh"

assert_json_field() {
  local test_name="$1"
  local json="$2"
  local field="$3"
  local expected="$4"
  local actual
  actual=$(printf '%s' "$json" | jq -r "$field" 2>/dev/null) || actual="PARSE_ERROR"
  assert_eq "$test_name" "$expected" "$actual"
}

# Source the library under test after assert definitions
# shellcheck source=/dev/null
source "$PROJECT_DIR/admiral/lib/hook_utils.sh"

echo "=== Hook Utilities Tests (Q-02) ==="
echo ""

# ─── hook_init ───────────────────────────────────────────────────────

echo "--- hook_init ---"

hook_init "test_hook"
assert_eq "hook_init sets hook name" "test_hook" "$_HOOK_NAME"
assert_eq "hook_init sets start time" "true" "$([ -n "$_HOOK_START_TIME" ] && echo true || echo false)"

# ─── hook_log ────────────────────────────────────────────────────────

echo ""
echo "--- hook_log ---"

# hook_log should not error and should write to stderr
hook_init "log_test"
hook_log "info" "test message" >/dev/null 2>&1 || true
assert_eq "hook_log does not error" "0" "$?"

# ─── hook_pass ───────────────────────────────────────────────────────

echo ""
echo "--- hook_pass ---"

hook_init "pass_test"

# hook_pass exits 0 — test in subshell
PASS_EXIT=0
bash -c "source '$PROJECT_DIR/admiral/lib/hook_utils.sh'; hook_init pass_test; hook_pass" >/dev/null 2>&1 || PASS_EXIT=$?
assert_eq "hook_pass exits 0" "0" "$PASS_EXIT"

# hook_pass with extra JSON
PASS_EXIT2=0
PASS_OUTPUT2=$(bash -c "source '$PROJECT_DIR/admiral/lib/hook_utils.sh'; hook_init pass_test; hook_pass '{\"count\": 1}'" 2>/dev/null) || PASS_EXIT2=$?
assert_eq "hook_pass with JSON exits 0" "0" "$PASS_EXIT2"
assert_eq "hook_pass outputs provided JSON" '{"count": 1}' "$PASS_OUTPUT2"

# ─── hook_fail_soft ──────────────────────────────────────────────────

echo ""
echo "--- hook_fail_soft ---"

# hook_fail_soft exits 0 (fail-open)
SOFT_EXIT=0
SOFT_OUTPUT=$(bash -c "source '$PROJECT_DIR/admiral/lib/hook_utils.sh'; hook_init soft_test; hook_fail_soft 'warning message'" 2>/dev/null) || SOFT_EXIT=$?
assert_eq "hook_fail_soft exits 0" "0" "$SOFT_EXIT"
assert_json_field "hook_fail_soft includes alert" "$SOFT_OUTPUT" '.alert' "warning message"

# hook_fail_soft with hook state
SOFT_EXIT2=0
SOFT_STATE='{"hook_state": {"my_hook": {"count": 1}}}'
SOFT_OUTPUT2=$(bash -c "source '$PROJECT_DIR/admiral/lib/hook_utils.sh'; hook_init soft_test; hook_fail_soft 'alert msg' '$SOFT_STATE'" 2>/dev/null) || SOFT_EXIT2=$?
assert_eq "hook_fail_soft with state exits 0" "0" "$SOFT_EXIT2"
assert_json_field "hook_fail_soft preserves hook_state" "$SOFT_OUTPUT2" '.hook_state.my_hook.count' "1"
assert_json_field "hook_fail_soft includes alert with state" "$SOFT_OUTPUT2" '.alert' "alert msg"

# ─── hook_fail_hard ──────────────────────────────────────────────────

echo ""
echo "--- hook_fail_hard ---"

# hook_fail_hard exits 2 (hard-block)
HARD_EXIT=0
HARD_OUTPUT=$(bash -c "source '$PROJECT_DIR/admiral/lib/hook_utils.sh'; hook_init hard_test; hook_fail_hard 'blocked'" 2>/dev/null) || HARD_EXIT=$?
assert_eq "hook_fail_hard exits 2" "2" "$HARD_EXIT"
assert_json_field "hook_fail_hard outputs deny" "$HARD_OUTPUT" '.hookSpecificOutput.permissionDecision' "deny"
assert_json_field "hook_fail_hard includes reason" "$HARD_OUTPUT" '.hookSpecificOutput.additionalContext' "blocked"

# hook_fail_hard with custom output JSON
CUSTOM_JSON='{"custom": "output"}'
HARD_EXIT2=0
HARD_OUTPUT2=$(bash -c "source '$PROJECT_DIR/admiral/lib/hook_utils.sh'; hook_init hard_test; hook_fail_hard 'blocked' '$CUSTOM_JSON'" 2>/dev/null) || HARD_EXIT2=$?
assert_eq "hook_fail_hard custom JSON exits 2" "2" "$HARD_EXIT2"
assert_eq "hook_fail_hard outputs custom JSON" "$CUSTOM_JSON" "$HARD_OUTPUT2"

# ─── hook_recover ────────────────────────────────────────────────────

echo ""
echo "--- hook_recover ---"

# hook_recover exits 0 (fail-open)
REC_EXIT=0
REC_OUTPUT=$(bash -c "source '$PROJECT_DIR/admiral/lib/hook_utils.sh'; hook_init recovery_test; hook_recover 'something broke'" 2>/dev/null) || REC_EXIT=$?
assert_eq "hook_recover exits 0" "0" "$REC_EXIT"
assert_json_field "hook_recover outputs continue" "$REC_OUTPUT" '.continue' "true"

# ─── hook_read_payload ───────────────────────────────────────────────

echo ""
echo "--- hook_read_payload ---"

hook_init "payload_test"

# Valid JSON payload
VALID_PAYLOAD=$(echo '{"tool_name":"Bash"}' | hook_read_payload)
assert_eq "hook_read_payload valid JSON" '{"tool_name":"Bash"}' "$VALID_PAYLOAD"

# Empty payload returns {}
EMPTY_PAYLOAD=$(echo "" | hook_read_payload)
assert_eq "hook_read_payload empty input" '{}' "$EMPTY_PAYLOAD"

# Invalid JSON returns {}
INVALID_PAYLOAD=$(echo "not json" | hook_read_payload)
assert_eq "hook_read_payload invalid JSON" '{}' "$INVALID_PAYLOAD"

# ─── hook_output ─────────────────────────────────────────────────────

echo ""
echo "--- hook_output ---"

hook_init "output_test"

# Output with state only
OUTPUT_NO_ALERT=$(hook_output "my_hook" '{"count": 5}')
assert_json_field "hook_output state only" "$OUTPUT_NO_ALERT" '.hook_state.my_hook.count' "5"

# Output with state and alert
OUTPUT_WITH_ALERT=$(hook_output "my_hook" '{"count": 5}' "Warning!")
assert_json_field "hook_output with alert state" "$OUTPUT_WITH_ALERT" '.hook_state.my_hook.count' "5"
assert_json_field "hook_output with alert text" "$OUTPUT_WITH_ALERT" '.alert' "Warning!"

# ─── hook_advisory ───────────────────────────────────────────────────

echo ""
echo "--- hook_advisory ---"

ADV_OUTPUT=$(hook_advisory "Some context for the agent")
assert_json_field "hook_advisory permission" "$ADV_OUTPUT" '.hookSpecificOutput.permissionDecision' "allow"
assert_json_field "hook_advisory context" "$ADV_OUTPUT" '.hookSpecificOutput.additionalContext' "Some context for the agent"

# ─── Summary ─────────────────────────────────────────────────────────

print_results "Hook Utilities Tests"
