#!/bin/bash
# Admiral Framework — Tests for shared libraries (Q-01, Q-02)
# Tests jq_helpers.sh and hook_utils.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_DIR="$(cd "$HOOKS_DIR/.." && pwd)"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

PASS=0
FAIL=0
ERRORS=""

assert_eq() {
  local test_name="$1"
  local actual="$2"
  local expected="$3"
  if [ "$actual" = "$expected" ]; then
    PASS=$((PASS + 1))
    echo "  PASS: $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  FAIL: $test_name — expected '$expected', got '$actual'\n"
    echo "  FAIL: $test_name"
    echo "    expected: $expected"
    echo "    actual:   $actual"
  fi
}

assert_contains() {
  local test_name="$1"
  local output="$2"
  local expected="$3"
  if echo "$output" | grep -q "$expected"; then
    PASS=$((PASS + 1))
    echo "  PASS: $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  FAIL: $test_name — expected '$expected' in output\n"
    echo "  FAIL: $test_name"
  fi
}

echo "========================================"
echo " Shared Library Tests (Q-01, Q-02)"
echo "========================================"
echo ""

# ============================================================
# Test jq_helpers.sh
# ============================================================
echo "--- jq_helpers.sh (Q-01) ---"
source "$PROJECT_DIR/admiral/lib/jq_helpers.sh"

# jq_get_field
SAMPLE='{"tool_name":"Bash","tool_input":{"command":"ls"},"nested":{"deep":"value"}}'
assert_eq "jq_get_field extracts top-level field" "$(jq_get_field "$SAMPLE" '.tool_name')" "Bash"
assert_eq "jq_get_field extracts nested field" "$(jq_get_field "$SAMPLE" '.nested.deep')" "value"
assert_eq "jq_get_field returns default for missing field" "$(jq_get_field "$SAMPLE" '.missing' 'fallback')" "fallback"
assert_eq "jq_get_field returns empty default when not specified" "$(jq_get_field "$SAMPLE" '.missing')" ""
assert_eq "jq_get_field handles null field" "$(jq_get_field '{"x":null}' '.x' 'def')" "def"

# jq_set_field
UPDATED=$(jq_set_field '{"a":1}' '.b' '2')
assert_eq "jq_set_field adds new field" "$(echo "$UPDATED" | jq -r '.b')" "2"
UPDATED=$(jq_set_field '{"a":1}' '.a' '99')
assert_eq "jq_set_field overwrites existing field" "$(echo "$UPDATED" | jq -r '.a')" "99"
UPDATED=$(jq_set_field '{"a":1}' '.s' '"hello"')
assert_eq "jq_set_field sets string value" "$(echo "$UPDATED" | jq -r '.s')" "hello"

# jq_array_append
UPDATED=$(jq_array_append '{"items":["a"]}' '.items' '"b"')
assert_eq "jq_array_append adds to array" "$(echo "$UPDATED" | jq -r '.items | length')" "2"
assert_eq "jq_array_append preserves existing" "$(echo "$UPDATED" | jq -r '.items[0]')" "a"
assert_eq "jq_array_append adds new item" "$(echo "$UPDATED" | jq -r '.items[1]')" "b"

# jq_validate
if jq_validate '{"valid":true}'; then
  PASS=$((PASS + 1)); echo "  PASS: jq_validate accepts valid JSON"
else
  FAIL=$((FAIL + 1)); echo "  FAIL: jq_validate should accept valid JSON"
fi

if ! jq_validate 'not json'; then
  PASS=$((PASS + 1)); echo "  PASS: jq_validate rejects invalid JSON"
else
  FAIL=$((FAIL + 1)); echo "  FAIL: jq_validate should reject invalid JSON"
fi

# jq_tool_name
assert_eq "jq_tool_name extracts tool_name" "$(jq_tool_name '{"tool_name":"Edit"}')" "Edit"
assert_eq "jq_tool_name defaults to unknown" "$(jq_tool_name '{}')" "unknown"

