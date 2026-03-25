#!/bin/bash
# shellcheck disable=SC1091,SC2012,SC2034,SC2317
# test_hook_contracts.sh — Validates that all hooks produce well-formed JSON output
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HOOKS_DIR="$PROJECT_ROOT/.hooks"

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

assert_json_valid() {
  local desc="$1" output="$2"
  if echo "$output" | tr -d '\r' | jq empty 2>/dev/null; then
    echo "  PASS: $desc"
    pass=$((pass + 1))
  else
    echo "  FAIL: $desc (invalid JSON)"
    fail=$((fail + 1))
  fi
}

echo "Testing Hook Output Contracts"
echo "=============================="
echo ""

# Test 1: Contract document exists
echo "1. Contract documentation"
assert_eq "hook-contracts.md exists" "true" \
  "$([ -f "$PROJECT_ROOT/admiral/docs/hook-contracts.md" ] && echo true || echo false)"
assert_eq "hook-output schema exists" "true" \
  "$([ -f "$PROJECT_ROOT/admiral/schemas/hook-output.v1.schema.json" ] && echo true || echo false)"

# Test 2: All hooks are executable
echo ""
echo "2. Hook executability"
for hook in "$HOOKS_DIR"/*.sh; do
  name=$(basename "$hook")
  assert_eq "$name is executable" "true" "$([ -x "$hook" ] && echo true || echo false)"
done

# Test 3: Session start adapter produces valid JSON output
echo ""
echo "3. SessionStart adapter output"
# Initialize state directory
mkdir -p "$PROJECT_ROOT/.admiral"
output=$(echo '{"session_id":"contract-test","model":"test-model"}' | bash "$HOOKS_DIR/session_start_adapter.sh" 2>/dev/null || true)
assert_json_valid "session_start_adapter produces valid JSON" "$output"
has_continue=$(echo "$output" | tr -d '\r' | jq 'has("continue")' 2>/dev/null || echo "false")
assert_eq "session_start has 'continue' field" "true" "$has_continue"

# Test 4: PreToolUse adapter produces valid JSON output
echo ""
echo "4. PreToolUse adapter output"
# Ensure session state exists
echo '{"session_id":"contract-test","tool_uses":5,"hook_state":{}}' > "$PROJECT_ROOT/.admiral/session_state.json" 2>/dev/null || true
output=$(echo '{"tool_name":"Read","tool_input":{"file_path":"README.md"}}' | bash "$HOOKS_DIR/pre_tool_use_adapter.sh" 2>/dev/null || true)
assert_json_valid "pre_tool_use_adapter produces valid JSON" "$output"

# Test 5: PostToolUse adapter produces valid JSON output
echo ""
echo "5. PostToolUse adapter output"
output=$(echo '{"tool_name":"Read","tool_input":{"file_path":"README.md"},"tool_response":"file contents"}' | bash "$HOOKS_DIR/post_tool_use_adapter.sh" 2>/dev/null || true)
assert_json_valid "post_tool_use_adapter produces valid JSON" "$output"

# Test 6: Identity validation output contract
echo ""
echo "6. Identity validation output"
output=$(echo '{"agent_id":"orchestrator","session_id":"test"}' | bash "$HOOKS_DIR/identity_validation.sh" 2>/dev/null || true)
assert_json_valid "identity_validation produces valid JSON" "$output"
has_validated=$(echo "$output" | tr -d '\r' | jq 'has("validated")' 2>/dev/null || echo "false")
assert_eq "identity output has 'validated'" "true" "$has_validated"
has_severity=$(echo "$output" | tr -d '\r' | jq 'has("severity")' 2>/dev/null || echo "false")
assert_eq "identity output has 'severity'" "true" "$has_severity"

# Test 7: Tier validation output contract
echo ""
echo "7. Tier validation output"
output=$(echo '{"agent_id":"orchestrator","model":"claude-opus-4","session_id":"test"}' | bash "$HOOKS_DIR/tier_validation.sh" 2>/dev/null || true)
assert_json_valid "tier_validation produces valid JSON" "$output"
has_validated=$(echo "$output" | tr -d '\r' | jq 'has("validated")' 2>/dev/null || echo "false")
assert_eq "tier output has 'validated'" "true" "$has_validated"

# Test 8: Scope boundary guard output contract
echo ""
echo "8. Scope boundary guard output"
output=$(echo '{"tool_name":"Write","tool_input":{"file_path":"README.md","content":"test"}}' | bash "$HOOKS_DIR/scope_boundary_guard.sh" 2>/dev/null || true)
assert_json_valid "scope_boundary_guard produces valid JSON" "$output"

# Test 9: Prohibitions enforcer output contract
echo ""
echo "9. Prohibitions enforcer output"
output=$(echo '{"tool_name":"Bash","tool_input":{"command":"echo hello"}}' | bash "$HOOKS_DIR/prohibitions_enforcer.sh" 2>/dev/null || true)
assert_json_valid "prohibitions_enforcer produces valid JSON" "$output"

# Test 10: Pre-work validator output contract
echo ""
echo "10. Pre-work validator output"
echo '{"session_id":"test","tool_uses":5,"hook_state":{"pre_work_validator":{"validated":false}}}' > "$PROJECT_ROOT/.admiral/session_state.json" 2>/dev/null || true
output=$(echo '{"tool_name":"Write","tool_input":{"file_path":"test.txt"}}' | bash "$HOOKS_DIR/pre_work_validator.sh" 2>/dev/null || true)
assert_json_valid "pre_work_validator produces valid JSON" "$output"

# Test 11: Hook contract docs cover all hooks
echo ""
echo "11. Contract completeness"
hook_count=$(ls "$HOOKS_DIR"/*.sh 2>/dev/null | wc -l | tr -d ' ')
contract_doc="$PROJECT_ROOT/admiral/docs/hook-contracts.md"
documented=0
for hook in "$HOOKS_DIR"/*.sh; do
  name=$(basename "$hook" .sh)
  if grep -q "$name" "$contract_doc" 2>/dev/null; then
    documented=$((documented + 1))
  fi
done
assert_eq "All hooks documented in contracts" "$hook_count" "$documented"

# Cleanup
rm -f "$PROJECT_ROOT/.admiral/session_state.json" 2>/dev/null || true

echo ""
echo "=============================="
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
exit 0
