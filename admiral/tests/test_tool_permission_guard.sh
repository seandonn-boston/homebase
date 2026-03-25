#!/bin/bash
# test_tool_permission_guard.sh — Tests for S-08 tool permission matrix
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HOOK="$PROJECT_ROOT/.hooks/tool_permission_guard.sh"
STATE_DIR="$PROJECT_ROOT/.admiral"
STATE_FILE="$STATE_DIR/session_state.json"

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

setup_state() {
  local agent_id="$1"
  mkdir -p "$STATE_DIR"
  jq -n --arg aid "$agent_id" '{session_id: "perm-test", agent_id: $aid, tool_uses: 1, hook_state: {}}' > "$STATE_FILE"
}

cleanup() {
  rm -f "$STATE_FILE" 2>/dev/null || true
}

run_hook() {
  local payload="$1"
  local exit_code=0
  local output
  output=$(echo "$payload" | bash "$HOOK" 2>/dev/null) || exit_code=$?
  echo "$output"
  return "$exit_code"
}

echo "Testing tool_permission_guard.sh (S-08)"
echo "========================================"
echo ""

# Test 1: No agent_id — single agent mode
echo "1. No agent_id (single-agent passthrough)"
setup_state ""
result=$(run_hook '{"tool_name":"Bash"}')
assert_json_field "Allowed" "$result" '.allowed' "true"
assert_json_field "Reason" "$result" '.reason' "single_agent_mode"

# Test 2: Orchestrator using allowed tool (Read)
echo ""
echo "2. Orchestrator using allowed tool"
setup_state "orchestrator"
result=$(run_hook '{"tool_name":"Read"}')
assert_json_field "Allowed" "$result" '.allowed' "true"
assert_json_field "Reason" "$result" '.reason' "tool_permitted"

# Test 3: Orchestrator using denied tool (Write)
echo ""
echo "3. Orchestrator using denied tool (Write)"
setup_state "orchestrator"
exit_code=0
result=$(run_hook '{"tool_name":"Write"}') || exit_code=$?
assert_eq "Exit code 2 (blocked)" "2" "$exit_code"
assert_json_field "Not allowed" "$result" '.allowed' "false"
assert_json_field "Reason" "$result" '.reason' "tool_denied"

# Test 4: Backend implementer using allowed tool (Bash)
echo ""
echo "4. Backend implementer using allowed tool"
setup_state "backend-implementer"
result=$(run_hook '{"tool_name":"Bash"}')
assert_json_field "Allowed" "$result" '.allowed' "true"
assert_json_field "Reason" "$result" '.reason' "tool_permitted"

# Test 5: QA agent using denied tool (Write)
echo ""
echo "5. QA agent using denied tool"
setup_state "qa-agent"
exit_code=0
result=$(run_hook '{"tool_name":"Write"}') || exit_code=$?
assert_eq "Exit code 2 (blocked)" "2" "$exit_code"
assert_json_field "Not allowed" "$result" '.allowed' "false"
assert_json_field "QA role identified" "$result" '.role' "qa"

# Test 6: Security auditor using denied tool (Edit)
echo ""
echo "6. Security auditor denied Edit"
setup_state "security-auditor"
exit_code=0
result=$(run_hook '{"tool_name":"Edit"}') || exit_code=$?
assert_eq "Exit code 2 (blocked)" "2" "$exit_code"
assert_json_field "Not allowed" "$result" '.allowed' "false"

# Test 7: Unregistered agent — advisory, not blocked
echo ""
echo "7. Unregistered agent passthrough"
setup_state "phantom-agent"
result=$(run_hook '{"tool_name":"Bash"}')
assert_json_field "Allowed" "$result" '.allowed' "true"
assert_json_field "Reason" "$result" '.reason' "unregistered_agent"
assert_json_field "Warning" "$result" '.severity' "warning"

# Test 8: Triage agent using denied tool (Bash)
echo ""
echo "8. Triage agent denied Bash"
setup_state "triage-agent"
exit_code=0
result=$(run_hook '{"tool_name":"Bash"}') || exit_code=$?
assert_eq "Exit code 2 (blocked)" "2" "$exit_code"

# Test 9: Triage agent using allowed tool (Read)
echo ""
echo "9. Triage agent allowed Read"
setup_state "triage-agent"
result=$(run_hook '{"tool_name":"Read"}')
assert_json_field "Allowed" "$result" '.allowed' "true"

# Test 10: Output is always valid JSON
echo ""
echo "10. Output validity"
setup_state "orchestrator"
result=$(run_hook '{"tool_name":"Read"}')
json_valid=$(echo "$result" | tr -d '\r' | jq empty 2>/dev/null && echo true || echo false)
assert_eq "Output is valid JSON" "true" "$json_valid"

# Test 11: Tool not in allowlist but not denied — warning
echo ""
echo "11. Tool not in allowlist (warning only)"
setup_state "orchestrator"
result=$(run_hook '{"tool_name":"WebFetch"}')
# WebFetch is not in orchestrator's allowed or denied list — should warn
assert_json_field "Allowed" "$result" '.allowed' "true"

cleanup

echo ""
echo "========================================"
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
exit 0
