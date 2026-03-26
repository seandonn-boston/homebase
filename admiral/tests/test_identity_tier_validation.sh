#!/bin/bash
# test_identity_tier_validation.sh — Tests for S-01 (identity) and S-02 (tier) validation hooks
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

IDENTITY_HOOK="$PROJECT_ROOT/.hooks/identity_validation.sh"
TIER_HOOK="$PROJECT_ROOT/.hooks/tier_validation.sh"

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

run_hook() {
  local hook="$1" payload="$2"
  local exit_code=0
  local output
  output=$(echo "$payload" | bash "$hook" 2>/dev/null) || exit_code=$?
  echo "$output"
  return "$exit_code"
}

echo "Testing identity_validation.sh (S-01)"
echo "======================================"
echo ""

# Test 1: No agent_id in payload
echo "1. No agent_id (single-agent session)"
result=$(run_hook "$IDENTITY_HOOK" '{"session_id":"test-1"}')
assert_json_field "Returns info severity" "$result" '.severity' "info"
assert_json_field "Reason is no_agent_id" "$result" '.reason' "no_agent_id"

# Test 2: Known agent (orchestrator)
echo ""
echo "2. Known agent identity"
result=$(run_hook "$IDENTITY_HOOK" '{"agent_id":"orchestrator","session_id":"test-2"}')
assert_json_field "Validated true" "$result" '.validated' "true"
assert_json_field "Correct role" "$result" '.role' "orchestrator"
assert_json_field "Has model tier" "$result" '.model_tier' "tier1_flagship"

# Test 3: Unregistered agent
echo ""
echo "3. Unregistered agent"
result=$(run_hook "$IDENTITY_HOOK" '{"agent_id":"unknown-agent-xyz","session_id":"test-3"}')
assert_json_field "Not validated" "$result" '.validated' "false"
assert_json_field "Reason is unregistered" "$result" '.reason' "unregistered_agent"
assert_json_field "Warning severity" "$result" '.severity' "warning"

# Test 4: Different registered agents
echo ""
echo "4. Backend implementer identity"
result=$(run_hook "$IDENTITY_HOOK" '{"agent_id":"backend-implementer","session_id":"test-4"}')
assert_json_field "Validated true" "$result" '.validated' "true"
assert_json_field "Correct role" "$result" '.role' "implementer"

# Test 5: Agent name fallback
echo ""
echo "5. Agent name fallback (no agent_id, has agent_name)"
result=$(run_hook "$IDENTITY_HOOK" '{"agent_name":"qa-agent","session_id":"test-5"}')
assert_json_field "QA agent validated" "$result" '.validated' "true"
assert_json_field "QA role" "$result" '.role' "qa"

echo ""
echo ""
echo "Testing tier_validation.sh (S-02)"
echo "=================================="
echo ""

# Test 6: No agent_id
echo "6. No agent_id — skip tier validation"
result=$(run_hook "$TIER_HOOK" '{"session_id":"test-6"}')
assert_json_field "Reason no_agent_id" "$result" '.reason' "no_agent_id"

# Test 7: Exact tier match (orchestrator with opus model)
echo ""
echo "7. Exact tier match"
result=$(run_hook "$TIER_HOOK" '{"agent_id":"orchestrator","model":"claude-opus-4","session_id":"test-7"}')
assert_json_field "Validated true" "$result" '.validated' "true"
assert_json_field "Tier matches" "$result" '.tier' "tier1_flagship"

# Test 8: Downgraded non-critical role (backend-implementer on haiku)
echo ""
echo "8. Downgraded non-critical role"
result=$(run_hook "$TIER_HOOK" '{"agent_id":"backend-implementer","model":"claude-haiku-4","session_id":"test-8"}')
assert_json_field "Validated but downgraded" "$result" '.validated' "true"
assert_json_field "Downgrade flagged" "$result" '.downgraded' "true"
assert_json_field "Warning severity" "$result" '.severity' "warning"

# Test 9: Critical mismatch — security auditor on utility tier (hard-block)
echo ""
echo "9. Critical mismatch — security on utility tier"
exit_code=0
result=$(run_hook "$TIER_HOOK" '{"agent_id":"security-auditor","model":"claude-haiku-4","session_id":"test-9"}') || exit_code=$?
assert_eq "Exit code 2 (hard-block)" "2" "$exit_code"
assert_json_field "Blocked true" "$result" '.blocked' "true"
assert_json_field "Error severity" "$result" '.severity' "error"

# Test 10: Upgraded tier (triage on flagship model)
echo ""
echo "10. Upgraded tier"
result=$(run_hook "$TIER_HOOK" '{"agent_id":"triage-agent","model":"claude-opus-4","session_id":"test-10"}')
assert_json_field "Validated true" "$result" '.validated' "true"
assert_json_field "Upgraded flagged" "$result" '.upgraded' "true"

# Test 11: Unknown model name
echo ""
echo "11. Unknown model name"
result=$(run_hook "$TIER_HOOK" '{"agent_id":"orchestrator","model":"custom-model-v1","session_id":"test-11"}')
assert_json_field "Not validated" "$result" '.validated' "false"
assert_json_field "Reason unknown tier" "$result" '.reason' "unknown_model_tier"

# Test 12: No model in payload
echo ""
echo "12. No model info"
result=$(run_hook "$TIER_HOOK" '{"agent_id":"orchestrator","session_id":"test-12"}')
assert_json_field "Reason no_model_info" "$result" '.reason' "no_model_info"

# Test 13: Unregistered agent in tier validation
echo ""
echo "13. Unregistered agent in tier validation"
result=$(run_hook "$TIER_HOOK" '{"agent_id":"phantom-agent","model":"opus","session_id":"test-13"}')
assert_json_field "Reason unregistered" "$result" '.reason' "unregistered_agent"

# Test 14: Orchestrator on economy tier (critical block)
echo ""
echo "14. Orchestrator on economy tier"
exit_code=0
result=$(run_hook "$TIER_HOOK" '{"agent_id":"orchestrator","model":"some-mini-model","session_id":"test-14"}') || exit_code=$?
assert_eq "Exit code 2 (hard-block)" "2" "$exit_code"
assert_json_field "Blocked true" "$result" '.blocked' "true"

echo ""
echo "======================================"
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
exit 0