# jq_file_path
assert_eq "jq_file_path extracts file_path" "$(jq_file_path '{"tool_input":{"file_path":"/tmp/f.txt"}}')" "/tmp/f.txt"
assert_eq "jq_file_path returns empty for missing" "$(jq_file_path '{}')" ""

# jq_command
assert_eq "jq_command extracts command" "$(jq_command '{"tool_input":{"command":"ls -la"}}')" "ls -la"

# jq_project_dir
assert_eq "jq_project_dir extracts from payload" "$(jq_project_dir '{"session_state":{"project_dir":"/my/proj"}}')" "/my/proj"
assert_eq "jq_project_dir falls back to env" "$(jq_project_dir '{}')" "$CLAUDE_PROJECT_DIR"

echo ""

# ============================================================
# Test hook_utils.sh
# ============================================================
echo "--- hook_utils.sh (Q-02) ---"

# hook_log — verify it writes to log file
source "$PROJECT_DIR/admiral/lib/hook_utils.sh"
hook_log "test_hook" "Test message for logging"
if grep -q "test_hook.*Test message" "$PROJECT_DIR/.admiral/hook_errors.log" 2>/dev/null; then
  PASS=$((PASS + 1)); echo "  PASS: hook_log writes to hook_errors.log"
else
  FAIL=$((FAIL + 1)); echo "  FAIL: hook_log should write to hook_errors.log"
fi

# hook_alert — verify JSON structure
ALERT_OUT=$(hook_alert "Test alert" '{"zero_trust": {"count": 1}}')
assert_contains "hook_alert includes alert text" "$ALERT_OUT" "Test alert"
assert_contains "hook_alert includes hook_state" "$ALERT_OUT" "zero_trust"
if echo "$ALERT_OUT" | jq empty 2>/dev/null; then
  PASS=$((PASS + 1)); echo "  PASS: hook_alert produces valid JSON"
else
  FAIL=$((FAIL + 1)); echo "  FAIL: hook_alert should produce valid JSON"
fi

# hook_state_only — verify JSON structure
STATE_OUT=$(hook_state_only '{"compliance": {"flags": 0}}')
assert_contains "hook_state_only includes hook_state" "$STATE_OUT" "compliance"
if echo "$STATE_OUT" | jq empty 2>/dev/null; then
  PASS=$((PASS + 1)); echo "  PASS: hook_state_only produces valid JSON"
else
  FAIL=$((FAIL + 1)); echo "  FAIL: hook_state_only should produce valid JSON"
fi

# hook_pass — verify in subshell (it calls exit)
PASS_OUT=$(source "$PROJECT_DIR/admiral/lib/hook_utils.sh"; hook_pass) || true
assert_contains "hook_pass includes continue:true" "$PASS_OUT" "continue"

PASS_WITH_STATE=$(source "$PROJECT_DIR/admiral/lib/hook_utils.sh"; hook_pass '{"x": 1}') || true
assert_contains "hook_pass with state includes hook_state" "$PASS_WITH_STATE" "hook_state"

# hook_fail_soft — verify in subshell
SOFT_OUT=$(source "$PROJECT_DIR/admiral/lib/hook_utils.sh"; hook_fail_soft "Advisory warning") || true
assert_contains "hook_fail_soft includes systemMessage" "$SOFT_OUT" "Advisory warning"
assert_contains "hook_fail_soft includes continue:true" "$SOFT_OUT" "continue"

# hook_fail_hard — verify exit code and output in subshell
HARD_EXIT=0
HARD_OUT=$(source "$PROJECT_DIR/admiral/lib/hook_utils.sh"; hook_fail_hard "Blocked!") || HARD_EXIT=$?
assert_eq "hook_fail_hard exits 2" "$HARD_EXIT" "2"
assert_contains "hook_fail_hard includes deny decision" "$HARD_OUT" "deny"
assert_contains "hook_fail_hard includes reason" "$HARD_OUT" "Blocked!"

echo ""

# ============================================================
# Summary
# ============================================================
echo "========================================"
echo " Results: $PASS passed, $FAIL failed"
echo "========================================"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
fi

exit 0
